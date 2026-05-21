/**
 * CanvasConstellation — Pass 1 smoke test.
 *
 * jsdom does not implement Canvas 2D fully, so we mock getContext to a stub.
 * The intent here is "mounts without throwing" + "imperative refs wire up".
 * Visual + interaction testing belongs in Storybook / Playwright (Pass 2).
 */
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { createRef } from 'react'
import {
  CanvasConstellation,
  type ConstellationDot,
  type ConstellationCluster,
  type FlyToClusterFn,
  type ResetViewFn,
} from '../components/atlas/CanvasConstellation'

beforeAll(() => {
  // jsdom Canvas stub — covers the 2d methods the engine touches.
  const ctxStub = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ctxStub)
  // ResizeObserver stub
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('CanvasConstellation', () => {
  it('mounts with empty dots/clusters', () => {
    const { getByTestId } = render(
      <div style={{ width: 400, height: 300 }}>
        <CanvasConstellation lang="en" dots={[]} clusters={[]} />
      </div>
    )
    expect(getByTestId('canvas-constellation')).toBeInTheDocument()
  })

  it('mounts with a few dots and clusters', () => {
    const dots: ConstellationDot[] = [
      { id: 'a', x: 0.3, y: 0.4, riskLevel: 'critical', name: 'ACME', riskScore: 0.82 },
      { id: 'b', x: 0.6, y: 0.5, riskLevel: 'high', clusterCode: 'P1' },
      { id: 'c', x: 0.8, y: 0.2, riskLevel: 'low' },
    ]
    const clusters: ConstellationCluster[] = [
      { code: 'P1', label: 'Monopoly', fx: 0.5, fy: 0.5, color: '#dc2626' },
    ]
    const { getByTestId } = render(
      <div style={{ width: 800, height: 540 }}>
        <CanvasConstellation lang="en" dots={dots} clusters={clusters} />
      </div>
    )
    expect(getByTestId('canvas-constellation')).toBeInTheDocument()
  })

  it('wires imperative refs', () => {
    const flyRef = createRef<FlyToClusterFn | null>() as React.MutableRefObject<FlyToClusterFn | null>
    flyRef.current = null
    const resetRef = createRef<ResetViewFn | null>() as React.MutableRefObject<ResetViewFn | null>
    resetRef.current = null
    render(
      <div style={{ width: 400, height: 300 }}>
        <CanvasConstellation
          lang="en"
          dots={[]}
          clusters={[{ code: 'P1', label: 'X', fx: 0.5, fy: 0.5, color: '#dc2626' }]}
          flyToClusterRef={flyRef}
          resetViewRef={resetRef}
        />
      </div>
    )
    expect(typeof flyRef.current).toBe('function')
    expect(typeof resetRef.current).toBe('function')
  })
})
