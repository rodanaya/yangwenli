import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun, Database, Info } from 'lucide-react'

export function Settings() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-text-muted">Configure your dashboard preferences</p>
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
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Data Information
          </CardTitle>
          <CardDescription>About the procurement data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Database</p>
              <p className="font-medium">RUBLI_NORMALIZED.db</p>
            </div>
            <div>
              <p className="text-text-muted">Total Records</p>
              <p className="font-medium">~3.1 Million</p>
            </div>
            <div>
              <p className="text-text-muted">Time Range</p>
              <p className="font-medium">2002 - 2025</p>
            </div>
            <div>
              <p className="text-text-muted">Source</p>
              <p className="font-medium">COMPRANET</p>
            </div>
          </div>
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
