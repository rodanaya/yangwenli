import { render, screen, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useCountUp, useStagger, useReveal } from '../useAnimations'

// src/test/setup.ts installs a no-op IntersectionObserver globally.
// We call vi.unstubAllGlobals() after each test so stubs don't bleed.

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Build an IntersectionObserver class that fires its callback synchronously
// inside observe() so element-in-view transitions happen without async timers.
function makeImmediateIO() {
  return class MockIO {
    root = null
    rootMargin = ''
    thresholds: number[] = []
    private cb: IntersectionObserverCallback
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb
    }
    observe(target: Element) {
      this.cb(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
  }
}

// Wrapper component so the hook's ref is attached to a real DOM node.
// renderHook does not produce a DOM node — ref.current would be null —
// so the useEffect early-return guard would prevent the animation from
// ever starting.
function CountUpHarness({ target, duration = 100, decimals = 0 }: {
  target: number
  duration?: number
  decimals?: number
}) {
  const { ref, value } = useCountUp(target, duration, decimals)
  return <span ref={ref} data-testid="counter">{value}</span>
}

// ---------------------------------------------------------------------------
// useCountUp
// ---------------------------------------------------------------------------

describe('useCountUp', () => {
  it('initialises value at 0', () => {
    const { result } = renderHook(() => useCountUp(0))
    expect(result.current.value).toBe(0)
  })

  it('keeps value at 0 when target is 0 (no animation starts)', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
    const { result } = renderHook(() => useCountUp(0))
    // Effect returns early for target=0 — rAF never called
    expect(rafSpy).not.toHaveBeenCalled()
    expect(result.current.value).toBe(0)
  })

  it('returns a ref object', () => {
    const { result } = renderHook(() => useCountUp(0))
    expect(result.current.ref).toBeDefined()
    expect(typeof result.current.ref).toBe('object')
  })

  // The following three tests use real requestAnimationFrame (which jsdom
  // does run at test-speed) plus an IntersectionObserver that fires
  // immediately on observe(). We waitFor the final value rather than
  // trying to drive the rAF loop manually (which causes batching issues
  // in React 19's concurrent mode).

  it('reaches the target value after animation completes when element is in view', async () => {
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())

    render(<CountUpHarness target={42} duration={100} />)

    await waitFor(
      () => expect(screen.getByTestId('counter').textContent).toBe('42'),
      { timeout: 2000 },
    )
  })

  it('re-fires animation when target changes from 0 to a real value', async () => {
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())

    const { rerender } = render(<CountUpHarness target={0} duration={100} />)
    expect(screen.getByTestId('counter').textContent).toBe('0')

    // Transition from 0 → 500 should re-trigger the animation
    rerender(<CountUpHarness target={500} duration={100} />)

    await waitFor(
      () => expect(screen.getByTestId('counter').textContent).toBe('500'),
      { timeout: 2000 },
    )
  })

  it('handles decimal precision', async () => {
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())

    render(<CountUpHarness target={9.9} duration={100} decimals={1} />)

    // parseFloat(toFixed(1)) of 9.9 = 9.9 → toLocaleString → "9.9"
    await waitFor(
      () => expect(screen.getByTestId('counter').textContent).toBe('9.9'),
      { timeout: 2000 },
    )
  })
})

// ---------------------------------------------------------------------------
// useStagger
// ---------------------------------------------------------------------------

describe('useStagger', () => {
  it('returns an array of length count', () => {
    const { result } = renderHook(() => useStagger(5))
    expect(result.current).toHaveLength(5)
  })

  it('computes delays with default step of 80ms starting at 0', () => {
    const { result } = renderHook(() => useStagger(3))
    expect(result.current).toEqual([0, 80, 160])
  })

  it('applies baseDelay offset', () => {
    const { result } = renderHook(() => useStagger(3, 100, 50))
    expect(result.current).toEqual([100, 150, 200])
  })

  it('returns empty array for count = 0', () => {
    const { result } = renderHook(() => useStagger(0))
    expect(result.current).toEqual([])
  })

  it('is stable across re-renders when args are identical (memo hit)', () => {
    const { result, rerender } = renderHook(() => useStagger(4, 0, 80))
    const first = result.current
    rerender()
    // useMemo with same deps → same array reference
    expect(result.current).toBe(first)
  })
})

// ---------------------------------------------------------------------------
// useReveal
// ---------------------------------------------------------------------------

describe('useReveal', () => {
  it('starts with visible = false', () => {
    const { result } = renderHook(() => useReveal())
    expect(result.current.visible).toBe(false)
  })

  it('returns a ref', () => {
    const { result } = renderHook(() => useReveal())
    expect(result.current.ref).toBeDefined()
  })

  it('sets visible = true when element enters the viewport', async () => {
    vi.stubGlobal('IntersectionObserver', makeImmediateIO())

    // Wrapper component so the hook's ref is attached to a real DOM node
    function RevealHarness() {
      const { ref, visible } = useReveal()
      return (
        <div ref={ref} data-testid="reveal" data-visible={String(visible)} />
      )
    }

    await act(async () => {
      render(<RevealHarness />)
    })

    expect(
      screen.getByTestId('reveal').dataset.visible,
    ).toBe('true')
  })
})
