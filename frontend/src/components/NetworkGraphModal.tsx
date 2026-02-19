/**
 * NetworkGraphModal
 * Force-directed graph showing vendor/institution relationships.
 * Uses the existing /network/graph endpoint and ECharts graph series.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { Share2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { networkApi } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

interface NetworkGraphModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerType: 'vendor' | 'institution'
  centerId: number
  centerName?: string
}

function riskToColor(score: number | null): string {
  if (score == null) return '#64748b'
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function vendorSymbolSize(value: number): number {
  return clamp(Math.sqrt(value / 1e9) * 25 + 15, 15, 55)
}

function institutionSymbolSize(value: number): number {
  return clamp(Math.sqrt(value / 1e9) * 20 + 15, 12, 45)
}

function linkWidth(contracts: number): number {
  return clamp(Math.log2(contracts + 1), 1, 5)
}

function truncate(name: string, max = 18): string {
  return name.length > max ? name.slice(0, max) + '…' : name
}

export function NetworkGraphModal({
  open,
  onOpenChange,
  centerType,
  centerId,
  centerName,
}: NetworkGraphModalProps) {
  const navigate = useNavigate()
  const [depth, setDepth] = useState<1 | 2>(1)

  const queryParams =
    centerType === 'vendor'
      ? { vendor_id: centerId, depth, limit: 60 }
      : { institution_id: centerId, depth, limit: 60 }

  const { data, isLoading } = useQuery({
    queryKey: ['network-graph', centerType, centerId, depth],
    queryFn: () => networkApi.getGraph(queryParams),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const option = useMemo(() => {
    if (!data) return {}

    const centerNodeId =
      centerType === 'vendor' ? `v-${centerId}` : `i-${centerId}`

    const nodes = data.nodes.map((node) => {
      const isCenter = node.id === centerNodeId
      let symbolSize: number
      let itemColor: string

      if (isCenter) {
        symbolSize = 65
        itemColor = centerType === 'vendor' ? riskToColor(node.risk_score) : '#3b82f6'
      } else if (node.type === 'vendor') {
        symbolSize = vendorSymbolSize(node.value)
        itemColor = riskToColor(node.risk_score)
      } else {
        symbolSize = institutionSymbolSize(node.value)
        itemColor = '#3b82f6'
      }

      const showLabel = isCenter || symbolSize > 25

      return {
        id: node.id,
        name: node.name,
        value: node.value,
        contracts: node.contracts,
        risk_score: node.risk_score,
        node_type: node.type,
        symbolSize,
        itemStyle: {
          color: itemColor,
          borderColor: isCenter ? '#ffffff' : undefined,
          borderWidth: isCenter ? 3 : 0,
        },
        label: {
          show: showLabel,
          formatter: truncate(node.name),
          fontSize: 10,
          position: 'bottom' as const,
          color: 'var(--color-text-muted)',
        },
      }
    })

    const links = data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
      contracts: link.contracts,
      avg_risk: link.avg_risk,
      lineStyle: {
        width: linkWidth(link.contracts),
        color: (link.avg_risk ?? 0) >= 0.3 ? '#ef444480' : '#47556980',
        curveness: 0.1,
      },
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'var(--color-background)',
        borderColor: 'var(--color-border)',
        textStyle: { color: 'var(--color-text-primary)', fontSize: 12 },
        formatter: (params: { dataType: string; data: { name: string; contracts?: number; value?: number; avg_risk?: number; risk_score?: number | null } }) => {
          if (params.dataType === 'node') {
            const { name, contracts, value, risk_score } = params.data
            const riskPct = risk_score != null ? ` • Risk: ${(risk_score * 100).toFixed(0)}%` : ''
            return `<strong>${name}</strong><br/>${formatNumber(contracts ?? 0)} contracts<br/>${formatCompactMXN(value ?? 0)}${riskPct}`
          }
          if (params.dataType === 'edge') {
            const { contracts, value, avg_risk } = params.data
            const riskPct = avg_risk != null ? ` • Avg risk: ${(avg_risk * 100).toFixed(0)}%` : ''
            return `${formatNumber(contracts ?? 0)} contracts<br/>${formatCompactMXN(value ?? 0)}${riskPct}`
          }
          return ''
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          data: nodes,
          links,
          force: {
            repulsion: 300,
            gravity: 0.08,
            edgeLength: [80, 220],
            layoutAnimation: true,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 },
          },
          label: {
            show: true,
          },
          lineStyle: {
            opacity: 0.6,
          },
        },
      ],
    }
  }, [data, centerId, centerType])

  const handleNodeClick = (params: { dataType?: string; data?: { id?: string; node_type?: string } }) => {
    if (params.dataType !== 'node' || !params.data?.id) return
    const nodeId: string = params.data.id
    if (nodeId.startsWith('v-')) {
      const vid = parseInt(nodeId.slice(2), 10)
      onOpenChange(false)
      navigate(`/vendors/${vid}`)
    } else if (nodeId.startsWith('i-')) {
      const iid = parseInt(nodeId.slice(2), 10)
      onOpenChange(false)
      navigate(`/institutions/${iid}`)
    }
  }

  const isEmpty = !isLoading && data && data.nodes.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        style={{ maxWidth: '64rem' }}
        className="flex flex-col gap-0 p-0"
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-accent" />
            <DialogTitle className="text-base">
              Network: {centerName ?? `${centerType} ${centerId}`}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1 mr-6">
            <span className="text-xs text-text-muted mr-1">Depth:</span>
            {([1, 2] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  depth === d
                    ? 'bg-accent text-white'
                    : 'bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40'
                }`}
              >
                {d}-hop
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 px-6 py-4" style={{ minHeight: '60vh' }}>
          {isLoading && (
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}

          {isEmpty && (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              No network connections found for this {centerType}.
            </div>
          )}

          {!isLoading && !isEmpty && data && (
            <ReactECharts
              option={option}
              style={{ height: '62vh', width: '100%' }}
              onEvents={{ click: handleNodeClick }}
              opts={{ renderer: 'svg' }}
            />
          )}
        </div>

        {/* Footer / Legend */}
        {!isLoading && !isEmpty && data && (
          <div className="px-6 pb-4 pt-2 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
                Institution
              </span>
              {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
                <span key={level} className="flex items-center gap-1 capitalize">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  {level} vendor
                </span>
              ))}
            </div>
            <span className="text-xs text-text-muted">
              {data.total_nodes} nodes · {data.total_links} connections · Click to navigate
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
