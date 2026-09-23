import { describe, it, expect } from 'vitest'
import { placeLabels, measureLabel, type LabelCandidate } from '@/lib/plateLabels'

const BOUNDS = { x0: 0, y0: 0, x1: 400, y1: 200 }

const candidate = (over: Partial<LabelCandidate> & Pick<LabelCandidate, 'id' | 'x' | 'y'>): LabelCandidate => ({
  width: 80,
  height: 14,
  above: 10,
  ...over,
})

describe('placeLabels', () => {
  it('drops the second of two overlapping candidates', () => {
    const placed = placeLabels(
      [candidate({ id: 'a', x: 200, y: 100 }), candidate({ id: 'b', x: 205, y: 102 })],
      [],
      BOUNDS,
    )
    expect(placed.map((p) => p.id)).toEqual(['a'])
  })

  it('seats both when they do not overlap', () => {
    const placed = placeLabels(
      [candidate({ id: 'a', x: 90, y: 100 }), candidate({ id: 'b', x: 300, y: 100 })],
      [],
      BOUNDS,
    )
    expect(placed.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('re-anchors a candidate that would cross the right bound instead of dropping it', () => {
    const placed = placeLabels([candidate({ id: 'edge', x: 395, y: 100 })], [], BOUNDS)
    expect(placed).toHaveLength(1)
    expect(placed[0].align).toBe('right')
    expect(placed[0].box.x1).toBeLessThanOrEqual(BOUNDS.x1)
    expect(placed[0].box.x0).toBeGreaterThanOrEqual(BOUNDS.x0)
  })

  it('re-anchors against the left bound too', () => {
    const placed = placeLabels([candidate({ id: 'edge', x: 4, y: 100 })], [], BOUNDS)
    expect(placed).toHaveLength(1)
    expect(placed[0].align).toBe('left')
    expect(placed[0].box.x0).toBeGreaterThanOrEqual(BOUNDS.x0)
  })

  it('never places over a pre-placed obstacle', () => {
    const obstacle = { x0: 150, y0: 70, x1: 260, y1: 95 }
    const placed = placeLabels([candidate({ id: 'a', x: 200, y: 100 })], [obstacle], BOUNDS)
    expect(placed).toHaveLength(0)
  })

  it('falls back to a placement below the mark before giving up', () => {
    const obstacle = { x0: 150, y0: 70, x1: 260, y1: 95 }
    const placed = placeLabels(
      [candidate({ id: 'a', x: 200, y: 100, below: 10 })],
      [obstacle],
      BOUNDS,
    )
    expect(placed).toHaveLength(1)
    expect(placed[0].y).toBeGreaterThan(100)
  })

  it('keeps every seated label inside the bounds', () => {
    const placed = placeLabels(
      [
        candidate({ id: 'a', x: 5, y: 20 }),
        candidate({ id: 'b', x: 395, y: 20 }),
        candidate({ id: 'c', x: 200, y: 190, below: 8 }),
      ],
      [],
      BOUNDS,
    )
    for (const p of placed) {
      expect(p.box.x0).toBeGreaterThanOrEqual(BOUNDS.x0)
      expect(p.box.x1).toBeLessThanOrEqual(BOUNDS.x1)
      expect(p.box.y0).toBeGreaterThanOrEqual(BOUNDS.y0)
      expect(p.box.y1).toBeLessThanOrEqual(BOUNDS.y1)
    }
  })
})

describe('measureLabel', () => {
  it('reports one line when the text fits', () => {
    const m = measureLabel('SHORT', '11px monospace', 400, 14)
    expect(m.lines).toBe(1)
    expect(m.height).toBe(14)
    expect(m.width).toBeGreaterThan(0)
  })

  it('wraps to a taller box capped at maxWidth', () => {
    const m = measureLabel('NABORS PERFORACIONES DE MEXICO SA DE CV', '11px monospace', 80, 14)
    expect(m.lines).toBeGreaterThan(1)
    expect(m.width).toBeLessThanOrEqual(80)
    expect(m.height).toBe(m.lines * 14)
  })
})
