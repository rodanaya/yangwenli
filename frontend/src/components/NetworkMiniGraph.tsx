/**
 * NetworkMiniGraph — compact force-directed network graph for the EntityProfileDrawer.
 * Uses ECharts force layout on a dark canvas, 220px tall.
 */

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { networkApi } from '@/api/client'
import type { NetworkGraphParams } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NetworkMiniGraphProps {
  entityId: number
  entityType: 'vendor' | 'institution'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskToColor(score: number | null): string {
  if (score == null) return '#64748b'
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

function nodeSize(value: number): number {
  const raw = Math.sqrt(value / 1e9) * 20 + 10
  return Math.min(Math.max(raw, 8), 30)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NetworkMiniGraph({ entityId, entityType }: NetworkMiniGraphProps) {
  const params: NetworkGraphParams = useMemo(() => {
    const base: NetworkGraphParams = { limit: 20, min_contracts: 1, depth: 1 }
    if (entityType === 'vendor') base.vendor_id = entityId
    else base.institution_id = entityId
    return base
  }, [entityId, entityType])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['network-mini-graph', entityType, entityId],
    queryFn: () => networkApi.getGraph(params),
    staleTime: 5 * 60 * 1000,
  })

  const centerNodeId = entityType === 'vendor' ? `v-${entityId}` : `i-${entityId}`

  const option = useMemo(() => {
    if (!data) return {}

    const nodes = data.nodes.map((node) => {
      const isCenter = node.id === centerNodeId
      const color = node.type === 'institution' ? '#3b82f6' : riskToColor(node.risk_score)
      const size = isCenter ? 40 : nodeSize(node.value)

      return {
        id: node.id,
        name: node.name,
        symbolSize: size,
        itemStyle: {
          color,
          borderColor: isCenter ? '#ffffff' : 'transparent',
          borderWidth: isCenter ? 2 : 0,
        },
        label: { show: false },
        // store raw data for tooltip
        value: node.value,
        contracts: node.contracts,
        risk_score: node.risk_score,
        node_type: node.type,
      }
    })

    const links = data.links.map((link) => ({
      source: link.source,
      target: link.target,
    }))

    return {
      backgroundColor: '#0d1117',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1a1f2e',
        borderColor: '#2d3748',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: (params: {
          dataType: string
          data: { name?: string; contracts?: number }
        }) => {
          if (params.dataType === 'node') {
            return `<strong>${params.data.name}</strong><br/>${params.data.contracts ?? 0} contracts`
          }
          return ''
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          force: {
            repulsion: 80,
            edgeLength: 60,
            gravity: 0.1,
            layoutAnimation: false,
          },
          roam: false,
          data: nodes,
          links,
          lineStyle: {
            color: '#47556940',
            width: 1,
          },
          label: { show: false },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 2 },
          },
        },
      ],
    }
  }, [data, centerNodeId])

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded"
        style={{ height: 220, backgroundColor: '#0d1117' }}
      >
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" style={{ backgroundColor: '#2d3748' }} />
          <Skeleton className="h-3 w-20" style={{ backgroundColor: '#2d3748' }} />
        </div>
      </div>
    )
  }

  if (isError || !data || data.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded text-xs text-slate-500"
        style={{ height: 220, backgroundColor: '#0d1117' }}
      >
        No connections found
      </div>
    )
  }

  return (
    <div className="rounded overflow-hidden" style={{ height: 220, backgroundColor: '#0d1117' }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

export default NetworkMiniGraph
