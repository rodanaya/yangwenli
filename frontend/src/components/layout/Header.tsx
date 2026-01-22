import { useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Search, Moon, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SmartSearch } from '@/components/SmartSearch'
import { useTheme } from '@/hooks/useTheme'
import { analysisApi } from '@/api/client'

// Breadcrumb mapping
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/contracts': 'Contracts',
  '/vendors': 'Vendors',
  '/institutions': 'Institutions',
  '/sectors': 'Sectors',
  '/analysis/risk': 'Risk Analysis',
  '/export': 'Export Data',
  '/settings': 'Settings',
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Fetch anomaly count for notifications
  const { data: anomalies } = useQuery({
    queryKey: ['analysis', 'anomalies', 'high'],
    queryFn: () => analysisApi.getAnomalies('high'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const alertCount = anomalies?.total || 0

  // Get current page title
  const currentPath = location.pathname
  const title = ROUTE_TITLES[currentPath] || getBreadcrumbTitle(currentPath)

  const handleSearchSelect = useCallback(
    (suggestion: { type: string; id?: number; label: string }) => {
      if (suggestion.type === 'vendor' && suggestion.id) {
        navigate(`/vendors/${suggestion.id}`)
      } else if (suggestion.type === 'institution' && suggestion.id) {
        navigate(`/institutions/${suggestion.id}`)
      } else {
        // For text searches, navigate to contracts with search param
        navigate(`/contracts?search=${encodeURIComponent(suggestion.label)}`)
      }
      setSearchOpen(false)
      setSearchValue('')
    },
    [navigate]
  )

  // Search submission is handled via SmartSearch's onSelect
  // or by pressing Enter in the search input

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-base md:text-lg font-semibold text-text-primary truncate">{title}</h1>
        {currentPath !== '/' && (
          <span className="hidden sm:inline text-xs text-text-muted">/ {getParentPath(currentPath)}</span>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Search - Expandable */}
        {searchOpen ? (
          <div className="flex items-center gap-2 animate-slide-in-right">
            <SmartSearch
              value={searchValue}
              onChange={setSearchValue}
              onSelect={handleSearchSelect}
              className="w-full max-w-64"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:h-8 md:w-8 flex-shrink-0"
              onClick={() => {
                setSearchOpen(false)
                setSearchValue('')
              }}
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:h-8 md:w-8"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search (Cmd+K)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:h-8 md:w-8 relative"
              onClick={() => navigate('/analysis/risk')}
              aria-label={`${alertCount} high-risk alerts`}
            >
              <Bell className="h-4 w-4" />
              {alertCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-risk-critical text-[10px] font-medium text-white"
                  aria-hidden="true"
                >
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{alertCount > 0 ? `${alertCount} high-risk alerts` : 'No alerts'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:h-8 md:w-8"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle theme</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

function getBreadcrumbTitle(path: string): string {
  // Handle dynamic routes like /vendors/123
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return 'Dashboard'

  // Check if last part is a number (ID)
  const lastPart = parts[parts.length - 1]
  if (/^\d+$/.test(lastPart)) {
    const parentRoute = parts.slice(0, -1).join('/')
    const parentTitle = ROUTE_TITLES[`/${parentRoute}`]
    if (parentTitle) {
      return `${parentTitle.replace(/s$/, '')} Details` // "Vendors" -> "Vendor Details"
    }
  }

  // Capitalize first letter
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
}

function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return 'Home'
  return parts
    .slice(0, -1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' / ')
}
