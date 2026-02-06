import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Chart-specific loading skeleton with animated bars
 */
export function ChartSkeleton({ height = 250, type = 'bar' }: { height?: number; type?: 'bar' | 'pie' | 'line' | 'area' }) {
  if (type === 'pie') {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="relative">
          <div className="w-40 h-40 rounded-full border-[20px] border-background-elevated animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-background-card" />
        </div>
        <div className="ml-8 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'line' || type === 'area') {
    return (
      <div className="relative" style={{ height }}>
        <div className="absolute bottom-8 left-8 right-4 top-4">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className="animate-pulse" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.3 }} />
                <stop offset="50%" className="animate-pulse" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.5 }} />
                <stop offset="100%" className="animate-pulse" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.3 }} />
              </linearGradient>
            </defs>
            <path
              d="M 0 80 Q 50 60, 100 70 T 200 50 T 300 65 T 400 40"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              className="animate-pulse"
              vectorEffect="non-scaling-stroke"
            />
            {type === 'area' && (
              <path
                d="M 0 80 Q 50 60, 100 70 T 200 50 T 300 65 T 400 40 L 400 100 L 0 100 Z"
                fill="url(#lineGradient)"
                opacity="0.2"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-4 bottom-8 w-8 flex flex-col justify-between">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-6" />
          ))}
        </div>
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-8 right-4 h-6 flex justify-between">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    )
  }

  // Default: Bar chart skeleton
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute bottom-8 left-8 right-4 top-4 flex items-end justify-around gap-2">
        {[65, 85, 45, 90, 55, 75, 60, 80].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-4 bottom-8 w-8 flex flex-col justify-between">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-6" />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-8 right-4 h-6 flex justify-around">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-6" />
        ))}
      </div>
    </div>
  )
}

/**
 * KPI Card loading skeleton with shimmer effect
 */
export function KPICardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Page-level loading skeleton for Dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Page-level loading skeleton for data tables (Contracts, etc.)
 */
export function TablePageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {/* Header */}
            <div className="flex border-b border-border p-3">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-24 mr-4" />
              ))}
            </div>
            {/* Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex border-b border-border p-3">
                {[...Array(7)].map((_, j) => (
                  <Skeleton key={j} className="h-5 w-full max-w-[120px] mr-4" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}

/**
 * Page-level loading skeleton for card grids (Vendors, Institutions)
 */
export function CardGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}

/**
 * Page-level loading skeleton for detail pages (VendorProfile, etc.)
 */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Page-level loading skeleton for sectors grid
 */
export function SectorsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Sector Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(12)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Generic page skeleton for simpler pages (Settings, Export, etc.)
 */
export function GenericPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Default page skeleton - used as Suspense fallback
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[400px]" />
        </CardContent>
      </Card>
    </div>
  )
}

export default PageSkeleton
