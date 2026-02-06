import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState, NoResultsState, ErrorState, ComingSoonState } from '../components/EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No data" description="Nothing to show" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.getByText('Nothing to show')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const onAction = vi.fn()
    render(<EmptyState title="Error" actionLabel="Retry" onAction={onAction} />)
    const button = screen.getByText('Retry')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when no actionLabel provided', () => {
    render(<EmptyState title="No data" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not render action button when no onAction provided', () => {
    render(<EmptyState title="No data" actionLabel="Click me" />)
    // Both actionLabel AND onAction are required for the button to render
    expect(screen.queryByText('Click me')).not.toBeInTheDocument()
  })
})

describe('NoResultsState', () => {
  it('renders with entity name', () => {
    render(<NoResultsState entityName="contracts" />)
    expect(screen.getByText('No contracts found')).toBeInTheDocument()
  })

  it('shows clear filters button when hasFilters is true', () => {
    const onClear = vi.fn()
    render(<NoResultsState entityName="vendors" hasFilters onClearFilters={onClear} />)
    expect(screen.getByText('Clear all filters')).toBeInTheDocument()
  })

  it('does not show clear filters button when hasFilters is false', () => {
    render(<NoResultsState entityName="vendors" />)
    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders with title and custom message', () => {
    render(<ErrorState message="Something broke" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('shows network error help text when message is Network Error', () => {
    render(<ErrorState message="Network Error" />)
    expect(screen.getByText(/Unable to connect to server/)).toBeInTheDocument()
  })

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Error" onRetry={onRetry} />)
    const button = screen.getByText('Try again')
    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('ComingSoonState', () => {
  it('renders feature name in title', () => {
    render(<ComingSoonState featureName="Advanced Analytics" />)
    expect(screen.getByText('Advanced Analytics Coming Soon')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<ComingSoonState featureName="Test Feature" />)
    expect(screen.getByText(/currently under development/)).toBeInTheDocument()
  })
})
