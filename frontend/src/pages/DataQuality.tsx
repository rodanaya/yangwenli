/**
 * Data Quality Dashboard Page
 * Shows data quality metrics, grade distribution, and key issues
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'
import type { GradeDistribution, StructureQuality, FieldCompleteness, KeyIssue } from '@/api/client'
import { formatNumber } from '@/lib/utils'
import { DATA_STRUCTURES } from '@/lib/constants'
import {
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Shield,
  FileWarning,
  Clock,
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
} from 'recharts'

// Grade colors
const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e', // Green
  B: '#3b82f6', // Blue
  C: '#eab308', // Yellow
  D: '#f97316', // Orange
  F: '#ef4444', // Red
}

// Severity colors
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

export function DataQuality() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-quality'],
    queryFn: () => analysisApi.getDataQuality(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data Quality</h2>
          <p className="text-sm text-text-muted">
            Quality metrics for {formatNumber(data.total_contracts)} contracts
          </p>
        </div>
        {data.last_calculated && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Clock className="h-3 w-3" />
            Last calculated: {new Date(data.last_calculated).toLocaleString()}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard
          title="Overall Score"
          value={data.overall_score}
          grade={overallGrade}
          icon={Shield}
        />
        <KPICard
          title="Total Contracts"
          value={formatNumber(data.total_contracts)}
          subtitle="Records analyzed"
          icon={Database}
        />
        <KPICard
          title="Grade A Records"
          value={`${data.grade_distribution.find(g => g.grade === 'A')?.percentage.toFixed(1) || 0}%`}
          subtitle="Highest quality"
          icon={CheckCircle}
          variant="success"
        />
        <KPICard
          title="Key Issues"
          value={data.key_issues.length.toString()}
          subtitle="Requiring attention"
          icon={AlertTriangle}
          variant={data.key_issues.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quality Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GradeDistributionChart data={data.grade_distribution} />
          </CardContent>
        </Card>

        {/* Quality by Data Period */}
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
            <StructureQualityChart data={data.by_structure} />
          </CardContent>
        </Card>
      </div>

      {/* Field Completeness & Issues */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Field Completeness */}
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
            <FieldCompletenessTable data={data.field_completeness} />
          </CardContent>
        </Card>

        {/* Key Issues */}
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
              <KeyIssuesList issues={data.key_issues} />
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
          <GradeExplainer />
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get grade from score
function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

// Score Card Component
function ScoreCard({
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

// KPI Card Component
function KPICard({
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

// Grade Distribution Chart
function GradeDistributionChart({ data }: { data: GradeDistribution[] }) {
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
            label={({ grade, percentage }) => `${grade} (${percentage.toFixed(1)}%)`}
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

// Structure Quality Chart
function StructureQualityChart({ data }: { data: StructureQuality[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: `${d.structure}\n(${d.years})`,
    color:
      d.quality_description === 'best'
        ? '#22c55e'
        : d.quality_description === 'good'
          ? '#3b82f6'
          : d.quality_description === 'better'
            ? '#eab308'
            : '#f97316',
  }))

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="structure"
            tick={{ fill: '#a3a3a3', fontSize: 11 }}
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

// Field Completeness Table
function FieldCompletenessTable({ data }: { data: FieldCompleteness[] }) {
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
                      ? '#22c55e'
                      : field.fill_rate >= 70
                        ? '#3b82f6'
                        : field.fill_rate >= 50
                          ? '#eab308'
                          : '#ef4444',
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

// Key Issues List
function KeyIssuesList({ issues }: { issues: KeyIssue[] }) {
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

// Grade Explainer
function GradeExplainer() {
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

export default DataQuality
