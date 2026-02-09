/**
 * Comparison Page
 * Side-by-side comparison of vendors, sectors, or institutions
 * Helps identify outliers and unusual patterns
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatCompactUSD, formatNumber, formatPercentSafe, toTitleCase } from '@/lib/utils'
import { sectorApi, vendorApi, institutionApi } from '@/api/client'
import {
  Columns,
  Plus,
  X,
  ArrowUpDown,
  BarChart3,
  Users,
  Building2,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'

type CompareType = 'sectors' | 'vendors' | 'institutions'

interface CompareItem {
  id: number
  name: string
  type: CompareType
}

export function Comparison() {
  const [compareType, setCompareType] = useState<CompareType>('sectors')
  const [selectedItems, setSelectedItems] = useState<CompareItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch data based on compare type
  const { data: sectors, isLoading: sectorsLoading, error: sectorsError } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorApi.getAll(),
    enabled: compareType === 'sectors',
    staleTime: 10 * 60 * 1000,
  })

  const { data: vendors, isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: ['vendors', 'comparison'],
    queryFn: () => vendorApi.getAll({ per_page: 50, min_contracts: 50 }),
    enabled: compareType === 'vendors',
    staleTime: 5 * 60 * 1000,
  })

  const { data: institutions, isLoading: institutionsLoading, error: institutionsError } = useQuery({
    queryKey: ['institutions', 'comparison'],
    queryFn: () => institutionApi.getAll({ per_page: 50 }),
    enabled: compareType === 'institutions',
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = sectorsLoading || vendorsLoading || institutionsLoading
  const hasError = sectorsError || vendorsError || institutionsError

  // Available items for selection
  const availableItems = useMemo(() => {
    let items: CompareItem[] = []
    if (compareType === 'sectors' && sectors?.data) {
      items = sectors.data.map((s) => ({ id: s.sector_id, name: s.sector_name, type: 'sectors' as const }))
    } else if (compareType === 'vendors' && vendors?.data) {
      items = vendors.data.map((v) => ({ id: v.id, name: v.name, type: 'vendors' as const }))
    } else if (compareType === 'institutions' && institutions?.data) {
      items = institutions.data.map((i) => ({ id: i.id, name: i.name, type: 'institutions' as const }))
    }

    if (searchQuery) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return items.filter((item) => !selectedItems.some((s) => s.id === item.id))
  }, [compareType, sectors, vendors, institutions, selectedItems, searchQuery])

  // Comparison data
  const comparisonData = useMemo(() => {
    if (selectedItems.length === 0) return []

    if (compareType === 'sectors' && sectors?.data) {
      return selectedItems.map((item) => {
        const sector = sectors.data.find((s) => s.sector_id === item.id)
        if (!sector) return null
        return {
          id: sector.sector_id,
          name: sector.sector_name,
          code: sector.sector_code,
          contracts: sector.total_contracts,
          value: sector.total_value_mxn,
          avgRisk: sector.avg_risk_score,
          directAward: sector.direct_award_pct,
          singleBid: sector.single_bid_pct,
          vendors: sector.total_vendors,
          highRisk: sector.high_risk_pct,
        }
      }).filter(Boolean)
    }

    if (compareType === 'vendors' && vendors?.data) {
      return selectedItems.map((item) => {
        const vendor = vendors.data.find((v) => v.id === item.id)
        if (!vendor) return null
        return {
          id: vendor.id,
          name: vendor.name,
          contracts: vendor.total_contracts,
          value: vendor.total_value_mxn,
          avgRisk: vendor.avg_risk_score,
          directAward: vendor.direct_award_pct,
          highRisk: vendor.high_risk_pct,
        }
      }).filter(Boolean)
    }

    if (compareType === 'institutions' && institutions?.data) {
      return selectedItems.map((item) => {
        const inst = institutions.data.find((i) => i.id === item.id)
        if (!inst) return null
        return {
          id: inst.id,
          name: inst.name,
          contracts: inst.total_contracts || 0,
          value: inst.total_amount_mxn || 0,
        }
      }).filter(Boolean)
    }

    return []
  }, [selectedItems, compareType, sectors, vendors, institutions])

  // Radar chart data
  const radarData = useMemo(() => {
    if (comparisonData.length === 0) return []

    const metrics = ['Contracts', 'Value', 'Risk Score', 'Direct Award', 'High Risk']

    return metrics.map((metric) => {
      const point: Record<string, number | string> = { metric }
      comparisonData.forEach((item: any) => {
        if (!item) return
        switch (metric) {
          case 'Contracts':
            point[item.name] = Math.min(100, (item.contracts / 500000) * 100)
            break
          case 'Value':
            point[item.name] = Math.min(100, (item.value / 1000000000000) * 100)
            break
          case 'Risk Score':
            point[item.name] = (item.avgRisk || 0) * 100
            break
          case 'Direct Award':
            // API returns 0-100 scale already
            point[item.name] = Math.min(100, item.directAward || 0)
            break
          case 'High Risk':
            // API returns 0-100 scale already
            point[item.name] = Math.min(100, item.highRisk || 0)
            break
        }
      })
      return point
    })
  }, [comparisonData])

  const addItem = (item: CompareItem) => {
    if (selectedItems.length < 5) {
      setSelectedItems([...selectedItems, item])
    }
  }

  const removeItem = (id: number) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id))
  }

  const clearAll = () => {
    setSelectedItems([])
  }

  const colors = ['#58a6ff', '#fb923c', '#4ade80', '#f87171', '#c084fc']

  if (hasError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Columns className="h-4.5 w-4.5 text-accent" />
            Comparison
          </h2>
          <p className="text-xs text-text-muted mt-0.5">Compare up to 5 items side-by-side</p>
        </div>
        <Card className="border-risk-critical/30 bg-risk-critical/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-risk-critical opacity-50" />
            <p className="text-text-muted mb-4">Failed to load comparison data</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Columns className="h-4.5 w-4.5 text-accent" />
            Comparison
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Compare up to 5 items side-by-side
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['sectors', 'vendors', 'institutions'] as const).map((type) => (
            <Button
              key={type}
              variant={compareType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareType(type)
                setSelectedItems([])
              }}
              className="capitalize"
            >
              {type === 'sectors' && <BarChart3 className="h-4 w-4 mr-2" />}
              {type === 'vendors' && <Users className="h-4 w-4 mr-2" />}
              {type === 'institutions' && <Building2 className="h-4 w-4 mr-2" />}
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Selection Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Select {compareType} to compare</span>
            {selectedItems.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Selected Items */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
            {selectedItems.map((item, index) => (
              <Badge
                key={item.id}
                variant="secondary"
                className="gap-1 py-1.5"
                style={{ borderColor: colors[index], borderWidth: 2 }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors[index] }}
                />
                {toTitleCase(item.name).length > 30 ? toTitleCase(item.name).slice(0, 30) + '...' : toTitleCase(item.name)}
                <button onClick={() => removeItem(item.id)} className="ml-1 hover:text-risk-critical">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedItems.length === 0 && (
              <p className="text-sm text-text-muted">No items selected. Choose up to 5 items below.</p>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder={`Search ${compareType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-border bg-background-card text-sm"
            />
          </div>

          {/* Available Items */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
            {isLoading ? (
              [...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : (
              availableItems.slice(0, 20).map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs truncate"
                  onClick={() => addItem(item)}
                  disabled={selectedItems.length >= 5}
                >
                  <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{toTitleCase(item.name)}</span>
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bar Chart Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contract Value Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1_000_000_000_000).toFixed(1)}T`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      width={100}
                      tickFormatter={(v) => { const t = toTitleCase(v); return t.length > 15 ? t.slice(0, 15) + '...' : t }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs">{toTitleCase(data.name)}</p>
                              <p className="text-xs text-text-muted">Value: {formatCompactMXN(data.value)}</p>
                              <p className="text-xs text-text-muted">~{formatCompactUSD(data.value)}</p>
                              <p className="text-xs text-text-muted">Contracts: {formatNumber(data.contracts)}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {comparisonData.map((item: any, index) => (
                        <Cell key={item.id} fill={colors[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Multi-Metric Comparison</CardTitle>
              <CardDescription className="text-xs">Normalized to 0-100 scale</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--color-border)" opacity={0.3} />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                    />
                    {comparisonData.map((item: any, index) => (
                      <Radar
                        key={item.name}
                        name={item.name}
                        dataKey={item.name}
                        stroke={colors[index]}
                        fill={colors[index]}
                        fillOpacity={0.2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Detailed Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="data-cell-header text-left">Metric</th>
                      {comparisonData.map((item: any, index) => (
                        <th key={item.id} className="data-cell-header text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors[index] }}
                            />
                            <span className="truncate max-w-[150px]">{toTitleCase(item.name)}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="data-cell font-medium">Total Contracts</td>
                      {comparisonData.map((item: any) => (
                        <td key={item.id} className="data-cell text-right tabular-nums">
                          {formatNumber(item.contracts)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="data-cell font-medium">Total Value</td>
                      {comparisonData.map((item: any) => (
                        <td key={item.id} className="data-cell text-right tabular-nums">
                          {formatCompactMXN(item.value)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="data-cell font-medium text-text-muted">Value (USD)</td>
                      {comparisonData.map((item: any) => (
                        <td key={item.id} className="data-cell text-right tabular-nums text-text-muted">
                          ~{formatCompactUSD(item.value)}
                        </td>
                      ))}
                    </tr>
                    {compareType !== 'institutions' && (
                      <>
                        <tr>
                          <td className="data-cell font-medium">Avg Risk Score</td>
                          {comparisonData.map((item: any) => (
                            <td key={item.id} className="data-cell text-right">
                              {item.avgRisk !== undefined ? (
                                <RiskBadge score={item.avgRisk} />
                              ) : '-'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="data-cell font-medium">Direct Award %</td>
                          {comparisonData.map((item: any) => (
                            <td key={item.id} className="data-cell text-right tabular-nums">
                              {item.directAward !== undefined ? formatPercentSafe(item.directAward, false) : '-'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="data-cell font-medium">High Risk %</td>
                          {comparisonData.map((item: any) => (
                            <td key={item.id} className="data-cell text-right tabular-nums">
                              {item.highRisk !== undefined ? formatPercentSafe(item.highRisk, false) : '-'}
                            </td>
                          ))}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {comparisonData.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Columns className="h-16 w-16 mx-auto mb-4 text-text-muted opacity-30" />
            <h3 className="text-lg font-medium mb-2">Select Items to Compare</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              Choose up to 5 {compareType} from the list above to see a detailed side-by-side comparison
              of their metrics, risk profiles, and contract patterns.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Comparison
