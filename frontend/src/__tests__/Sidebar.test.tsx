import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '../components/layout/Sidebar'

// Sidebar uses Tooltip from radix, which needs a TooltipProvider in collapsed mode.
// We test in expanded mode to avoid that complexity.

function renderSidebar(props: { collapsed?: boolean; onToggle?: () => void } = {}) {
  const defaultProps = { collapsed: false, onToggle: vi.fn(), ...props }
  return render(
    <MemoryRouter>
      <Sidebar {...defaultProps} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders navigation items when expanded', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Contracts')).toBeInTheDocument()
    expect(screen.getByText('Vendors')).toBeInTheDocument()
    expect(screen.getByText('Institutions')).toBeInTheDocument()
    expect(screen.getByText('Sectors')).toBeInTheDocument()
  })

  it('renders brand text when expanded', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('YANG WEN-LI')).toBeInTheDocument()
    expect(screen.getByText('INTEL PLATFORM')).toBeInTheDocument()
  })

  it('renders section headers when expanded', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('RECON')).toBeInTheDocument()
    expect(screen.getByText('ANALYSIS')).toBeInTheDocument()
    expect(screen.getByText('INVESTIGATION')).toBeInTheDocument()
  })

  it('renders analysis nav items', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Risk Analysis')).toBeInTheDocument()
    expect(screen.getByText('Price Analysis')).toBeInTheDocument()
    expect(screen.getByText('Data Quality')).toBeInTheDocument()
    expect(screen.getByText('Export Data')).toBeInTheDocument()
  })

  it('renders investigation nav items', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('Network Graph')).toBeInTheDocument()
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
    expect(screen.getByText('Comparison')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn()
    renderSidebar({ onToggle })
    // The toggle button has aria-label "Collapse sidebar" when expanded
    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
    fireEvent.click(toggleButton)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('hides brand text when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText('YANG WEN-LI')).not.toBeInTheDocument()
    expect(screen.queryByText('INTEL PLATFORM')).not.toBeInTheDocument()
  })

  it('hides section headers when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText('RECON')).not.toBeInTheDocument()
    expect(screen.queryByText('ANALYSIS')).not.toBeInTheDocument()
    expect(screen.queryByText('INVESTIGATION')).not.toBeInTheDocument()
  })

  it('shows expand sidebar label when collapsed', () => {
    renderSidebar({ collapsed: true })
    const toggleButton = screen.getByRole('button', { name: /expand sidebar/i })
    expect(toggleButton).toBeInTheDocument()
  })
})
