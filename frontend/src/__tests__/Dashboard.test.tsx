import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
    getAnomalies: vi.fn(() => new Promise(() => {})),
  },
  investigationApi: {
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
  it('renders the Intelligence Brief heading', () => {
    renderDashboard()
    expect(screen.getByText('INTELLIGENCE BRIEF')).toBeInTheDocument()
  })

  it('renders key section headings', () => {
    renderDashboard()
    // These come from the dashboard i18n translations
    expect(screen.getByText('Value at Risk by Sector')).toBeInTheDocument()
    expect(screen.getByText('Risk Trajectory')).toBeInTheDocument()
  })

  it('renders navigation cards', () => {
    renderDashboard()
    expect(screen.getByText('Patterns')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('Methodology')).toBeInTheDocument()
  })

  it('shows loading skeletons while data is being fetched', () => {
    renderDashboard()
    // Skeleton elements should be present during loading state
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders the validated against real corruption section', () => {
    renderDashboard()
    expect(screen.getByText('Validated Against Real Corruption')).toBeInTheDocument()
  })

  it('renders the counterintuitive finding section', () => {
    renderDashboard()
    expect(screen.getByText('COUNTERINTUITIVE FINDING')).toBeInTheDocument()
  })
})
