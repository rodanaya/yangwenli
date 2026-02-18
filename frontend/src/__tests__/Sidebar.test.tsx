import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '../components/layout/Sidebar'
import i18n from '../i18n'

// Ensure English for test assertions
beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function renderSidebar(props: { collapsed?: boolean; onToggle?: () => void } = {}) {
  const defaultProps = { collapsed: false, onToggle: vi.fn(), ...props }
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <Sidebar {...defaultProps} />
      </TooltipProvider>
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders overview navigation items when expanded', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Executive Summary')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Explore Data')).toBeInTheDocument()
  })

  it('renders brand text when expanded', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('RUBLI')).toBeInTheDocument()
    expect(screen.getByText('INTEL PLATFORM')).toBeInTheDocument()
  })

  it('renders section headers when expanded', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('OVERVIEW')).toBeInTheDocument()
    expect(screen.getByText('ANALYZE')).toBeInTheDocument()
    expect(screen.getByText('INVESTIGATE')).toBeInTheDocument()
    expect(screen.getByText('UNDERSTAND')).toBeInTheDocument()
  })

  it('renders analyze nav items', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Fraud Patterns')).toBeInTheDocument()
    expect(screen.getByText('Red Flags')).toBeInTheDocument()
    expect(screen.getByText('Money Flow')).toBeInTheDocument()
    expect(screen.getByText('All Contracts')).toBeInTheDocument()
  })

  it('renders investigate nav items', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Institution Health')).toBeInTheDocument()
    expect(screen.getByText('Vendor Network')).toBeInTheDocument()
    expect(screen.getByText('My Watchlist')).toBeInTheDocument()
    expect(screen.getByText('Case Manager')).toBeInTheDocument()
  })

  it('renders understand nav items', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Sectors')).toBeInTheDocument()
    expect(screen.getByText('Methodology')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn()
    renderSidebar({ onToggle })
    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
    fireEvent.click(toggleButton)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('hides brand text when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText('RUBLI')).not.toBeInTheDocument()
    expect(screen.queryByText('INTEL PLATFORM')).not.toBeInTheDocument()
  })

  it('hides section headers when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText('OVERVIEW')).not.toBeInTheDocument()
    expect(screen.queryByText('ANALYZE')).not.toBeInTheDocument()
    expect(screen.queryByText('INVESTIGATE')).not.toBeInTheDocument()
    expect(screen.queryByText('UNDERSTAND')).not.toBeInTheDocument()
  })

  it('shows expand sidebar label when collapsed', () => {
    renderSidebar({ collapsed: true })
    const toggleButton = screen.getByRole('button', { name: /expand sidebar/i })
    expect(toggleButton).toBeInTheDocument()
  })
})
