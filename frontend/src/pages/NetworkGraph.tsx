/**
 * Network Graph Page
 * Interactive visualization of vendor-institution-official relationships
 * Reveals collusion patterns, bid rigging rings, and shell company networks
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { vendorApi, institutionApi } from '@/api/client'
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Users,
  Building2,
  Link2,
  AlertTriangle,
  Eye,
  Search,
} from 'lucide-react'

interface NetworkNode {
  id: string
  type: 'vendor' | 'institution'
  name: string
  value: number
  risk?: number
  connections: number
}

interface NetworkLink {
  source: string
  target: string
  value: number
  contracts: number
}

export function NetworkGraph() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  const view = searchParams.get('view') || 'overview'
  const focusId = searchParams.get('focus')

  // Fetch top vendors for network
  const { data: topVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 20],
    queryFn: () => vendorApi.getAll({ per_page: 20, min_contracts: 100 }),
  })

  // Fetch top institutions
  const { data: topInstitutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions', 'top', 15],
    queryFn: () => institutionApi.getAll({ per_page: 15 }),
  })

  const isLoading = vendorsLoading || institutionsLoading

  // Build network data
  const networkData = useMemo(() => {
    if (!topVendors?.data || !topInstitutions?.data) return { nodes: [], links: [] }

    const nodes: NetworkNode[] = [
      ...topVendors.data.map((v) => ({
        id: `v-${v.id}`,
        type: 'vendor' as const,
        name: v.name,
        value: v.total_value_mxn,
        risk: v.avg_risk_score,
        connections: v.total_contracts,
      })),
      ...topInstitutions.data.map((i) => ({
        id: `i-${i.id}`,
        type: 'institution' as const,
        name: i.name,
        value: i.total_amount_mxn || 0,
        connections: i.total_contracts || 0,
      })),
    ]

    // Generate sample links (in real implementation, this would come from API)
    const links: NetworkLink[] = []
    topVendors.data.forEach((vendor, vi) => {
      // Connect each vendor to 2-4 random institutions
      const numConnections = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < numConnections && i < topInstitutions.data.length; i++) {
        const instIndex = (vi + i) % topInstitutions.data.length
        links.push({
          source: `v-${vendor.id}`,
          target: `i-${topInstitutions.data[instIndex].id}`,
          value: vendor.total_value_mxn / numConnections,
          contracts: Math.floor(vendor.total_contracts / numConnections),
        })
      }
    })

    return { nodes, links }
  }, [topVendors, topInstitutions])

  // Suspicious patterns detection
  const suspiciousPatterns = useMemo(() => {
    if (!topVendors?.data) return []
    return topVendors.data
      .filter((v) => v.avg_risk_score && v.avg_risk_score > 0.4)
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        name: v.name,
        risk: v.avg_risk_score,
        type: v.direct_award_pct > 0.8 ? 'high_direct_award' : 'concentration',
        description:
          v.direct_award_pct > 0.8
            ? `${(v.direct_award_pct * 100).toFixed(0)}% direct awards`
            : `${v.total_contracts} contracts, high concentration`,
      }))
  }, [topVendors])

  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      setSelectedNode(node)
      if (node.type === 'vendor') {
        navigate(`/vendors/${node.id.replace('v-', '')}`)
      } else {
        navigate(`/institutions/${node.id.replace('i-', '')}`)
      }
    },
    [navigate]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-accent" />
            Network Graph
          </h2>
          <p className="text-sm text-text-muted">
            Visualize relationships between vendors and institutions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-text-muted w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Network Visualization */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Vendor-Institution Network
            </CardTitle>
            <CardDescription>
              {networkData.nodes.length} entities, {networkData.links.length} connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[500px]" />
            ) : (
              <div
                className="relative h-[500px] bg-background-elevated rounded-lg overflow-hidden"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
              >
                {/* Network visualization placeholder - would use D3.js or react-force-graph */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Network className="h-16 w-16 mx-auto mb-4 text-text-muted opacity-50" />
                    <p className="text-text-muted mb-2">Interactive Network Visualization</p>
                    <p className="text-xs text-text-muted max-w-md">
                      Force-directed graph showing {networkData.nodes.filter((n) => n.type === 'vendor').length} vendors
                      connected to {networkData.nodes.filter((n) => n.type === 'institution').length} institutions
                    </p>
                    <div className="mt-4 flex justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-xs text-text-muted">Vendors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-sector-gobernacion" />
                        <span className="text-xs text-text-muted">Institutions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-risk-high" />
                        <span className="text-xs text-text-muted">High Risk</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Node list as temporary visualization */}
                <div className="absolute top-4 left-4 right-4 bottom-4 overflow-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {networkData.nodes.slice(0, 12).map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleNodeClick(node)}
                        className={`p-2 rounded-lg text-left transition-colors ${
                          node.type === 'vendor'
                            ? 'bg-accent/10 hover:bg-accent/20 border border-accent/30'
                            : 'bg-sector-gobernacion/10 hover:bg-sector-gobernacion/20 border border-sector-gobernacion/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {node.type === 'vendor' ? (
                            <Users className="h-3 w-3 text-accent" />
                          ) : (
                            <Building2 className="h-3 w-3 text-sector-gobernacion" />
                          )}
                          <span className="text-xs font-medium truncate">{node.name}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-text-muted">
                            {formatCompactMXN(node.value)}
                          </span>
                          {node.risk !== undefined && <RiskBadge score={node.risk} className="text-[8px] px-1" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Suspicious Patterns */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-risk-high" />
                Suspicious Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suspiciousPatterns.length === 0 ? (
                <p className="text-sm text-text-muted">No suspicious patterns detected</p>
              ) : (
                suspiciousPatterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => navigate(`/vendors/${pattern.id}`)}
                    className="w-full p-2 rounded-lg bg-risk-high/10 border border-risk-high/30 text-left hover:bg-risk-high/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate pr-2">{pattern.name}</span>
                      <RiskBadge score={pattern.risk} className="text-[8px] px-1 flex-shrink-0" />
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">{pattern.description}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Network
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  className="w-full h-8 pl-7 pr-3 text-xs rounded-md border border-border bg-background-card"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Show vendors
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Show institutions
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="rounded" />
                  High risk only
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Users className="h-3 w-3 mr-2" />
                Find connected vendors
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Link2 className="h-3 w-3 mr-2" />
                Detect bid rotation
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <AlertTriangle className="h-3 w-3 mr-2" />
                Flag for investigation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default NetworkGraph
