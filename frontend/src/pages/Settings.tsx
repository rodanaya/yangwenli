import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi, exportApi, contractApi, sectorApi, statsApi } from '@/api/client'
import type { GradeDistribution, StructureQuality, FieldCompleteness, KeyIssue } from '@/api/client'
import {
  Database,
  Info,
  RefreshCw,
  Download,
  FileText,
  Users,
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
  Archive,
} from 'lucide-react'
import { DotStrip } from '@/components/charts/DotStrip'

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
  // Neutral/zinc for top grades per ART_DIRECTION §2 —
  // green implies safety on a corruption platform
  'S':  '#a3a3a3',
  'A':  '#a3a3a3',
  'B+': '#a3e635',
  'B':  '#60a5fa',
  'C+': '#fcd34d',
  'C':  '#fbbf24',
  'D':  '#fb923c',
  'D-': '#f87171',
  'F':  '#fca5a5',
  'F-': '#fca5a5',
}

// Routed through canonical RISK_COLORS — was a 4-hex local map duplicating
// the platform palette and contradicting the bible §3.10 'no green for low'
// rule (#4ade80 was a green low-severity that crept in here).
const SEVERITY_COLORS: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high: RISK_COLORS.high,
  medium: RISK_COLORS.medium,
  low: RISK_COLORS.low,
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
  const { t } = useTranslation('settings')
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
      {/* Editorial Page Header */}
      <header className="pb-5 border-b border-border">
        <p
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2"
          style={{ color: 'var(--color-accent)' }}
        >
          RUBLI · {t('pageTitle', 'Platform Settings')}
        </p>
        <h1
          className="leading-tight font-bold mb-2"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
            letterSpacing: '-0.01em',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('pageTitle', 'Platform Settings')}
        </h1>
        <p className="text-sm text-text-secondary max-w-xl">
          {t('pageDescription', 'Export data, review quality metrics, and configure platform preferences.')}
        </p>
      </header>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border pb-0" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
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
              {t(`tabs.${tab.id}`)}
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
  const { t } = useTranslation('settings')
  const { data: stats, isLoading, error, refetch } = useQuery<DatabaseStats>({
    queryKey: ['stats', 'database'],
    queryFn: () => statsApi.getDatabase() as Promise<DatabaseStats>,
    staleTime: 30 * 60 * 1000, // DB stats rarely change — 30 min stale window
    gcTime: 60 * 60 * 1000,
  })

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >

      {/* Data info */}
      <motion.div variants={staggerItem}>
      <div className="card-elevated rounded-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderLeft: '3px solid var(--color-accent-data)' }}>
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary font-mono">
              <Database className="h-4 w-4 text-accent-data" />
              {t('general.dataInfo.title')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{t('general.dataInfo.description')}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label={t('general.dataInfo.refreshLabel')}
            className="p-2 rounded-sm text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          {error ? (
            <p className="text-sm text-risk-critical">{t('general.dataInfo.loadError')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">{t('general.dataInfo.database')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <p className="font-medium">{stats?.database_name || 'RUBLI_NORMALIZED.db'}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted">{t('general.dataInfo.totalContracts')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium font-mono tabular-nums">
                    {stats ? formatNumber(stats.total_contracts) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">{t('general.dataInfo.totalVendors')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium font-mono tabular-nums">
                    {stats ? formatNumber(stats.total_vendors) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">{t('general.dataInfo.totalInstitutions')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium font-mono tabular-nums">
                    {stats ? formatNumber(stats.total_institutions) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">{t('general.dataInfo.totalValue')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium font-mono tabular-nums">
                    {stats ? formatCompactMXN(stats.total_value_mxn) : '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-text-muted">{t('general.dataInfo.timeRange')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <p className="font-medium">{stats?.year_range || '2002 - 2025'}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted">{t('general.dataInfo.source')}</p>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="font-medium">{stats?.data_source || 'COMPRANET'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </motion.div>

      {/* About */}
      <motion.div variants={staggerItem}>
      <div className="card-elevated rounded-sm overflow-hidden">
        <div className="px-6 py-4" style={{ borderLeft: '3px solid var(--color-accent)' }}>
          <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary font-mono">
            <Info className="h-4 w-4 text-accent" />
            {t('general.about.title')}
          </h3>
        </div>
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-sm text-text-muted mb-4">
            {t('general.about.description')}
          </p>
          <div className="text-xs text-text-muted space-y-1 font-mono">
            <p><span className="text-accent">Risk Model:</span> v0.6.5 Vendor-Stratified Calibrated (Internal AUC: 0.798 · Test AUC: 0.828)</p>
            <p><span className="text-accent">Sectors:</span> 12-sector taxonomy</p>
            <p><span className="text-accent">Backend:</span> FastAPI + SQLite</p>
            <p><span className="text-accent">Frontend:</span> React + TypeScript + TailwindCSS</p>
          </div>
        </div>
      </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Export Tab
// ============================================================================

function ExportTab() {
  const { t } = useTranslation('settings')
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
            <p className="text-sm font-medium text-text-primary">{t('export.limitsTitle')}</p>
            <p className="text-xs text-text-muted mt-1">
              Exports are limited to {formatNumber(EXPORT_LIMITS.contracts.default)} records by default.
              For larger exports, please contact the administrator or use the API directly.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ExportCard
          title={t('export.contracts.title')}
          description={t('export.contracts.description')}
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
          title={t('export.vendors.title')}
          description={t('export.vendors.description')}
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
      </div>

      {/* Bulk Export */}
      <BulkExportSection
        onSuccess={(msg) => showToast(msg, 'success')}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg text-sm font-medium transition-all ${
              toast.type === 'success'
                ? 'bg-risk-low/90 text-text-primary'
                : toast.type === 'warning'
                  ? 'bg-risk-medium/90 text-text-primary'
                  : 'bg-risk-critical/90 text-text-primary'
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
  const { t } = useTranslation('settings')
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-quality'],
    queryFn: () => analysisApi.getDataQuality(),
    staleTime: Infinity, // live fallback runs 3 full table scans — cache for session lifetime
    gcTime: 60 * 60 * 1000,
    retry: 1,
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
          <p>{t('dataQuality.loadError', 'Failed to load data quality metrics')}</p>
          <p className="text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // Metrics haven't been computed yet — last_calculated is null and arrays are empty
  if (!data.last_calculated && data.grade_distribution.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <Database className="h-8 w-8 mx-auto text-text-muted opacity-40" />
          <p className="text-sm font-medium text-text-primary">Data Quality Metrics Not Yet Computed</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Run <code className="bg-background-card px-1.5 py-0.5 rounded text-accent font-mono">python -m scripts.precompute_stats</code> from the backend directory to generate quality metrics for {formatNumber(data.total_contracts)} contracts.
          </p>
        </CardContent>
      </Card>
    )
  }

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
              // Tokenized — was 4 raw hex constants. Quality progresses from
              // risk-high (oldest/worst) → OECD cyan (newest/best). No green.
              { structure: 'A', years: '2002-2010', rfc: '0.1%', quality: 'Lowest', color: 'var(--color-risk-high)', desc: 'Legacy format, minimal RFC coverage, risk scores may be underestimated' },
              { structure: 'B', years: '2010-2017', rfc: '15.7%', quality: 'Better', color: 'var(--color-risk-medium)', desc: 'Improved coverage, UPPERCASE text, 72.2% direct award flags' },
              { structure: 'C', years: '2018-2022', rfc: '30.3%', quality: 'Good', color: 'var(--color-accent-data)', desc: 'Mixed case text, 78.4% direct award flags, better field completeness' },
              { structure: 'D', years: '2023-2025', rfc: '47.4%', quality: 'Best', color: 'var(--color-oecd)', desc: '100% Partida codes, highest RFC coverage, most reliable risk scoring' },
            ].map(s => (
              <div key={s.structure} className="flex items-start gap-3 p-3 rounded-sm" style={{ backgroundColor: `${s.color}08` }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-sm flex-shrink-0 font-bold text-sm" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
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
// Bulk Export Section
// ============================================================================

interface BulkExportSectionProps {
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

function BulkExportSection({ onSuccess, onError }: BulkExportSectionProps) {
  const { t } = useTranslation('settings')
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const handleHighRiskCSV = async () => {
    setLoadingKey('high-risk')
    try {
      const result = await contractApi.getAll({ risk_level: 'critical', per_page: 100, page: 1 })
      const rows = result.data ?? result
      const rowsArray = Array.isArray(rows) ? rows : []
      if (!rowsArray.length) {
        onError('No critical contracts found')
        return
      }
      const headers = ['id', 'vendor_name', 'institution_name', 'amount_mxn', 'risk_score', 'risk_level', 'contract_date', 'sector_id']
      function escapeCSV(val: unknown): string {
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
      }
      const csvLines = [
        headers.join(','),
        ...rowsArray.map((r) =>
          [
            escapeCSV(r.id),
            escapeCSV(r.vendor_name),
            escapeCSV(r.institution_name),
            escapeCSV(r.amount_mxn),
            escapeCSV(r.risk_score),
            escapeCSV(r.risk_level),
            escapeCSV(r.contract_date),
            escapeCSV(r.sector_id),
          ].join(',')
        ),
      ].join('\n')
      const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rubli_critical_contracts_${getTimestamp()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onSuccess(`Exported ${rowsArray.length} critical contracts as CSV`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleSectorJSON = async () => {
    setLoadingKey('sectors')
    try {
      const result = await sectorApi.getAll()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rubli_sector_summary_${getTimestamp()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onSuccess('Sector summary exported as JSON')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-4 w-4" aria-hidden="true" />
          {t('export.bulkExportTitle')}
        </CardTitle>
        <CardDescription>{t('export.bulkExportDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
            <div>
              <p className="text-sm font-medium">High-risk Contracts (CSV)</p>
              <p className="text-xs text-text-muted mt-0.5">Top 1,000 critical-risk contracts with vendor and amount data</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHighRiskCSV}
              disabled={loadingKey !== null}
              aria-label="Export high-risk contracts as CSV"
            >
              {loadingKey === 'high-risk' ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-3 w-3" aria-hidden="true" />
              )}
              Export CSV
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
            <div>
              <p className="text-sm font-medium">Sector Summary (JSON)</p>
              <p className="text-xs text-text-muted mt-0.5">All 12 sectors with contract counts, values and risk distributions</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSectorJSON}
              disabled={loadingKey !== null}
              aria-label="Export sector summary as JSON"
            >
              {loadingKey === 'sectors' ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-3 w-3" aria-hidden="true" />
              )}
              Export JSON
            </Button>
          </div>
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
              <span className="text-3xl font-mono font-bold tabular-nums">{value.toFixed(1)}</span>
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
          <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${colors.bg}`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DQGradeDistributionChart({ data }: { data: GradeDistribution[] }) {
  const chartData = data.map((d) => ({
    label: `Grade ${d.grade}`,
    value: d.count,
    color: GRADE_COLORS[d.grade] || '#64748b',
    valueLabel: `${d.percentage.toFixed(1)}%`,
  }))

  return (
    <div className="px-2">
      <DotStrip data={chartData} formatVal={(v) => formatNumber(v)} />
    </div>
  )
}

function DQStructureQualityChart({ data }: { data: StructureQuality[] }) {
  const chartData = data.map((d) => {
    // Color by structure letter (A=red lowest quality … D=green best)
    const colorByStructure: Record<string, string> = {
      A: '#f87171',
      // Same structure-quality progression as above; no green low.
      B: 'var(--color-risk-high)',
      C: 'var(--color-risk-medium)',
      D: 'var(--color-oecd)',
    }
    return {
      ...d,
      color: colorByStructure[d.structure] ?? '#64748b',
    }
  })

  // Dot-matrix geometry
  const DOTS = 50              // 1 dot = 2 points of quality score (0-100)
  const DOT_R = 3
  const DOT_GAP = 8
  const ROW_H = 40
  const LABEL_W = 150
  const VAL_W = 48
  const TOP_PAD = 6
  const BOTTOM_PAD = 6
  const chartW = LABEL_W + DOTS * DOT_GAP + VAL_W
  const chartH = TOP_PAD + chartData.length * ROW_H + BOTTOM_PAD

  return (
    <div className="h-[250px]" role="img" aria-label="Dot matrix showing data quality scores by structure">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {chartData.map((item, rowIdx) => {
          const filled = Math.min(DOTS, Math.round((item.avg_quality_score / 100) * DOTS))
          const yCenter = TOP_PAD + rowIdx * ROW_H + ROW_H / 2

          return (
            <g key={item.structure}>
              <text
                x={LABEL_W - 6}
                y={yCenter - 2}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize={11}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                Period {item.structure}
              </text>
              <text
                x={LABEL_W - 6}
                y={yCenter + 10}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                {item.years}
              </text>
              {Array.from({ length: DOTS }).map((_, i) => {
                const isFilled = i < filled
                return (
                  <motion.circle
                    key={i}
                    cx={LABEL_W + i * DOT_GAP + DOT_R}
                    cy={yCenter}
                    r={DOT_R}
                    fill={isFilled ? item.color : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={0.5}
                    fillOpacity={isFilled ? 0.85 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                  />
                )
              })}
              <text
                x={LABEL_W + DOTS * DOT_GAP + 6}
                y={yCenter + 3}
                fill={item.color}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={700}
              >
                {item.avg_quality_score.toFixed(1)}
              </text>
              <title>
                Period {item.structure} ({item.years}) — Quality: {item.quality_description}, Score: {item.avg_quality_score.toFixed(1)}, RFC: {item.rfc_coverage}%, Contracts: {formatNumber(item.contract_count)}
              </title>
            </g>
          )
        })}
      </svg>
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
            {(() => {
              const N = 24, DR = 2, DG = 5
              const filled = Math.max(1, Math.round((field.fill_rate / 100) * N))
              // No green low — best fill bucket = OECD cyan. Tokens.
              const color = field.fill_rate >= 90 ? 'var(--color-oecd)'
                : field.fill_rate >= 70 ? 'var(--color-accent-data)'
                : field.fill_rate >= 50 ? 'var(--color-risk-medium)'
                : '#f87171'
              return (
                <svg viewBox={`0 0 ${N * DG} 6`} className="w-full" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                  {Array.from({ length: N }).map((_, k) => (
                    <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                      fill={k < filled ? color : 'var(--color-background-elevated)'}
                      stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                      strokeWidth={k < filled ? 0 : 0.5}
                      fillOpacity={k < filled ? 0.85 : 1}
                    />
                  ))}
                </svg>
              )
            })()}
          </div>
          <div className="w-16 text-right text-sm font-mono tabular-nums">{field.fill_rate.toFixed(1)}%</div>
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
          key={`${issue.field}-${issue.severity}-${index}`}
          className="flex items-start gap-3 p-3 rounded-sm bg-background-elevated"
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
                className="text-xs px-1.5 py-0.5 rounded font-medium uppercase"
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
          className="p-3 rounded-sm"
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
