import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { analysisApi } from '@/api/client'
import { SankeyDiagram } from '@/components/SankeyDiagram'
import type { SankeyNodeSelected } from '@/components/SankeyDiagram'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { getInstitutionGroup } from '@/lib/institution-groups'
import {
  GitBranch, ArrowRight, Building2, Users, TrendingUp, DollarSign,
  X, AlertTriangle, Info, List, BarChart2, ChevronUp, ChevronDown,
  ShieldAlert, Download,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const YEARS = Array.from({ length: 24 }, (_, i) => 2025 - i)

// ── Data quality by year ────────────────────────────────────────────────────
function getYearQualityLabel(y: number): { icon: string; rfcPct: string } {
  if (y >= 2023) return { icon: '✓', rfcPct: '47% RFC coverage — best quality' }
  if (y >= 2018) return { icon: '◉', rfcPct: '30% RFC coverage — good quality' }
  if (y >= 2010) return { icon: '◐', rfcPct: '16% RFC coverage — partial quality' }
  return { icon: '⚠', rfcPct: '0.1% RFC coverage — lowest quality' }
}

function getYearWarning(y: number | undefined): string | null {
  if (!y) return null
  if (y < 2010) return `Data quality for ${y} is lowest (Structure A, 0.1% RFC coverage). Vendor identity matching is unreliable — the same company may appear as multiple separate nodes. Risk scores may be underestimated. Treat all findings as directional only.`
  if (y < 2018) return `Note: ${y} data has ~16% RFC coverage (Structure B). Some vendors appear under multiple name variants, so true vendor concentration may be higher than shown.`
  return null
}

// ── Institution acronym lookup ─────────────────────────────────────────────
const ACRONYM_MAP: [string, string][] = [
  ['INSTITUTO MEXICANO DEL SEGURO SOCIAL', 'IMSS'],
  ['IMSS-BIENESTAR', 'IMSS-B'],
  ['INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES', 'ISSSTE'],
  ['PETROLEOS MEXICANOS', 'PEMEX'],
  ['PETRÓLEOS MEXICANOS', 'PEMEX'],
  ['PEMEX EXPLORACION', 'PEMEX E&P'],
  ['PEMEX EXPLORACIÓN', 'PEMEX E&P'],
  ['PEMEX TRANSFORMACION', 'PEMEX TRI'],
  ['PEMEX LOGISTICA', 'PEMEX LOG'],
  ['PEMEX LOGÍSTICA', 'PEMEX LOG'],
  ['COMISION FEDERAL DE ELECTRICIDAD', 'CFE'],
  ['COMISIÓN FEDERAL DE ELECTRICIDAD', 'CFE'],
  ['SECRETARIA DE EDUCACION PUBLICA', 'SEP'],
  ['SECRETARÍA DE EDUCACIÓN PÚBLICA', 'SEP'],
  ['SECRETARIA DE HACIENDA Y CREDITO', 'SHCP'],
  ['SECRETARÍA DE HACIENDA Y CRÉDITO', 'SHCP'],
  ['SECRETARIA DE LA DEFENSA NACIONAL', 'SEDENA'],
  ['SECRETARÍA DE LA DEFENSA NACIONAL', 'SEDENA'],
  ['SECRETARIA DE MARINA', 'SEMAR'],
  ['SECRETARÍA DE MARINA', 'SEMAR'],
  ['SECRETARIA DE SALUD', 'SSA'],
  ['SECRETARÍA DE SALUD', 'SSA'],
  ['SECRETARIA DE COMUNICACIONES Y TRANSPORTES', 'SCT'],
  ['SECRETARÍA DE COMUNICACIONES Y TRANSPORTES', 'SCT'],
  ['SECRETARIA DE COMUNICACIONES', 'SCT'],
  ['SECRETARÍA DE COMUNICACIONES', 'SCT'],
  ['SECRETARIA DE GOBERNACION', 'SEGOB'],
  ['SECRETARÍA DE GOBERNACIÓN', 'SEGOB'],
  ['SECRETARIA DE ENERGIA', 'SENER'],
  ['SECRETARÍA DE ENERGÍA', 'SENER'],
  ['SECRETARIA DEL TRABAJO', 'STPS'],
  ['SECRETARÍA DEL TRABAJO', 'STPS'],
  ['SECRETARIA DE RELACIONES EXTERIORES', 'SRE'],
  ['SECRETARÍA DE RELACIONES EXTERIORES', 'SRE'],
  ['SECRETARIA DE MEDIO AMBIENTE', 'SEMARNAT'],
  ['SECRETARÍA DE MEDIO AMBIENTE', 'SEMARNAT'],
  ['COMISION NACIONAL DEL AGUA', 'CONAGUA'],
  ['COMISIÓN NACIONAL DEL AGUA', 'CONAGUA'],
  ['INSTITUTO POLITECNICO NACIONAL', 'IPN'],
  ['INSTITUTO POLITÉCNICO NACIONAL', 'IPN'],
  ['UNIVERSIDAD NACIONAL AUTONOMA', 'UNAM'],
  ['UNIVERSIDAD NACIONAL AUTÓNOMA', 'UNAM'],
  ['SERVICIO DE ADMINISTRACION TRIBUTARIA', 'SAT'],
  ['SERVICIO DE ADMINISTRACIÓN TRIBUTARIA', 'SAT'],
  ['SECRETARIA DE LA FUNCION PUBLICA', 'SFP'],
  ['SECRETARÍA DE LA FUNCIÓN PÚBLICA', 'SFP'],
  ['GUARDIA NACIONAL', 'GN'],
  ['FISCALIA GENERAL', 'FGR'],
  ['FISCALÍA GENERAL', 'FGR'],
  ['PROCURADURIA GENERAL', 'PGR'],
  ['PROCURADURÍA GENERAL', 'PGR'],
  ['INSTITUTO NACIONAL DE ESTADISTICA', 'INEGI'],
  ['INSTITUTO NACIONAL DE ESTADÍSTICA', 'INEGI'],
  ['CONSEJO NACIONAL DE CIENCIA', 'CONAHCYT'],
  ['FONDO NACIONAL DE FOMENTO', 'FONATUR'],
  ['BANCO NACIONAL DE OBRAS', 'BANOBRAS'],
  ['NACIONAL FINANCIERA', 'NAFINSA'],
  ['CAMARA DE DIPUTADOS', 'Cámara Dip.'],
  ['CÁMARA DE DIPUTADOS', 'Cámara Dip.'],
  ['CAMARA DE SENADORES', 'Senado'],
  ['CÁMARA DE SENADORES', 'Senado'],
  ['INSTITUTO NACIONAL ELECTORAL', 'INE'],
  ['INSTITUTO FEDERAL ELECTORAL', 'IFE'],
  ['SECRETARIA DE AGRICULTURA', 'SADER'],
  ['SECRETARÍA DE AGRICULTURA', 'SADER'],
  ['SECRETARIA DE BIENESTAR', 'Bienestar'],
  ['SECRETARÍA DE BIENESTAR', 'Bienestar'],
  ['SECRETARIA DE SEGURIDAD', 'SSPC'],
  ['SECRETARÍA DE SEGURIDAD', 'SSPC'],
  ['SECRETARIA DE INFRAESTRUCTURA', 'SICT'],
  ['SECRETARÍA DE INFRAESTRUCTURA', 'SICT'],
  ['INSTITUTO NACIONAL DE SALUD', 'INSABI'],
  ['COMISION NACIONAL', 'CN'],
  ['COMISIÓN NACIONAL', 'CN'],
]

function getShortName(name: string): string {
  const upper = name.toUpperCase()
  for (const [key, acronym] of ACRONYM_MAP) {
    if (upper.includes(key.toUpperCase())) return acronym
  }
  if (name.length <= 14) return name
  const first = name.split(' ')[0]
  if (first === first.toUpperCase() && first.length >= 2 && first.length <= 8) return first
  return name
}

type ViewMode = 'diagram' | 'table'
type SortKey = 'value' | 'contracts' | 'avgRisk' | 'concentration'
type SortDir = 'desc' | 'asc'

const RISK_LEVELS = [
  { key: 'critical', color: '#f87171', badge: 'CRIT' },
  { key: 'high',     color: '#fb923c', badge: 'HIGH' },
  { key: 'medium',   color: '#fbbf24', badge: 'MED'  },
  { key: 'low',      color: '#4ade80', badge: 'LOW'  },
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

function getRiskBadge(avgRisk: number): { color: string; badge: string } {
  if (avgRisk >= 0.5) return { color: '#f87171', badge: 'CRIT' }
  if (avgRisk >= 0.3) return { color: '#fb923c', badge: 'HIGH' }
  if (avgRisk >= 0.1) return { color: '#fbbf24', badge: 'MED'  }
  return { color: '#4ade80', badge: 'LOW' }
}

// Skeleton placeholder that mimics Sankey shape
function SankeySkeleton() {
  return (
    <svg width="100%" height="320" className="opacity-10" aria-hidden="true">
      {[40, 100, 170, 230, 280].map((y, i) => (
        <rect key={`l${i}`} x={20} y={y} width={14} height={40 + i * 6} rx={2} fill="#64748b" />
      ))}
      {[20, 80, 140, 200, 260, 300].map((y, i) => (
        <rect key={`r${i}`} x={560} y={y} width={14} height={30 + i * 4} rx={2} fill="#64748b" />
      ))}
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
  const [searchParams, setSearchParams] = useSearchParams()

  // ── URL-persistent filter state ────────────────────────────────────────────
  const sectorId = searchParams.get('sector') ? Number(searchParams.get('sector')) : undefined
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : 2024
  const directAwardOnly = searchParams.get('da') === '1'
  const flowLimit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
  const apiSortBy = searchParams.get('api_sort') ?? 'value'
  const riskFilter = searchParams.get('risk')
    ? searchParams.get('risk')!.split(',').filter(Boolean)
    : ['critical', 'high', 'medium', 'low']

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams)
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  // ── Local UI state (not URL-persistent) ───────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<SankeyNodeSelected | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('diagram')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [groupByInstitution, setGroupByInstitution] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [diagramWidth, setDiagramWidth] = useState(860)

  // Auto-switch to table on narrow screens
  useEffect(() => {
    if (diagramWidth < 640) setViewMode('table')
  }, [diagramWidth])

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
    queryKey: ['money-flow', sectorId, year, directAwardOnly, apiSortBy],
    queryFn: () => analysisApi.getMoneyFlow(year, sectorId, directAwardOnly, apiSortBy),
    staleTime: 10 * 60 * 1000,
  })

  const handleRiskToggle = (level: string) => {
    const next = riskFilter.includes(level)
      ? riskFilter.filter(l => l !== level)
      : [...riskFilter, level]
    setParam('risk', next.length === 4 ? undefined : next.join(','))
  }

  const handleFlowClick = useCallback((sourceId: string, targetId: string) => {
    const instId = sourceId.replace('inst-', '')
    const vendId = targetId.replace('vend-', '')
    const params = new URLSearchParams()
    if (instId) params.set('institution_id', instId)
    if (vendId) params.set('vendor_id', vendId)
    if (year) params.set('year', String(year))
    navigate(`/contracts?${params.toString()}`)
  }, [navigate, year])

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

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
      else setSortDir('desc')
      return key
    })
  }, [])

  const { nodes, links, fullNames } = useMemo(() => {
    if (!data?.flows?.length) return { nodes: [], links: [], fullNames: new Map<string, string>() }

    const instMap = new Map<string, { name: string; fullName: string; riskLevel: string; total: number; contracts: number }>()
    const vendMap = new Map<string, { name: string; fullName: string; riskLevel: string; total: number; contracts: number }>()

    for (const f of data.flows) {
      const iKey = `inst-${f.source_id}`
      const vKey = `vend-${f.target_id}`
      const riskLevel = f.avg_risk != null ? getRiskLabel(f.avg_risk) : 'medium'

      const prev = instMap.get(iKey)
      instMap.set(iKey, {
        name: getShortName(f.source_name),
        fullName: f.source_name,
        riskLevel: prev ? (prev.riskLevel === 'critical' ? 'critical' : riskLevel) : riskLevel,
        total: (prev?.total ?? 0) + f.value,
        contracts: (prev?.contracts ?? 0) + f.contracts,
      })

      const vprev = vendMap.get(vKey)
      vendMap.set(vKey, {
        name: f.target_name,
        fullName: f.target_name,
        riskLevel: vprev ? (vprev.riskLevel === 'critical' ? 'critical' : riskLevel) : riskLevel,
        total: (vprev?.total ?? 0) + f.value,
        contracts: (vprev?.contracts ?? 0) + f.contracts,
      })
    }

    const fullNames = new Map<string, string>()
    instMap.forEach((d, id) => fullNames.set(id, d.fullName))
    vendMap.forEach((d, id) => fullNames.set(id, d.fullName))

    let allNodes = [
      ...[...instMap.entries()].map(([id, d]) => ({
        id, type: 'institution' as const, name: d.name, riskLevel: d.riskLevel, value: d.total, contracts: d.contracts,
      })),
      ...[...vendMap.entries()].map(([id, d]) => ({
        id, type: 'vendor' as const, name: d.name, riskLevel: d.riskLevel, value: d.total, contracts: d.contracts,
      })),
    ].filter(n => riskFilter.includes(n.riskLevel))

    let nodeIds = new Set(allNodes.map(n => n.id))

    let sankeyLinks = data.flows
      .filter(f => nodeIds.has(`inst-${f.source_id}`) && nodeIds.has(`vend-${f.target_id}`))
      .map(f => ({
        source: `inst-${f.source_id}`,
        target: `vend-${f.target_id}`,
        value: f.value,
        contractCount: f.contracts,
        avgRisk: f.avg_risk ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, flowLimit)

    // Group institution nodes by parent organization when enabled
    if (groupByInstitution) {
      // Build reverse lookup: original inst node id → group key
      const instNodeToGroup = new Map<string, string>()
      const groupAgg = new Map<string, { name: string; riskLevel: string; value: number; contracts: number }>()

      allNodes.forEach((node) => {
        if (node.type !== 'institution') return
        const fullName = fullNames.get(node.id) ?? node.name
        const grp = getInstitutionGroup(fullName)
        if (!grp) return
        const key = `grp-${grp.id}`
        instNodeToGroup.set(node.id, key)
        const prev = groupAgg.get(key)
        const riskPriority = (r: string) => r === 'critical' ? 3 : r === 'high' ? 2 : r === 'medium' ? 1 : 0
        const merged = {
          name: grp.shortName,
          riskLevel: prev
            ? (riskPriority(prev.riskLevel) >= riskPriority(node.riskLevel) ? prev.riskLevel : node.riskLevel)
            : node.riskLevel,
          value: (prev?.value ?? 0) + node.value,
          contracts: (prev?.contracts ?? 0) + node.contracts,
        }
        groupAgg.set(key, merged)
        fullNames.set(key, grp.name)
      })

      // Rebuild nodes: replace grouped institutions with merged node
      const seenGroups = new Set<string>()
      const mergedNodes: typeof allNodes = []
      allNodes.forEach((node) => {
        if (node.type !== 'institution') { mergedNodes.push(node); return }
        const key = instNodeToGroup.get(node.id)
        if (key) {
          if (!seenGroups.has(key)) {
            seenGroups.add(key)
            const meta = groupAgg.get(key)!
            mergedNodes.push({ id: key, type: 'institution', name: meta.name, riskLevel: meta.riskLevel, value: meta.value, contracts: meta.contracts })
          }
        } else {
          mergedNodes.push(node)
        }
      })

      // Remap links
      const linkMap = new Map<string, typeof sankeyLinks[number]>()
      sankeyLinks.forEach((link) => {
        const src = instNodeToGroup.get(link.source) ?? link.source
        const mapKey = `${src}|${link.target}`
        const prev = linkMap.get(mapKey)
        if (prev) {
          const totalContracts = prev.contractCount + link.contractCount
          linkMap.set(mapKey, {
            ...prev,
            source: src,
            value: prev.value + link.value,
            contractCount: totalContracts,
            avgRisk: (prev.avgRisk * prev.contractCount + link.avgRisk * link.contractCount) / totalContracts,
          })
        } else {
          linkMap.set(mapKey, { ...link, source: src })
        }
      })

      allNodes = mergedNodes
      sankeyLinks = [...linkMap.values()]
      nodeIds = new Set(allNodes.map(n => n.id))
    }

    const usedIds = new Set(sankeyLinks.flatMap(l => [l.source, l.target]))
    const filteredNodes = allNodes.filter(n => usedIds.has(n.id))

    return { nodes: filteredNodes, links: sankeyLinks, fullNames }
  }, [data, riskFilter, flowLimit, groupByInstitution])

  const handleNodeSelect = useCallback((node: SankeyNodeSelected) => {
    const full = fullNames.get(node.id)
    const enriched = full ? { ...node, name: full } : node
    setSelectedNode(prev => prev?.id === node.id ? null : enriched)
  }, [fullNames])

  const totalValue = useMemo(() => (links ?? []).reduce((s, l) => s + l.value, 0), [links])
  const totalContracts = useMemo(() => (links ?? []).reduce((s, l) => s + l.contractCount, 0), [links])
  const uniqueInstitutions = useMemo(() => new Set(links.map(l => l.source)).size, [links])
  const uniqueVendors = useMemo(() => new Set(links.map(l => l.target)).size, [links])

  const highRiskValue = useMemo(
    () => links.filter(l => l.avgRisk >= 0.3).reduce((s, l) => s + l.value, 0),
    [links]
  )
  const highRiskPct = totalValue > 0 ? (highRiskValue / totalValue) * 100 : 0

  // Top-3 vendor concentration
  const top3VendorPct = useMemo(() => {
    if (!totalValue) return 0
    const vendorTotals = new Map<string, number>()
    links.forEach(l => vendorTotals.set(l.target, (vendorTotals.get(l.target) ?? 0) + l.value))
    const sorted = [...vendorTotals.values()].sort((a, b) => b - a)
    const top3 = sorted.slice(0, 3).reduce((s, v) => s + v, 0)
    return (top3 / totalValue) * 100
  }, [links, totalValue])

  // Table rows enriched with full names + concentration
  const tableRows = useMemo(() => {
    const instTotals = new Map<string, number>()
    links.forEach(l => instTotals.set(l.source, (instTotals.get(l.source) ?? 0) + l.value))

    const rows = links.map(l => {
      const srcNode = nodes.find(n => n.id === l.source)
      const tgtNode = nodes.find(n => n.id === l.target)
      const instTotal = instTotals.get(l.source) ?? 1
      return {
        ...l,
        sourceName: fullNames.get(l.source) ?? srcNode?.name ?? l.source,
        targetName: fullNames.get(l.target) ?? tgtNode?.name ?? l.target,
        sourceRisk: srcNode?.riskLevel ?? 'unknown',
        targetRisk: tgtNode?.riskLevel ?? 'unknown',
        concentration: l.value / instTotal,
      }
    })
    rows.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'value')         return dir * (a.value - b.value)
      if (sortKey === 'contracts')     return dir * (a.contractCount - b.contractCount)
      if (sortKey === 'concentration') return dir * (a.concentration - b.concentration)
      return dir * (a.avgRisk - b.avgRisk)
    })
    return rows
  }, [links, nodes, sortKey, sortDir, fullNames])

  const topSuspiciousFlows = useMemo(
    () =>
      [...links]
        .filter(l => l.avgRisk >= 0.3)
        .sort((a, b) => b.avgRisk - a.avgRisk || b.value - a.value)
        .slice(0, 5)
        .map(l => {
          const srcNode = nodes.find(n => n.id === l.source)
          const tgtNode = nodes.find(n => n.id === l.target)
          return {
            ...l,
            sourceName: fullNames.get(l.source) ?? srcNode?.name ?? l.source,
            targetName: fullNames.get(l.target) ?? tgtNode?.name ?? l.target,
          }
        }),
    [links, nodes, fullNames]
  )

  const exportCSV = useCallback(() => {
    const header = 'Institution,Vendor,Amount (MXN),Contracts,Avg Risk %,Risk Level,Concentration %'
    const rows = tableRows.map(r => {
      const { badge } = getRiskBadge(r.avgRisk)
      return [
        `"${r.sourceName.replace(/"/g, '""')}"`,
        `"${r.targetName.replace(/"/g, '""')}"`,
        r.value.toFixed(2),
        r.contractCount,
        (r.avgRisk * 100).toFixed(1),
        badge,
        (r.concentration * 100).toFixed(1),
      ].join(',')
    })
    const csv = '\uFEFF' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rubli-money-flow-${year ?? 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [tableRows, year])

  const showDiagram = !isLoading && nodes.length > 0 && links.length > 0
  const showEmpty = !isLoading && (!!error || !data?.flows?.length)
  const showNoRiskMatch = !isLoading && nodes.length === 0 && !!data?.flows?.length
  const yearWarning = getYearWarning(year)

  return (
    <div className="space-y-6 p-6">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg" style={{ background: 'var(--color-accent-glow)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-gradient text-2xl font-bold font-mono tracking-tight">{t('pageTitle')}</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('pageSubtitle')}</p>
          </div>
        </div>
        <p className="text-xs mt-2 max-w-2xl leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Explore how federal procurement funds flow from government institutions to vendors.
          Node size represents total contract value. Color represents average risk similarity score -- how closely
          procurement patterns resemble documented corruption cases (v6.0 model).
        </p>
      </div>

      {/* Summary Stats Bar */}
      {showDiagram && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card-elevated rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
              <span className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--color-text-muted)' }}>Total Flow</span>
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
              {formatCompactMXN(totalValue)}
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span className="text-xs text-red-400 uppercase tracking-wider font-mono">High-Risk Flow</span>
            </div>
            <div className="text-xl font-bold font-mono text-red-300">
              {formatCompactMXN(highRiskValue)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {highRiskPct.toFixed(0)}% of total
            </div>
          </div>
          <div className="card-elevated rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-data)' }} aria-hidden="true" />
              <span className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--color-text-muted)' }}>Contracts</span>
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
              {totalContracts.toLocaleString()}
            </div>
          </div>
          <div className="card-elevated rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-data)' }} aria-hidden="true" />
              <span className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--color-text-muted)' }}>Institutions</span>
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
              {uniqueInstitutions.toLocaleString()}
            </div>
          </div>
          <div className="card-elevated rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
              <span className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--color-text-muted)' }}>Vendors</span>
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
              {uniqueVendors.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Data quality warning */}
      {yearWarning && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-2.5 flex gap-2 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-amber-300/90">{yearWarning}</span>
        </div>
      )}

      {/* Narrative context strip */}
      {showDiagram && (
        <div className="rounded-lg border border-border/30 bg-background-elevated/40 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-text-muted">
          <span>
            <strong className="text-amber-300 font-semibold">{highRiskPct.toFixed(0)}%</strong>
            {' '}of flow value has high- or critical-risk similarity
          </span>
          <span className="text-border/60">·</span>
          <span>
            Top 3 vendors hold{' '}
            <strong className="text-text-secondary font-semibold">{top3VendorPct.toFixed(0)}%</strong>{' '}
            of total visible value
          </span>
          <span className="text-border/60">·</span>
          <span>
            <strong className="text-text-secondary font-semibold">{links.length}</strong>{' '}
            flows ranked by {apiSortBy === 'risk' ? 'avg risk similarity' : 'value'}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="card p-4 space-y-3">
        {/* Primary filter row: labeled dropdowns */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Sector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">Sector</label>
            <Select
              value={sectorId ? String(sectorId) : 'all'}
              onValueChange={v => { setParam('sector', v === 'all' ? undefined : v); setSelectedNode(null) }}
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
          </div>

          {/* Year with data quality badge */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">Year</label>
            <Select
              value={year ? String(year) : 'all'}
              onValueChange={v => { setParam('year', v === 'all' ? undefined : v); setSelectedNode(null) }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder={t('filters.allYears')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allYears')}</SelectItem>
                {YEARS.map(y => {
                  const q = getYearQualityLabel(y)
                  return (
                    <SelectItem key={y} value={String(y)}>
                      <span className="flex items-center gap-1.5">
                        {y}
                        <span className="text-[10px] text-text-muted" title={q.rfcPct}>{q.icon}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Flow limit */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">Top N Flows</label>
            <Select
              value={String(flowLimit)}
              onValueChange={v => { setParam('limit', v === '20' ? undefined : v); setSelectedNode(null) }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10 flows</SelectItem>
                <SelectItem value="20">Top 20 flows</SelectItem>
                <SelectItem value="50">Top 50 flows</SelectItem>
                <SelectItem value="100">Top 100 flows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Backend rank order */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">Rank by</label>
            <Select
              value={apiSortBy}
              onValueChange={v => { setParam('api_sort', v === 'value' ? undefined : v); setSelectedNode(null) }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="risk">Risk similarity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View toggle + export — pushed to the right */}
          <div className="ml-auto flex items-end gap-2">
            {links.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1 h-8 rounded text-xs text-text-muted hover:text-text-secondary border border-border/30 transition-colors"
                title="Export visible flows to CSV"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                CSV
              </button>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">View as</label>
              <div className="flex items-center gap-1 rounded-md border border-border/30 p-0.5 bg-background/40">
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
          </div>
        </div>

        {/* Secondary toggles row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/20">
          {/* Direct Awards toggle */}
          <button
            onClick={() => { setParam('da', directAwardOnly ? undefined : '1'); setSelectedNode(null) }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-all ${
              directAwardOnly
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'border-border/30 text-text-muted hover:text-text-secondary'
            }`}
            aria-pressed={directAwardOnly}
            title="Direct awards (adjudicación directa) skip competitive bidding — the institution selects the vendor without a public tender. Filtering to direct awards isolates a key procurement risk channel."
          >
            Direct Awards Only
          </button>

          {/* Group institutions toggle */}
          <button
            onClick={() => { setGroupByInstitution(!groupByInstitution); setSelectedNode(null) }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-all ${
              groupByInstitution
                ? 'bg-accent/20 border-accent/60 text-accent'
                : 'border-border/30 text-text-muted hover:text-text-secondary'
            }`}
            aria-pressed={groupByInstitution}
            title="Merge institution nodes that share the same parent organization (e.g. all PEMEX subsidiaries into one node)"
          >
            Group institutions
          </button>

          {/* Risk filter */}
          <div className="flex gap-1.5 items-center flex-wrap">
            <span
              className="text-xs text-text-muted cursor-help"
              title="Risk similarity score measures how closely procurement patterns resemble documented corruption cases (v6.0 model). This is not a probability of guilt — use for investigation triage only."
            >
              {t('riskLabel')}{' '}
              <span className="text-text-muted/60 text-[10px]">ℹ</span>
            </span>
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
              {/* Entity type label */}
              <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/70 mb-1">
                {selectedNode.type === 'institution' ? 'Government Institution' : 'Vendor'}
              </p>
              {selectedNode.type === 'institution' && (() => {
                const grp = getInstitutionGroup(fullNames.get(selectedNode.id) ?? selectedNode.name)
                if (!grp?.logo) return null
                return (
                  <img
                    src={grp.logo}
                    alt={grp.shortName}
                    height={24}
                    className="h-6 w-auto object-contain mb-1"
                    aria-hidden="true"
                  />
                )
              })()}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-text-primary">{selectedNode.name}</h3>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: (RISK_LEVELS.find(r => r.key === selectedNode.riskLevel)?.color ?? '#64748b') + '33',
                    color: RISK_LEVELS.find(r => r.key === selectedNode.riskLevel)?.color ?? '#64748b',
                  }}
                >
                  {RISK_LABELS[selectedNode.riskLevel] ?? selectedNode.riskLevel} similarity
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
                  <p className="text-xs text-text-muted max-w-xs">{t('emptyHint')}</p>
                </div>
              </div>
            </div>
          )}

          {showNoRiskMatch && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
              <GitBranch className="h-10 w-10 text-text-muted/40" aria-hidden="true" />
              <p className="text-sm font-medium text-text-secondary">{t('noRiskMatch')}</p>
              <p className="text-xs text-text-muted max-w-xs">{t('noRiskMatchHint')}</p>
            </div>
          )}

          {showDiagram && (
            <>
              <p className="text-xs text-text-muted mb-3 text-center opacity-70">
                Left nodes = institutions (buyers) · Right nodes = vendors (suppliers) · Flow width = contract value · Color = risk similarity
              </p>
              <SankeyDiagram
                nodes={nodes}
                links={links}
                width={diagramWidth}
                height={Math.max(400, nodes.length * 32)}
                onFlowClick={handleFlowClick}
                onNodeClick={handleNodeSelect}
                selectedNodeId={selectedNode?.id}
              />
            </>
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
                    {(['value', 'contracts', 'avgRisk', 'concentration'] as SortKey[]).map(key => (
                      <th key={key} className="text-right px-3 py-2.5 font-medium text-text-muted">
                        <button
                          onClick={() => handleSort(key)}
                          className="flex items-center gap-1 ml-auto hover:text-text-primary transition-colors"
                          title={key === 'concentration'
                            ? "Vendor's share of this institution's total visible flow — high concentration means one vendor dominates"
                            : undefined}
                        >
                          {key === 'value' ? 'Amount'
                            : key === 'contracts' ? 'Contracts'
                            : key === 'concentration' ? 'Conc.'
                            : 'Risk Sim.'}
                          {sortKey === key
                            ? sortDir === 'desc'
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronUp className="h-3 w-3" />
                            : <span className="h-3 w-3 inline-block" />}
                        </button>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => {
                    const { color, badge } = getRiskBadge(row.avgRisk)
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
                        <td className="px-3 py-2.5 max-w-[200px]">
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
                        <td className="px-3 py-2.5 max-w-[200px]">
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
                        <td className="px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap">
                          <span className="flex items-center justify-end gap-1" style={{ color }}>
                            <span
                              className="text-[9px] font-bold px-1 rounded"
                              style={{ backgroundColor: color + '22', color }}
                            >
                              {badge}
                            </span>
                            {(row.avgRisk * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-muted">
                          {(row.concentration * 100).toFixed(0)}%
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
                {tableRows.length} flows shown · Conc. = vendor's share of institution total · click any row to open contracts
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

      {/* How to read flow colors */}
      {showDiagram && viewMode === 'diagram' && (
        <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-3 flex gap-3">
          <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-text-muted space-y-1">
            <p className="font-medium text-amber-300">How to read flow colors</p>
            <p>
              Colors show <strong className="text-text-secondary">statistical similarity to documented corruption patterns</strong> (v6.0 model) — not probability of guilt:
              {' '}<span style={{ color: '#f87171' }}>red = critical (≥50%)</span>,
              {' '}<span style={{ color: '#fb923c' }}>orange = high (≥30%)</span>,
              {' '}<span style={{ color: '#fbbf24' }}>amber = medium (≥10%)</span>,
              {' '}<span style={{ color: '#4ade80' }}>green = low (&lt;10%)</span>.
              Thicker flows carry more contract value. Hover any flow for details. Click to view contracts.
            </p>
          </div>
        </div>
      )}

      {/* Causal inference disclaimer + Top suspicious flows */}
      {showDiagram && viewMode === 'diagram' && topSuspiciousFlows.length > 0 && (
        <div className="rounded-lg border border-border/30 bg-background-elevated p-4">
          <div className="flex items-start gap-2 mb-3 pb-3 border-b border-border/20">
            <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-text-muted">
              <span className="font-medium text-amber-300">Statistical similarity indicator — not evidence of wrongdoing.</span>
              {' '}High scores mean procurement characteristics resemble documented corruption cases.
              Use for investigation triage only.
            </p>
          </div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
            Top Suspicious Money Flows
            <span className="text-xs font-normal text-text-muted ml-1">— highest similarity score · click to investigate</span>
          </h2>
          <div className="space-y-2">
            {topSuspiciousFlows.map((flow, i) => {
              const { color, badge } = getRiskBadge(flow.avgRisk)
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
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-xs text-text-secondary truncate block">
                      {flow.sourceName.length > 30 ? flow.sourceName.slice(0, 30) + '…' : flow.sourceName}
                      {' → '}
                      {flow.targetName.length > 30 ? flow.targetName.slice(0, 30) + '…' : flow.targetName}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0" style={{ color }}>
                    <span
                      className="text-[9px] font-bold px-1 rounded"
                      style={{ backgroundColor: color + '22', color }}
                    >
                      {badge}
                    </span>
                    <span className="text-xs font-mono font-semibold">
                      {(flow.avgRisk * 100).toFixed(0)}%
                    </span>
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
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} aria-hidden="true" />
            <span className="text-[9px] font-bold" style={{ color: r.color }}>{r.badge}</span>
            {tc(r.key)}
          </span>
        ))}
        <span className="ml-auto opacity-60">{t('legend.leftRight')}</span>
      </div>

      {/* Known model limitations */}
      <details className="rounded-lg border border-border/20 bg-background/40 text-xs">
        <summary className="px-4 py-2.5 cursor-pointer text-text-muted hover:text-text-secondary transition-colors select-none font-medium list-none flex items-center gap-2">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          Known model limitations for this view
        </summary>
        <ul className="px-5 pb-3 pt-1 space-y-1.5 text-text-muted list-disc">
          <li>
            <strong className="text-text-secondary">Ghost company blind spot:</strong>{' '}
            Small shell companies (few contracts per RFC) score low — SAT-confirmed EFOS definitivo vendors average 28% similarity vs 85% for large-vendor training cases.
          </li>
          <li>
            <strong className="text-text-secondary">Execution-phase fraud is invisible:</strong>{' '}
            RUBLI only analyzes contract award data. Cost overruns, ghost workers, material substitution, and post-award kickbacks cannot be detected.
          </li>
          <li>
            <strong className="text-text-secondary">Pre-2010 vendor identity:</strong>{' '}
            0.1% RFC coverage means the same company may appear as multiple separate nodes. True vendor concentration may be substantially higher than shown.
          </li>
          <li>
            <strong className="text-text-secondary">Structural concentration:</strong>{' '}
            Energy (PEMEX/CFE) and Defence sectors have legitimate quasi-monopolies due to regulation and clearance requirements. High concentration scores in these sectors do not necessarily indicate corruption.
          </li>
        </ul>
      </details>
    </div>
  )
}
