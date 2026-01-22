/**
 * Watchlist Page
 * Track suspicious vendors, contracts, and patterns for investigation
 * Personal investigation dashboard for analysts
 */

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatNumber, formatDate } from '@/lib/utils'
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
  Star,
  StarOff,
  Filter,
  Download,
  Bell,
  BellOff,
  MoreVertical,
} from 'lucide-react'

interface WatchlistItem {
  id: string
  type: 'vendor' | 'institution' | 'contract'
  entityId: number
  name: string
  reason: string
  addedAt: Date
  priority: 'high' | 'medium' | 'low'
  status: 'watching' | 'investigating' | 'resolved'
  notes?: string
  riskScore?: number
  alertsEnabled: boolean
  starred: boolean
}

// Mock data - in real app this would be persisted
const MOCK_WATCHLIST: WatchlistItem[] = [
  {
    id: '1',
    type: 'vendor',
    entityId: 12345,
    name: 'CONSTRUCCIONES AZTECA S.A. DE C.V.',
    reason: 'High concentration of direct awards with IMSS',
    addedAt: new Date('2024-01-15'),
    priority: 'high',
    status: 'investigating',
    riskScore: 0.72,
    alertsEnabled: true,
    starred: true,
  },
  {
    id: '2',
    type: 'vendor',
    entityId: 23456,
    name: 'SERVICIOS INTEGRALES DEL NORTE',
    reason: 'Unusual bidding patterns with related companies',
    addedAt: new Date('2024-01-10'),
    priority: 'high',
    status: 'watching',
    riskScore: 0.65,
    alertsEnabled: true,
    starred: false,
  },
  {
    id: '3',
    type: 'institution',
    entityId: 101,
    name: 'INSTITUTO MEXICANO DEL SEGURO SOCIAL',
    reason: 'Year-end spending spike investigation',
    addedAt: new Date('2024-01-08'),
    priority: 'medium',
    status: 'watching',
    alertsEnabled: false,
    starred: false,
  },
  {
    id: '4',
    type: 'vendor',
    entityId: 34567,
    name: 'DISTRIBUIDORA FARMACEUTICA NACIONAL',
    reason: 'Price anomaly detected in medical supplies',
    addedAt: new Date('2024-01-05'),
    priority: 'medium',
    status: 'resolved',
    riskScore: 0.45,
    notes: 'Investigated - pricing within acceptable range for emergency procurement',
    alertsEnabled: false,
    starred: false,
  },
  {
    id: '5',
    type: 'contract',
    entityId: 987654,
    name: 'Contrato AD-2024-001234 - Servicios de TI',
    reason: 'Direct award exceeds threshold without justification',
    addedAt: new Date('2024-01-03'),
    priority: 'low',
    status: 'watching',
    riskScore: 0.38,
    alertsEnabled: true,
    starred: false,
  },
]

export function Watchlist() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItem[]>(MOCK_WATCHLIST)
  const [filter, setFilter] = useState<'all' | 'watching' | 'investigating' | 'resolved'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor' | 'institution' | 'contract'>('all')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      return true
    })
  }, [items, filter, typeFilter])

  const stats = useMemo(() => ({
    total: items.length,
    watching: items.filter((i) => i.status === 'watching').length,
    investigating: items.filter((i) => i.status === 'investigating').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
    highPriority: items.filter((i) => i.priority === 'high' && i.status !== 'resolved').length,
  }), [items])

  const toggleStar = useCallback((id: string) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, starred: !item.starred } : item
    ))
  }, [])

  const toggleAlerts = useCallback((id: string) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, alertsEnabled: !item.alertsEnabled } : item
    ))
  }, [])

  const updateStatus = useCallback((id: string, status: WatchlistItem['status']) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, status } : item
    ))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleItemClick = useCallback((item: WatchlistItem) => {
    switch (item.type) {
      case 'vendor':
        navigate(`/vendors/${item.entityId}`)
        break
      case 'institution':
        navigate(`/institutions/${item.entityId}`)
        break
      case 'contract':
        navigate(`/contracts?id=${item.entityId}`)
        break
    }
  }, [navigate])

  const getTypeIcon = (type: WatchlistItem['type']) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-accent" />
            Watchlist
          </h2>
          <p className="text-sm text-text-muted">
            Track and investigate suspicious patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold text-accent">{stats.watching}</p>
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
                <p className="text-2xl font-bold text-risk-high">{stats.investigating}</p>
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
                <p className="text-2xl font-bold text-risk-low">{stats.resolved}</p>
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
                <p className="text-2xl font-bold text-risk-critical">{stats.highPriority}</p>
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
            <Badge variant="secondary">{filteredItems.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <EyeOff className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No items match your filters</p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  const StatusIcon = getStatusIcon(item.status)
                  return (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-background-elevated/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Star */}
                        <button
                          onClick={() => toggleStar(item.id)}
                          className="mt-1 text-text-muted hover:text-risk-medium transition-colors"
                        >
                          {item.starred ? (
                            <Star className="h-4 w-4 fill-risk-medium text-risk-medium" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </button>

                        {/* Icon */}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          item.type === 'vendor' ? 'bg-accent/10 text-accent' :
                          item.type === 'institution' ? 'bg-sector-gobernacion/10 text-sector-gobernacion' :
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
                              {item.name}
                            </button>
                            {item.riskScore !== undefined && (
                              <RiskBadge score={item.riskScore} className="flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-text-muted mb-2">{item.reason}</p>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Added {formatDate(item.addedAt.toISOString())}
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
                            onClick={() => toggleAlerts(item.id)}
                            title={item.alertsEnabled ? 'Disable alerts' : 'Enable alerts'}
                          >
                            {item.alertsEnabled ? (
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
                          >
                            <Trash2 className="h-4 w-4 text-text-muted hover:text-risk-critical" />
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
