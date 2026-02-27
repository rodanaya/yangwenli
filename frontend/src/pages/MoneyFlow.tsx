import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { SankeyDiagram } from '@/components/SankeyDiagram'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SECTORS = [
  { id: 1, name: 'Salud' }, { id: 2, name: 'Educación' },
  { id: 3, name: 'Infraestructura' }, { id: 4, name: 'Energía' },
  { id: 5, name: 'Defensa' }, { id: 6, name: 'Tecnología' },
  { id: 7, name: 'Hacienda' }, { id: 8, name: 'Gobernación' },
  { id: 9, name: 'Agricultura' }, { id: 10, name: 'Ambiente' },
  { id: 11, name: 'Trabajo' }, { id: 12, name: 'Otros' },
]

const YEARS = Array.from({ length: 24 }, (_, i) => 2025 - i)

const RISK_LEVELS = [
  { key: 'critical', label: 'Critical', color: '#f87171' },
  { key: 'high', label: 'High', color: '#fb923c' },
  { key: 'medium', label: 'Medium', color: '#fbbf24' },
  { key: 'low', label: 'Low', color: '#4ade80' },
]

function formatMXN(v: number) {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T MXN`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B MXN`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M MXN`
  return `${v.toLocaleString()} MXN`
}

export default function MoneyFlow() {
  const [sectorId, setSectorId] = useState<number | undefined>(undefined)
  const [year, setYear] = useState<number | undefined>(2024)
  const [riskFilter, setRiskFilter] = useState<string[]>(['critical', 'high', 'medium', 'low'])
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

  const { nodes, links } = useMemo(() => {
    if (!data?.flows?.length) return { nodes: [], links: [] }

    const instMap = new Map<string, { name: string; riskLevel: string; total: number }>()
    const vendMap = new Map<string, { name: string; riskLevel: string; total: number }>()

    for (const f of data.flows) {
      const iKey = `inst-${f.source_id}`
      const vKey = `vend-${f.target_id}`

      const prev = instMap.get(iKey)
      instMap.set(iKey, { name: f.source_name, riskLevel: 'medium', total: (prev?.total ?? 0) + f.value })

      const vprev = vendMap.get(vKey)
      vendMap.set(vKey, { name: f.target_name, riskLevel: 'medium', total: (vprev?.total ?? 0) + f.value })
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary font-mono tracking-tight">Money Flow</h1>
        <p className="text-sm text-text-muted mt-1">
          Institution → Vendor procurement flows. Thickness = contract value. Click a flow to investigate.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-background-elevated border border-border/30 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={sectorId ? String(sectorId) : 'all'}
            onValueChange={v => setSectorId(v === 'all' ? undefined : Number(v))}
          >
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {SECTORS.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={year ? String(year) : 'all'}
            onValueChange={v => setYear(v === 'all' ? undefined : Number(v))}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-xs text-text-muted">Risk:</span>
            {RISK_LEVELS.map(r => (
              <button
                key={r.key}
                onClick={() => handleRiskToggle(r.key)}
                className="px-2 py-0.5 rounded text-xs font-medium border transition-all"
                style={
                  riskFilter.includes(r.key)
                    ? { backgroundColor: r.color, borderColor: r.color, color: '#0f172a' }
                    : { borderColor: 'rgb(71 85 105 / 0.4)', color: 'rgb(148 163 184)', opacity: 0.5 }
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {totalValue > 0 && (
          <p className="text-xs text-text-muted">
            Showing <span className="text-text-secondary font-medium">{links.length} flows</span> totaling{' '}
            <span className="text-accent font-medium">{formatMXN(totalValue)}</span> · {nodes.length} entities
          </p>
        )}
      </div>

      {/* Diagram */}
      <div ref={containerRef} className="bg-background-elevated border border-border/30 rounded-lg p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-text-muted text-sm">
            Loading money flow data…
          </div>
        )}
        {!isLoading && (error || !data?.flows?.length) && (
          <div className="flex items-center justify-center h-64 text-text-muted text-sm">
            No money flow data available for this selection.
          </div>
        )}
        {!isLoading && nodes.length === 0 && data?.flows?.length ? (
          <div className="flex items-center justify-center h-64 text-text-muted text-sm">
            No flows match the current risk filter.
          </div>
        ) : null}
        {!isLoading && nodes.length > 0 && links.length > 0 && (
          <SankeyDiagram
            nodes={nodes}
            links={links}
            width={diagramWidth}
            height={Math.min(900, Math.max(500, nodes.length * 16))}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="font-medium">Node color = risk level:</span>
        {RISK_LEVELS.map(r => (
          <span key={r.key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} />
            {r.label}
          </span>
        ))}
        <span className="ml-auto opacity-60">Left = institutions · Right = vendors</span>
      </div>
    </div>
  )
}
