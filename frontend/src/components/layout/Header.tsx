import { useLocation } from 'react-router-dom'
import { Bell, Search, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/useTheme'

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
  const { theme, toggleTheme } = useTheme()

  // Get current page title
  const currentPath = location.pathname
  const title = ROUTE_TITLES[currentPath] || getBreadcrumbTitle(currentPath)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - Breadcrumb */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {currentPath !== '/' && (
          <span className="text-xs text-text-muted">
            / {getParentPath(currentPath)}
          </span>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Search (Cmd+K)</p>
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-risk-critical text-[10px] font-medium text-white">
                3
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>3 high-risk alerts</p>
          </TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
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
  return parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')
}
