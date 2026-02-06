import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun, Database, Info, RefreshCw } from 'lucide-react'
import { formatNumber, formatCompactMXN } from '@/lib/utils'

interface DatabaseStats {
  total_contracts: number
  total_vendors: number
  total_institutions: number
  total_value_mxn: number
  year_range: string
  min_year: number
  max_year: number
  database_name: string
  data_source: string
}

export function Settings() {
  const { theme, toggleTheme } = useTheme()

  // Fetch database statistics
  const { data: stats, isLoading, error, refetch } = useQuery<DatabaseStats>({
    queryKey: ['stats', 'database'],
    queryFn: async () => {
      const response = await fetch('/api/v1/stats/database')
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Database className="h-4.5 w-4.5 text-accent" />
          Settings
        </h2>
        <p className="text-xs text-text-muted mt-0.5">Configure your dashboard preferences</p>
      </div>

      {/* Theme settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-text-muted">Switch between light and dark mode</p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Data Information
              </CardTitle>
              <CardDescription>About the procurement data</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              aria-label="Refresh statistics"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-risk-critical">Failed to load statistics</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Database</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <p className="font-medium">{stats?.database_name || 'RUBLI_NORMALIZED.db'}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Total Contracts</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium tabular-nums">
                    {stats ? formatNumber(stats.total_contracts) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Total Vendors</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium tabular-nums">
                    {stats ? formatNumber(stats.total_vendors) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Total Institutions</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium tabular-nums">
                    {stats ? formatNumber(stats.total_institutions) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Total Value</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium tabular-nums">
                    {stats ? formatCompactMXN(stats.total_value_mxn) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Time Range</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <p className="font-medium">{stats?.year_range || '2002 - 2025'}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Source</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium">{stats?.data_source || 'COMPRANET'}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            About Yang Wen-li
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted mb-4">
            Yang Wen-li is an AI-Powered Corruption Detection Platform for Mexican Government Procurement.
            Named after the pragmatic historian from Legend of the Galactic Heroes who valued transparency
            and democratic institutions over blind ambition.
          </p>
          <div className="text-xs text-text-muted space-y-1">
            <p>Risk Model: 10-factor IMF CRI methodology</p>
            <p>Sectors: 12-sector taxonomy</p>
            <p>Backend: FastAPI + SQLite</p>
            <p>Frontend: React + TypeScript + TailwindCSS</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
