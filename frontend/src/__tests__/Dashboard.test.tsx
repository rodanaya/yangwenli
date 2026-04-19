import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../i18n'

// Ensure English for test assertions
beforeAll(async () => {
  await i18n.changeLanguage('en')
})

// Mock the API client - return never-resolving promises to keep loading state
vi.mock('@/api/client', () => ({
  analysisApi: {
    getFastDashboard: vi.fn(() => new Promise(() => {})),
    getYearOverYear: vi.fn(() => new Promise(() => {})),
    getExecutiveSummary: vi.fn(() => new Promise(() => {})),
    getPatternCounts: vi.fn(() => new Promise(() => {})),
    getAnomalies: vi.fn(() => new Promise(() => {})),
  },
  investigationApi: {
    getDashboardSummary: vi.fn(() => new Promise(() => {})),
    getCases: vi.fn(() => new Promise(() => {})),
  },
  vendorApi: {
    getTop: vi.fn(() => new Promise(() => {})),
  },
}))

// Mock echarts-for-react (used by Heatmap component)
vi.mock('echarts-for-react', () => ({
  default: () => null,
}))

// Mock recharts to avoid rendering issues in jsdom
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  CartesianGrid: () => null,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
  ScatterChart: ({ children }: any) => <div>{children}</div>,
  Scatter: () => null,
}))

import { Dashboard } from '../pages/Dashboard'

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('Dashboard', () => {
  it('renders source attribution always visible in Act I', () => {
    renderDashboard()
    // Source attribution is always rendered regardless of loading state
    expect(screen.getByText(/Source: RUBLI/)).toBeInTheDocument()
  })

  it('renders Act section dividers', () => {
    renderDashboard()
    expect(screen.getByText('THE FIELD')).toBeInTheDocument()
    expect(screen.getByText('THE CONCENTRATION')).toBeInTheDocument()
    expect(screen.getByText('THE QUEUE')).toBeInTheDocument()
    expect(screen.getByText('THE TWELVE')).toBeInTheDocument()
  })

  it('shows loading skeletons while data is being fetched', () => {
    renderDashboard()
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders Act II sector analysis headline', () => {
    renderDashboard()
    // h3 title is always rendered regardless of loading state
    expect(screen.getByText(/Risk by sector/)).toBeInTheDocument()
  })

  it('renders Act II model version badge', () => {
    renderDashboard()
    // v0.6.5 badge appears at least once (next to "Risk by sector" title)
    expect(screen.getAllByText('v0.6.5').length).toBeGreaterThan(0)
  })

  it('renders ARIA risk tier labels', () => {
    renderDashboard()
    // "Critical" appears in both TierCard label and constellation description
    expect(screen.getAllByText(/Critical/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/High/).length).toBeGreaterThan(0)
  })
})
