/**
 * Measurement hooks for any figure that draws its own glyphs.
 *
 * PARALLAX D4/D5 mechanic — "HTML owns glyphs, SVG owns geometry": a figure
 * that draws its labels inside a fixed viewBox shrinks them along with the
 * drawing (the D5 audit found 3.9px timeline labels at 390). So every figure
 * here needs its RENDERED width in px, and any label measured with canvas
 * measureText needs to be re-measured once the real faces are in.
 *
 * Lived in components/cases/ until D6b: /captura's CaptureTrajectory imported
 * it across domains while components/stories/InlineCharts.tsx carried a second,
 * incompatible copy of the same hook. One home, one implementation.
 */
import { useEffect, useState, type RefObject } from 'react'

/**
 * Rendered content width of `ref`, via ResizeObserver. 0 until the first tick;
 * callers render measured glyphs only once it is non-zero. State is written
 * only when the width actually changes (React error #301 guard).
 */
export function useMeasuredWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0)
      if (next > 0) setWidth((prev) => (prev === next ? prev : next))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

/**
 * True once the web fonts have landed. `measureLabel` uses canvas measureText,
 * and a box measured against the fallback face comes out narrow — the label
 * then renders wider than the box reserved for it (the Day 4 lesson).
 *
 * No Font Loading API (or no DOM) means nothing to wait for, so it starts
 * ready and a caller that gates on this never waits forever.
 */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(
    () => typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded',
  )
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  return ready
}
