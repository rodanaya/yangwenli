/**
 * Network Graph Page
 * Interactive visualization of vendor-institution-official relationships
 * Reveals collusion patterns, bid rigging rings, and shell company networks
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { networkApi, type NetworkNode, type NetworkLink } from '@/api/client'
import * as echarts from 'echarts'
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
  RefreshCw,
} from 'lucide-react'

// Color constants matching project palette
const COLORS = {
  vendor: '#3b82f6',      // Blue
  vendorHighRisk: '#dc2626', // Red
  institution: '#be123c', // Gobernacion color
  link: '#64748b',        // Gray
  linkHighRisk: '#ea580c', // Orange
}

export function NetworkGraph() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showVendors, setShowVendors] = useState(true)
  const [showInstitutions, setShowInstitutions] = useState(true)
  const [highRiskOnly, setHighRiskOnly] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  const view = searchParams.get('view') || 'overview'
  const focusVendorId = searchParams.get('vendor_id')
  const focusInstitutionId = searchParams.get('institution_id')

  // Fetch network graph data from API
  const { data: networkData, isLoading, error, refetch } = useQuery({
    queryKey: ['network-graph', focusVendorId, focusInstitutionId],
    queryFn: () => networkApi.getGraph({
      vendor_id: focusVendorId ? parseInt(focusVendorId) : undefined,
      institution_id: focusInstitutionId ? parseInt(focusInstitutionId) : undefined,
      min_contracts: 10,
      limit: 50,
    }),
  })

  // Filter nodes based on user selections
  const filteredData = useMemo(() => {
    if (!networkData) return { nodes: [], links: [] }

    let nodes = networkData.nodes
    let links = networkData.links

    // Filter by node type
    if (!showVendors) {
      const vendorIds = new Set(nodes.filter(n => n.type === 'vendor').map(n => n.id))
      nodes = nodes.filter(n => n.type !== 'vendor')
      links = links.filter(l => !vendorIds.has(l.source) && !vendorIds.has(l.target))
    }

    if (!showInstitutions) {
      const instIds = new Set(nodes.filter(n => n.type === 'institution').map(n => n.id))
      nodes = nodes.filter(n => n.type !== 'institution')
      links = links.filter(l => !instIds.has(l.source) && !instIds.has(l.target))
    }

    // Filter by risk level
    if (highRiskOnly) {
      const highRiskIds = new Set(
        nodes.filter(n => n.risk_score !== null && n.risk_score >= 0.4).map(n => n.id)
      )
      nodes = nodes.filter(n => highRiskIds.has(n.id))
      links = links.filter(l => highRiskIds.has(l.source) || highRiskIds.has(l.target))
    }

    return { nodes, links }
  }, [networkData, showVendors, showInstitutions, highRiskOnly])

  // Identify suspicious patterns from the data
  const suspiciousPatterns = useMemo(() => {
    if (!networkData?.nodes) return []

    return networkData.nodes
      .filter(n => n.type === 'vendor' && n.risk_score !== null && n.risk_score > 0.4)
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 5)
      .map(v => ({
        id: v.id.replace('v-', ''),
        name: v.name,
        risk: v.risk_score || 0,
        contracts: v.contracts,
        value: v.value,
        type: (v.risk_score || 0) >= 0.6 ? 'critical_risk' : 'high_risk',
        description: `${formatNumber(v.contracts)} contracts, ${formatCompactMXN(v.value)}`,
      }))
  }, [networkData])

  // Initialize and update ECharts graph
  useEffect(() => {
    if (!chartRef.current || filteredData.nodes.length === 0) return

    // Initialize chart if needed
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark')
    }

    // Prepare nodes for ECharts
    const nodes = filteredData.nodes.map(node => {
      const isHighRisk = node.risk_score !== null && node.risk_score >= 0.35
      const isCritical = node.risk_score !== null && node.risk_score >= 0.50
      const symbolSize = Math.min(60, Math.max(20, Math.log10(node.value + 1) * 5))

      return {
        id: node.id,
        name: node.name,
        value: node.value,
        symbolSize,
        category: node.type === 'vendor'
          ? (isCritical ? 2 : isHighRisk ? 1 : 0)
          : 3,
        itemStyle: {
          color: node.type === 'vendor'
            ? (isCritical ? '#dc2626' : isHighRisk ? '#ea580c' : COLORS.vendor)
            : COLORS.institution,
          borderColor: isCritical ? '#dc2626' : isHighRisk ? '#ea580c' : undefined,
          borderWidth: isHighRisk ? 2 : 0,
        },
        label: {
          show: symbolSize > 30,
          formatter: (node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name),
        },
        // Store original data for tooltip
        originalData: node,
      }
    })

    // Prepare links for ECharts
    const links = filteredData.links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value,
      lineStyle: {
        width: Math.min(5, Math.max(1, Math.log10(link.contracts + 1))),
        color: link.avg_risk && link.avg_risk >= 0.35 ? COLORS.linkHighRisk : COLORS.link,
        opacity: 0.6,
        curveness: 0.1,
      },
      originalData: link,
    }))

    // Chart options
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const data = params.data.originalData as NetworkNode
            const riskLabel = data.risk_score !== null
              ? (data.risk_score >= 0.50 ? 'Critical' : data.risk_score >= 0.35 ? 'High' : data.risk_score >= 0.20 ? 'Medium' : 'Low')
              : 'N/A'
            return `
              <div style="padding: 8px;">
                <strong>${data.name}</strong><br/>
                <span style="color: #999;">Type:</span> ${data.type === 'vendor' ? 'Vendor' : 'Institution'}<br/>
                <span style="color: #999;">Contracts:</span> ${formatNumber(data.contracts)}<br/>
                <span style="color: #999;">Value:</span> ${formatCompactMXN(data.value)}<br/>
                <span style="color: #999;">Risk:</span> <span style="color: ${data.risk_score && data.risk_score >= 0.35 ? '#ea580c' : '#16a34a'}">${riskLabel}</span>
              </div>
            `
          } else if (params.dataType === 'edge') {
            const data = params.data.originalData as NetworkLink
            return `
              <div style="padding: 8px;">
                <span style="color: #999;">Contracts:</span> ${formatNumber(data.contracts)}<br/>
                <span style="color: #999;">Value:</span> ${formatCompactMXN(data.value)}<br/>
                <span style="color: #999;">Avg Risk:</span> ${data.avg_risk?.toFixed(2) || 'N/A'}
              </div>
            `
          }
          return ''
        },
      },
      legend: {
        data: ['Vendors', 'High Risk', 'Critical', 'Institutions'],
        orient: 'horizontal',
        bottom: 10,
        textStyle: { color: '#94a3b8' },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        animation: true,
        animationDuration: 1000,
        data: nodes,
        links: links,
        categories: [
          { name: 'Vendors', itemStyle: { color: COLORS.vendor } },
          { name: 'High Risk', itemStyle: { color: '#ea580c' } },
          { name: 'Critical', itemStyle: { color: '#dc2626' } },
          { name: 'Institutions', itemStyle: { color: COLORS.institution } },
        ],
        roam: true,
        draggable: true,
        force: {
          repulsion: 300,
          gravity: 0.1,
          edgeLength: [50, 200],
          friction: 0.6,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4 },
        },
        label: {
          color: '#e2e8f0',
          fontSize: 10,
          position: 'right',
        },
        lineStyle: {
          curveness: 0.1,
        },
      }],
    }

    chartInstance.current.setOption(option, true)

    // Handle click events
    chartInstance.current.off('click')
    chartInstance.current.on('click', (params: any) => {
      if (params.dataType === 'node') {
        const node = params.data.originalData as NetworkNode
        if (node.type === 'vendor') {
          navigate(`/vendors/${node.id.replace('v-', '')}`)
        } else {
          navigate(`/institutions/${node.id.replace('i-', '')}`)
        }
      }
    })

    // Handle resize
    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [filteredData, navigate])

  // Apply zoom level to chart
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.dispatchAction({
        type: 'graphRoam',
        zoom: zoomLevel,
      })
    }
  }, [zoomLevel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
    }
  }, [])

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

  const handleFocusVendor = useCallback((vendorId: string) => {
    setSearchParams({ vendor_id: vendorId })
  }, [setSearchParams])

  const handleClearFocus = useCallback(() => {
    setSearchParams({})
  }, [setSearchParams])

  const vendorCount = filteredData.nodes.filter(n => n.type === 'vendor').length
  const institutionCount = filteredData.nodes.filter(n => n.type === 'institution').length

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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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

      {/* Focus indicator */}
      {(focusVendorId || focusInstitutionId) && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm">
              Focused on {focusVendorId ? 'vendor' : 'institution'} ID: {focusVendorId || focusInstitutionId}
            </span>
            <Button variant="outline" size="sm" onClick={handleClearFocus}>
              Clear Focus
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Network Visualization */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Vendor-Institution Network
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${filteredData.nodes.length} entities, ${filteredData.links.length} connections`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-risk-critical opacity-50" />
                  <p className="text-text-muted mb-4">Failed to load network data</p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : isLoading ? (
              <Skeleton className="h-[500px]" />
            ) : (
              <div className="relative h-[500px] bg-background-elevated rounded-lg overflow-hidden">
                {filteredData.nodes.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Network className="h-16 w-16 mx-auto mb-4 text-text-muted opacity-50" />
                      <p className="text-text-muted mb-2">No network data available</p>
                      <p className="text-xs text-text-muted">Try adjusting filters or clearing focus</p>
                    </div>
                  </div>
                ) : (
                  <div ref={chartRef} className="w-full h-full" />
                )}
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
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : suspiciousPatterns.length === 0 ? (
                <p className="text-sm text-text-muted">No high-risk vendors in current view</p>
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
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVendors}
                    onChange={(e) => setShowVendors(e.target.checked)}
                    className="rounded"
                  />
                  Show vendors ({networkData?.nodes.filter(n => n.type === 'vendor').length || 0})
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInstitutions}
                    onChange={(e) => setShowInstitutions(e.target.checked)}
                    className="rounded"
                  />
                  Show institutions ({networkData?.nodes.filter(n => n.type === 'institution').length || 0})
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highRiskOnly}
                    onChange={(e) => setHighRiskOnly(e.target.checked)}
                    className="rounded"
                  />
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

          {/* Network Statistics */}
          {networkData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Network Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Nodes</span>
                  <span>{networkData.total_nodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Links</span>
                  <span>{networkData.total_links}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Value</span>
                  <span>{formatCompactMXN(networkData.total_value)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default NetworkGraph
