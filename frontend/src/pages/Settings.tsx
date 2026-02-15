import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/hooks/useTheme'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { analysisApi, exportApi } from '@/api/client'
import type { GradeDistribution, StructureQuality, FieldCompleteness, KeyIssue } from '@/api/client'
import {
  Moon,
  Sun,
  Database,
  Info,
  RefreshCw,
  Download,
  FileText,
  Users,
  Building2,
  Loader2,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Shield,
  FileWarning,
  Clock,
  Settings as SettingsIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
} from '@/components/charts'

// ============================================================================
// Types & Constants
// ============================================================================

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

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning'
}

const EXPORT_LIMITS = {
  contracts: { default: 10000, max: 50000, estimatedSizeMB: 2.5 },
  vendors: { default: 10000, max: 50000, estimatedSizeMB: 1.5 },
  institutions: { default: 5000, max: 10000, estimatedSizeMB: 0.8 },
}

const GRADE_COLORS: Record<string, string> = {
  A: '#4ade80',
  B: '#60a5fa',
  C: '#fbbf24',
  D: '#fb923c',
  F: '#f87171',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#4ade80',
}

const TABS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'quality', label: 'Data Quality', icon: Database },
] as const

type TabId = typeof TABS[number]['id']

// ============================================================================
// Main Settings Page
// ============================================================================

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') || 'general') as TabId

  const setActiveTab = (tab: TabId) => {
    const newParams = new URLSearchParams(searchParams)
    if (tab === 'general') {
      newParams.delete('tab')
    } else {
      newParams.set('tab', tab)
    }
    setSearchParams(newParams)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-4.5 w-4.5 text-accent" />
          Settings
        </h2>
        <p className="text-xs text-text-muted mt-0.5">Configure preferences, export data, and review data quality</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                isActive
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.id}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div role="tabpanel" id={`tab-panel-${activeTab}`}>
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'quality' && <DataQualityTab />}
      </div>
    </div>
  )
}

// ============================================================================
// General Tab
// ============================================================================

function GeneralTab() {
  const { theme, toggleTheme } = useTheme()

  const { data: stats, isLoading, error, refetch } = useQuery<DatabaseStats>({
    queryKey: ['stats', 'database'],
    queryFn: async () => {
      const response = await fetch('/api/v1/stats/database')
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="space-y-6 max-w-2xl">
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
            <p>Risk Model: v4.0 Statistical Framework (AUC-ROC: 0.942)</p>
            <p>Sectors: 12-sector taxonomy</p>
            <p>Backend: FastAPI + SQLite</p>
            <p>Frontend: React + TypeScript + TailwindCSS</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Export Tab
// ============================================================================

function ExportTab() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  return (
    <div className="space-y-6">
      {/* Export size warning */}
      <Card className="border-risk-medium/30 bg-risk-medium/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-risk-medium flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-text-primary">Export Limits</p>
            <p className="text-xs text-text-muted mt-1">
              Exports are limited to {formatNumber(EXPORT_LIMITS.contracts.default)} records by default.
              For larger exports, please contact the administrator or use the API directly.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          title="Contracts"
          description="Export contract data with risk scores and classifications"
          icon={FileText}
          estimatedRecords={EXPORT_LIMITS.contracts.default}
          estimatedSizeMB={EXPORT_LIMITS.contracts.estimatedSizeMB}
          formats={['CSV']}
          onExport={async (format) => {
            if (format === 'CSV') {
              const blob = await exportApi.exportContracts({ per_page: EXPORT_LIMITS.contracts.default })
              downloadBlob(blob, `contracts_${getTimestamp()}.csv`)
            } else {
              throw new Error(`${format} export not yet implemented`)
            }
          }}
          onSuccess={(format) => showToast(`Contracts exported as ${format} successfully!`, 'success')}
          onError={(error) => showToast(`Export failed: ${error}`, 'error')}
        />
        <ExportCard
          title="Vendors"
          description="Export vendor profiles with risk metrics and classifications"
          icon={Users}
          estimatedRecords={EXPORT_LIMITS.vendors.default}
          estimatedSizeMB={EXPORT_LIMITS.vendors.estimatedSizeMB}
          formats={['CSV']}
          onExport={async (format) => {
            if (format === 'CSV') {
              const blob = await exportApi.exportVendors({ per_page: EXPORT_LIMITS.vendors.default })
              downloadBlob(blob, `vendors_${getTimestamp()}.csv`)
            } else {
              throw new Error(`${format} export not yet implemented for vendors`)
            }
          }}
          onSuccess={(format) => showToast(`Vendors exported as ${format} successfully!`, 'success')}
          onError={(error) => showToast(`Export failed: ${error}`, 'error')}
        />
        <ExportCard
          title="Institutions"
          description="Export institution data with spending analysis"
          icon={Building2}
          estimatedRecords={EXPORT_LIMITS.institutions.default}
          estimatedSizeMB={EXPORT_LIMITS.institutions.estimatedSizeMB}
          formats={['CSV']}
          disabled
          disabledReason="Coming soon"
          onExport={async (_format) => {
            throw new Error('Institution export coming soon')
          }}
          onSuccess={(format) => showToast(`Institutions exported as ${format} successfully!`, 'success')}
          onError={(error) => showToast(`Export failed: ${error}`, 'error')}
        />
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
              toast.type === 'success'
                ? 'bg-risk-low/90 text-white'
                : toast.type === 'warning'
                  ? 'bg-risk-medium/90 text-white'
                  : 'bg-risk-critical/90 text-white'
            }`}
            role="alert"
            aria-live="polite"
          >
            {toast.type === 'success' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <X className="h-4 w-4" aria-hidden="true" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Data Quality Tab
// ============================================================================

function DataQualityTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-quality'],
    queryFn: () => analysisApi.getDataQuality(),
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-text-muted">
          <p>Failed to load data quality metrics</p>
          <p className="text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const overallGrade = getGradeFromScore(data.overall_score)

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Quality metrics for {formatNumber(data.total_contracts)} contracts
        </p>
        {data.last_calculated && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Clock className="h-3 w-3" />
            Last calculated: {new Date(data.last_calculated).toLocaleString()}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <DQScoreCard
          title="Overall Score"
          value={data.overall_score}
          grade={overallGrade}
          icon={Shield}
        />
        <DQKPICard
          title="Total Contracts"
          value={formatNumber(data.total_contracts)}
          subtitle="Records analyzed"
          icon={Database}
        />
        <DQKPICard
          title="Grade A Records"
          value={`${data.grade_distribution.find(g => g.grade === 'A')?.percentage.toFixed(1) || 0}%`}
          subtitle="Highest quality"
          icon={CheckCircle}
          variant="success"
        />
        <DQKPICard
          title="Key Issues"
          value={data.key_issues.length.toString()}
          subtitle="Requiring attention"
          icon={AlertTriangle}
          variant={data.key_issues.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quality Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DQGradeDistributionChart data={data.grade_distribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Quality by Data Period
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              COMPRANET data quality varies by collection period
            </p>
          </CardHeader>
          <CardContent>
            <DQStructureQualityChart data={data.by_structure} />
          </CardContent>
        </Card>
      </div>

      {/* Data Structure Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Data Structure Timeline
          </CardTitle>
          <p className="text-xs text-text-muted mt-1">
            COMPRANET data collection periods and their characteristics
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { structure: 'A', years: '2002-2010', rfc: '0.1%', quality: 'Lowest', color: '#fb923c', desc: 'Legacy format, minimal RFC coverage, risk scores may be underestimated' },
              { structure: 'B', years: '2010-2017', rfc: '15.7%', quality: 'Better', color: '#fbbf24', desc: 'Improved coverage, UPPERCASE text, 72.2% direct award flags' },
              { structure: 'C', years: '2018-2022', rfc: '30.3%', quality: 'Good', color: '#60a5fa', desc: 'Mixed case text, 78.4% direct award flags, better field completeness' },
              { structure: 'D', years: '2023-2025', rfc: '47.4%', quality: 'Best', color: '#4ade80', desc: '100% Partida codes, highest RFC coverage, most reliable risk scoring' },
            ].map(s => (
              <div key={s.structure} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: `${s.color}08` }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 font-bold text-sm" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                  {s.structure}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.years}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                      RFC: {s.rfc}
                    </span>
                    <span className="text-xs text-text-muted">{s.quality} quality</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Field Completeness & Issues */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Field Completeness
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              Percentage of records with each field populated
            </p>
          </CardHeader>
          <CardContent>
            <DQFieldCompletenessTable data={data.field_completeness} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-risk-high" />
              Key Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.key_issues.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-text-muted">
                <CheckCircle className="h-5 w-5 mr-2 text-risk-low" />
                No critical issues detected
              </div>
            ) : (
              <DQKeyIssuesList issues={data.key_issues} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade Explainer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Understanding Quality Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DQGradeExplainer />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Export Sub-components
// ============================================================================

function getTimestamp() {
  const now = new Date()
  return now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface ExportCardProps {
  title: string
  description: string
  icon: React.ElementType
  formats?: string[]
  estimatedRecords?: number
  estimatedSizeMB?: number
  disabled?: boolean
  disabledReason?: string
  onExport: (format: string) => Promise<void>
  onSuccess: (format: string) => void
  onError: (error: string) => void
}

function ExportCard({
  title,
  description,
  icon: Icon,
  formats = ['CSV'],
  estimatedRecords,
  estimatedSizeMB,
  disabled = false,
  disabledReason,
  onExport,
  onSuccess,
  onError,
}: ExportCardProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    if (disabled) return
    setLoadingFormat(format)
    try {
      await onExport(format)
      onSuccess(format)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <Card className={disabled ? 'opacity-60' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
          {disabled && disabledReason && (
            <span className="ml-auto text-xs font-normal text-text-muted bg-background-elevated px-2 py-0.5 rounded">
              {disabledReason}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-muted mb-2">{description}</p>
        {estimatedRecords && estimatedSizeMB && (
          <p className="text-xs text-text-muted mb-4">
            ~{formatNumber(estimatedRecords)} records ({estimatedSizeMB} MB)
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <Button
              key={format}
              variant="outline"
              size="sm"
              onClick={() => handleExport(format)}
              disabled={disabled || loadingFormat !== null}
              aria-label={`Export ${title} as ${format}`}
            >
              {loadingFormat === format ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-3 w-3" aria-hidden="true" />
              )}
              {format}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Data Quality Sub-components
// ============================================================================

function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function DQScoreCard({
  title,
  value,
  grade,
  icon: Icon,
}: {
  title: string
  value: number
  grade: string
  icon: React.ElementType
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold">{value.toFixed(1)}</span>
              <span
                className="text-lg font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${GRADE_COLORS[grade]}20`,
                  color: GRADE_COLORS[grade],
                }}
              >
                Grade {grade}
              </span>
            </div>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${GRADE_COLORS[grade]}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: GRADE_COLORS[grade] }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DQKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'warning'
}) {
  const variantColors = {
    default: { bg: 'bg-accent/10', text: 'text-accent' },
    success: { bg: 'bg-risk-low/10', text: 'text-risk-low' },
    warning: { bg: 'bg-risk-high/10', text: 'text-risk-high' },
  }
  const colors = variantColors[variant]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DQGradeDistributionChart({ data }: { data: GradeDistribution[] }) {
  const chartData = data.map((d) => ({
    grade: `Grade ${d.grade}`,
    count: d.count,
    percentage: d.percentage,
    color: GRADE_COLORS[d.grade] || '#64748b',
  }))

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="grade"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            label={((props: { grade: string; percentage: number }) => `${props.grade} (${props.percentage.toFixed(1)}%)`) as unknown as import('recharts').PieLabel}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium">{d.grade}</p>
                    <p className="text-sm text-text-muted">
                      {formatNumber(d.count)} contracts ({d.percentage.toFixed(1)}%)
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function DQStructureQualityChart({ data }: { data: StructureQuality[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: `${d.structure}\n(${d.years})`,
    color:
      d.quality_description === 'best'
        ? '#4ade80'
        : d.quality_description === 'good'
          ? '#60a5fa'
          : d.quality_description === 'better'
            ? '#fbbf24'
            : '#fb923c',
  }))

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="structure"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            width={40}
            tickFormatter={(v) => `Period ${v}`}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as StructureQuality
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium">Period {d.structure} ({d.years})</p>
                    <p className="text-sm text-text-muted">Quality: {d.quality_description}</p>
                    <p className="text-sm text-text-muted">Score: {d.avg_quality_score.toFixed(1)}</p>
                    <p className="text-sm text-text-muted">RFC Coverage: {d.rfc_coverage}%</p>
                    <p className="text-sm text-text-muted">Contracts: {formatNumber(d.contract_count)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="avg_quality_score" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DQFieldCompletenessTable({ data }: { data: FieldCompleteness[] }) {
  return (
    <div className="space-y-2">
      {data.map((field) => (
        <div key={field.field_name} className="flex items-center gap-3">
          <div className="w-28 text-sm font-medium truncate">{field.field_name}</div>
          <div className="flex-1">
            <div className="flex h-2 rounded-full bg-background-elevated overflow-hidden">
              <div
                className="rounded-full transition-all"
                style={{
                  width: `${field.fill_rate}%`,
                  backgroundColor:
                    field.fill_rate >= 90
                      ? '#4ade80'
                      : field.fill_rate >= 70
                        ? '#60a5fa'
                        : field.fill_rate >= 50
                          ? '#fbbf24'
                          : '#f87171',
                }}
              />
            </div>
          </div>
          <div className="w-16 text-right text-sm tabular-nums">{field.fill_rate.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  )
}

function DQKeyIssuesList({ issues }: { issues: KeyIssue[] }) {
  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg bg-background-elevated"
        >
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${SEVERITY_COLORS[issue.severity]}20` }}
          >
            <AlertTriangle
              className="h-3 w-3"
              style={{ color: SEVERITY_COLORS[issue.severity] }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{issue.field}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase"
                style={{
                  backgroundColor: `${SEVERITY_COLORS[issue.severity]}20`,
                  color: SEVERITY_COLORS[issue.severity],
                }}
              >
                {issue.severity}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-0.5">{issue.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function DQGradeExplainer() {
  const grades = [
    {
      grade: 'A',
      range: '90-100',
      description: 'Excellent quality - all critical fields present, validated dates, consistent data',
    },
    {
      grade: 'B',
      range: '75-89',
      description: 'Good quality - most fields present, minor issues that do not affect analysis',
    },
    {
      grade: 'C',
      range: '60-74',
      description: 'Acceptable quality - some missing fields, may have date or amount inconsistencies',
    },
    {
      grade: 'D',
      range: '40-59',
      description: 'Poor quality - multiple missing fields, limited reliability for detailed analysis',
    },
    {
      grade: 'F',
      range: '0-39',
      description: 'Failing quality - critical fields missing, not suitable for most analyses',
    },
  ]

  return (
    <div className="grid gap-2 md:grid-cols-5">
      {grades.map((g) => (
        <div
          key={g.grade}
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${GRADE_COLORS[g.grade]}10` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-lg font-bold"
              style={{ color: GRADE_COLORS[g.grade] }}
            >
              {g.grade}
            </span>
            <span className="text-xs text-text-muted">({g.range})</span>
          </div>
          <p className="text-xs text-text-muted">{g.description}</p>
        </div>
      ))}
    </div>
  )
}

export default Settings
