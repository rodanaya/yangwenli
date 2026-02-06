import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

// Mock the API client - return never-resolving promises to keep loading state
vi.mock('@/api/client', () => ({
  analysisApi: {
    getFastDashboard: vi.fn(() => new Promise(() => {})),
    getAnomalies: vi.fn(() => new Promise(() => {})),
  },
  vendorApi: {
    getTop: vi.fn(() => new Promise(() => {})),
  },
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
}))

// Mock lazy-loaded chart components
vi.mock('@/components/charts', () => ({
  StackedAreaChart: () => <div>StackedAreaChart</div>,
  AlertPanel: () => <div>AlertPanel</div>,
  ProcedureBreakdown: () => <div>ProcedureBreakdown</div>,
  Heatmap: () => <div>Heatmap</div>,
}))

import { Dashboard } from '../pages/Dashboard'

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Dashboard', () => {
  it('renders the Command Center heading', () => {
    renderDashboard()
    expect(screen.getByText('Command Center')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderDashboard()
    expect(screen.getByText('Real-time procurement intelligence overview')).toBeInTheDocument()
  })

  it('renders KPI card titles', () => {
    renderDashboard()
    expect(screen.getByText('TOTAL CONTRACTS')).toBeInTheDocument()
    expect(screen.getByText('TOTAL VALUE')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE VENDORS')).toBeInTheDocument()
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument()
  })

  it('renders section card titles', () => {
    renderDashboard()
    expect(screen.getByText('Value by Sector')).toBeInTheDocument()
    expect(screen.getByText('Risk Distribution')).toBeInTheDocument()
    expect(screen.getByText('Risk Trend Over Time')).toBeInTheDocument()
    expect(screen.getByText('Active Alerts')).toBeInTheDocument()
    expect(screen.getByText('Contract Value Trends')).toBeInTheDocument()
    expect(screen.getByText('Top Vendors')).toBeInTheDocument()
  })

  it('shows loading skeletons while data is being fetched', () => {
    renderDashboard()
    // Skeleton elements should be present during loading state
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders stat cards at the bottom', () => {
    renderDashboard()
    expect(screen.getByText('Direct Awards')).toBeInTheDocument()
    expect(screen.getByText('Single Bid')).toBeInTheDocument()
    expect(screen.getByText('Avg Risk Score')).toBeInTheDocument()
  })
})
