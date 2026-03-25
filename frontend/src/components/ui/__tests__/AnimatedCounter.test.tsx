import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { AnimatedCounter } from '../AnimatedCounter'

// src/test/setup.ts installs a no-op IntersectionObserver globally.
// Tests that need to simulate viewport entry override it locally.

afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: build an IntersectionObserver class that fires the callback
// synchronously inside observe() so we don't need async timers.
function makeImmediateIO() {
  return class MockIO {
    static callback: IntersectionObserverCallback | null = null
    root = null
    rootMargin = ''
    thresholds = []
    constructor(cb: IntersectionObserverCallback) {
      MockIO.callback = cb
    }
    observe(target: Element) {
      MockIO.callback?.(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
  }
}

describe('AnimatedCounter', () => {
  it('renders prefix and suffix around the number', () => {
    render(<AnimatedCounter value={0} prefix="$" suffix=" MXN" />)
    const span = screen.getByText(/\$0 MXN/)
    expect(span).toBeInTheDocument()
  })

  it('renders suffix alone without prefix', () => {
    render(<AnimatedCounter value={0} suffix="M" />)
    const span = screen.getByText(/0M/)
    expect(span).toBeInTheDocument()
  })

  it('renders prefix alone', () => {
    render(<AnimatedCounter value={0} prefix="MXN " />)
    const span = screen.getByText(/MXN 0/)
    expect(span).toBeInTheDocument()
  })

  it('shows "0" when value is 0 (no animation)', () => {
    // value=0 → the effect returns early, current state stays 0
    render(<AnimatedCounter value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('applies className to the span element', () => {
    const { container } = render(
      <AnimatedCounter value={0} className="test-class" />,
    )
    expect(container.querySelector('span.test-class')).not.toBeNull()
  })

  it('starts animating when element enters viewport and shows target value', async () => {
    // Replace global IntersectionObserver with one that fires immediately
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())

    // Replace rAF so the animation settles in a single frame
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        // Pass a timestamp larger than duration (1500ms default) so
        // progress === 1 on the first callback → animation completes
        cb(999999)
        return 1
      }),
    )

    await act(async () => {
      render(<AnimatedCounter value={1000} duration={100} />)
    })

    expect(screen.getByText('1,000')).toBeInTheDocument()
  })

  it('re-animates when value prop changes from a non-zero value', async () => {
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        cb(999999)
        return 1
      }),
    )

    const { rerender } = await act(async () =>
      render(<AnimatedCounter value={500} duration={100} />),
    )
    expect(screen.getByText('500')).toBeInTheDocument()

    await act(async () => {
      rerender(<AnimatedCounter value={999} duration={100} />)
    })

    expect(screen.getByText('999')).toBeInTheDocument()
  })

  it('formats decimals correctly using decimals prop', async () => {
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        cb(999999)
        return 1
      }),
    )

    await act(async () => {
      render(<AnimatedCounter value={3.14159} decimals={2} />)
    })

    // toFixed(2) of 3.14159 → "3.14"
    expect(screen.getByText('3.14')).toBeInTheDocument()
  })
})
