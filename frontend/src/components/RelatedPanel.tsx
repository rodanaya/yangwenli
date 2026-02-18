/**
 * Related Panel Component
 * Shows related entities and recommendations based on current context
 */

import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { ChevronRight, Users, Building2, Layers, TrendingUp } from 'lucide-react'

interface RelatedItem {
  id: number
  name: string
  type: 'vendor' | 'institution' | 'sector'
  value?: number
  contracts?: number
  riskScore?: number
}

interface RelatedPanelProps {
  title: string
  items: RelatedItem[]
  isLoading?: boolean
  emptyMessage?: string
  maxItems?: number
}

export const RelatedPanel = memo(function RelatedPanel({
  title,
  items,
  isLoading = false,
  emptyMessage = 'No related items found',
  maxItems = 5,
}: RelatedPanelProps) {
  const navigate = useNavigate()

  const handleItemClick = (item: RelatedItem) => {
    const routes = {
      vendor: `/vendors/${item.id}`,
      institution: `/institutions/${item.id}`,
      sector: `/sectors/${item.id}`,
    }
    navigate(routes[item.type])
  }

  const getIcon = (type: RelatedItem['type']) => {
    switch (type) {
      case 'vendor':
        return <Users className="h-4 w-4 text-text-muted" />
      case 'institution':
        return <Building2 className="h-4 w-4 text-text-muted" />
      case 'sector':
        return <Layers className="h-4 w-4 text-text-muted" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const displayItems = items.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <p className="text-sm text-text-muted py-2">{emptyMessage}</p>
        ) : (
          <div className="space-y-1">
            {displayItems.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-background-elevated transition-colors group"
              >
                {getIcon(item.type)}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                    {toTitleCase(item.name)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {item.contracts !== undefined && (
                      <span>{formatNumber(item.contracts)} contracts</span>
                    )}
                    {item.value !== undefined && (
                      <span>{formatCompactMXN(item.value)}</span>
                    )}
                  </div>
                </div>
                {item.riskScore !== undefined && (
                  <RiskBadge score={item.riskScore} className="text-xs" />
                )}
                <ChevronRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
        {items.length > maxItems && (
          <p className="text-xs text-text-muted text-center pt-2">
            +{items.length - maxItems} more
          </p>
        )}
      </CardContent>
    </Card>
  )
})

/**
 * Panel showing top vendors for a given context
 */
export const TopVendorsPanel = memo(function TopVendorsPanel({
  vendors,
  isLoading,
  title = 'Top Vendors',
}: {
  vendors: Array<{
    id: number
    name: string
    total_contracts: number
    total_value_mxn: number
    avg_risk_score?: number
  }>
  isLoading?: boolean
  title?: string
}) {
  const items: RelatedItem[] = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    type: 'vendor' as const,
    value: v.total_value_mxn,
    contracts: v.total_contracts,
    riskScore: v.avg_risk_score,
  }))

  return (
    <RelatedPanel
      title={title}
      items={items}
      isLoading={isLoading}
      emptyMessage="No vendors found"
    />
  )
})

/**
 * Panel showing top institutions for a given context
 */
export const TopInstitutionsPanel = memo(function TopInstitutionsPanel({
  institutions,
  isLoading,
  title = 'Top Institutions',
}: {
  institutions: Array<{
    id: number
    name: string
    total_contracts?: number
    total_value_mxn?: number
    avg_risk_score?: number
  }>
  isLoading?: boolean
  title?: string
}) {
  const items: RelatedItem[] = institutions.map((i) => ({
    id: i.id,
    name: i.name,
    type: 'institution' as const,
    value: i.total_value_mxn,
    contracts: i.total_contracts,
    riskScore: i.avg_risk_score,
  }))

  return (
    <RelatedPanel
      title={title}
      items={items}
      isLoading={isLoading}
      emptyMessage="No institutions found"
    />
  )
})

export default RelatedPanel
