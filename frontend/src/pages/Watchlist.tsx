/**
 * Watchlist Page
 * Track suspicious vendors, contracts, and patterns for investigation
 * Personal investigation dashboard for analysts
 */

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { watchlistApi, type WatchlistItem, type WatchlistItemUpdate } from '@/api/client'
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  Download,
  Bell,
  BellOff,
  Loader2,
  RefreshCw,
} from 'lucide-react'

export function Watchlist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'watching' | 'investigating' | 'resolved'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor' | 'institution' | 'contract'>('all')

  // Fetch watchlist items from API
  const { data: watchlistData, isLoading, error, refetch } = useQuery({
    queryKey: ['watchlist', filter === 'all' ? undefined : filter, typeFilter === 'all' ? undefined : typeFilter],
    queryFn: () => watchlistApi.getAll({
      status: filter === 'all' ? undefined : filter,
      item_type: typeFilter === 'all' ? undefined : typeFilter,
    }),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: WatchlistItemUpdate }) =>
      watchlistApi.update(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => watchlistApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const items = watchlistData?.data || []
  const stats = useMemo(() => ({
    total: watchlistData?.total || 0,
    watching: watchlistData?.by_status?.watching || 0,
    investigating: watchlistData?.by_status?.investigating || 0,
    resolved: watchlistData?.by_status?.resolved || 0,
    highPriority: watchlistData?.high_priority_count || 0,
  }), [watchlistData])

  const toggleAlerts = useCallback((id: number, currentValue: boolean) => {
    updateMutation.mutate({ id, update: { alerts_enabled: !currentValue } })
  }, [updateMutation])

  const updateStatus = useCallback((id: number, status: WatchlistItem['status']) => {
    updateMutation.mutate({ id, update: { status } })
  }, [updateMutation])

  const removeItem = useCallback((id: number) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const handleItemClick = useCallback((item: WatchlistItem) => {
    switch (item.item_type) {
      case 'vendor':
        navigate(`/vendors/${item.item_id}`)
        break
      case 'institution':
        navigate(`/institutions/${item.item_id}`)
        break
      case 'contract':
        navigate(`/contracts?id=${item.item_id}`)
        break
    }
  }, [navigate])

  const getTypeIcon = (type: WatchlistItem['item_type']) => {
    switch (type) {
      case 'vendor': return Users
      case 'institution': return Building2
      case 'contract': return FileText
    }
  }

  const getPriorityColor = (priority: WatchlistItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-risk-critical/20 text-risk-critical border-risk-critical/30'
      case 'medium': return 'bg-risk-medium/20 text-risk-medium border-risk-medium/30'
      case 'low': return 'bg-risk-low/20 text-risk-low border-risk-low/30'
    }
  }

  const getStatusIcon = (status: WatchlistItem['status']) => {
    switch (status) {
      case 'watching': return Eye
      case 'investigating': return AlertTriangle
      case 'resolved': return CheckCircle
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Eye className="h-4.5 w-4.5 text-accent" />
              Watchlist
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Track and investigate suspicious patterns</p>
          </div>
        </div>
        <Card className="border-risk-critical/30 bg-risk-critical/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-risk-critical opacity-50" />
            <p className="text-text-muted mb-4">Failed to load watchlist data</p>
            <Button variant="outline" onClick={() => refetch()}>
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
            <Eye className="h-4.5 w-4.5 text-accent" />
            Watchlist
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Track and investigate suspicious patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add to Watchlist
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer hover:border-accent transition-colors" onClick={() => setFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Total Items</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
              </div>
              <Eye className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-accent transition-colors" onClick={() => setFilter('watching')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Watching</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-accent">{stats.watching}</p>
                )}
              </div>
              <Eye className="h-8 w-8 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-accent transition-colors" onClick={() => setFilter('investigating')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Investigating</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-risk-high">{stats.investigating}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-risk-high opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-accent transition-colors" onClick={() => setFilter('resolved')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Resolved</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-risk-low">{stats.resolved}</p>
                )}
              </div>
              <CheckCircle className="h-8 w-8 text-risk-low opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-risk-critical/5 border-risk-critical/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">High Priority</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-risk-critical">{stats.highPriority}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-risk-critical opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-text-muted" />
        <span className="text-sm text-text-muted">Filter:</span>
        {(['all', 'vendor', 'institution', 'contract'] as const).map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(type)}
            className="capitalize"
          >
            {type === 'all' ? 'All Types' : type + 's'}
          </Button>
        ))}
      </div>

      {/* Watchlist Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Tracked Items
            </span>
            <Badge variant="secondary">{items.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-border">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <EyeOff className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No items match your filters</p>
                  <p className="text-xs mt-2">Add vendors, institutions, or contracts to track suspicious patterns</p>
                </div>
              ) : (
                items.map((item) => {
                  const TypeIcon = getTypeIcon(item.item_type)
                  const StatusIcon = getStatusIcon(item.status)
                  const isUpdating = updateMutation.isPending || deleteMutation.isPending
                  return (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-background-elevated/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          item.item_type === 'vendor' ? 'bg-accent/10 text-accent' :
                          item.item_type === 'institution' ? 'bg-sector-gobernacion/10 text-sector-gobernacion' :
                          'bg-text-muted/10 text-text-muted'
                        }`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => handleItemClick(item)}
                              className="font-medium text-sm hover:text-accent transition-colors truncate"
                            >
                              {item.item_name}
                            </button>
                            {item.risk_score !== null && item.risk_score !== undefined && (
                              <RiskBadge score={item.risk_score} className="flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-text-muted mb-2">{item.reason}</p>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Added {formatDate(item.created_at)}
                            </span>
                            <Badge variant="outline" className={`text-[10px] ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </Badge>
                            <span className="flex items-center gap-1 capitalize">
                              <StatusIcon className="h-3 w-3" />
                              {item.status}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-text-muted mt-2 italic">Note: {item.notes}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleAlerts(item.id, item.alerts_enabled)}
                            title={item.alerts_enabled ? 'Disable alerts' : 'Enable alerts'}
                            disabled={isUpdating}
                          >
                            {item.alerts_enabled ? (
                              <Bell className="h-4 w-4 text-accent" />
                            ) : (
                              <BellOff className="h-4 w-4 text-text-muted" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(item.id)}
                            title="Remove from watchlist"
                            disabled={isUpdating}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-text-muted hover:text-risk-critical" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Status actions */}
                      {item.status !== 'resolved' && (
                        <div className="flex gap-2 mt-3 ml-14">
                          {item.status === 'watching' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => updateStatus(item.id, 'investigating')}
                              disabled={isUpdating}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Start Investigation
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => updateStatus(item.id, 'resolved')}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Resolved
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default Watchlist
