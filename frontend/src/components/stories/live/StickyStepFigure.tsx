/**
 * StickyStepFigure — the stepped-figure scrolly, shared by the story variants.
 *
 * SD-01 built this inside `HeroChapter` for the `el-vacio` blackout diagram and
 * left a note: "if a second story needs the same mechanic it earns its own
 * file; one caller does not." SD-02's 36-month line is the second caller, and
 * it lives in a `standard` chapter rather than the hero, so the mechanic moved
 * here unchanged.
 *
 * What is shared is the beat and the frame, not the prose. Each variant renders
 * its own paragraphs — the hero with a drop cap and a pull-quote, `standard`
 * with source superscripts — and only registers them with the hook. Pulling the
 * paragraphs in here too would mean passing both variants' layouts back out
 * again, which is more code than it saves.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * useProseStage — drive a figure's beat from which paragraph the reader is on.
 *
 * The figure sticks at the top of the chapter and steps as each paragraph
 * crosses the middle 20% of the viewport. `-40% 0px -40%` is that band.
 *
 * `enabled` is false below `lg`, where the figure is not sticky and stepping a
 * drawing the reader has already scrolled past would be noise: the caller pins
 * the last beat instead.
 */
export function useProseStage(count: number, enabled: boolean, maxStage: number) {
  const [stage, setStage] = useState(enabled ? 0 : maxStage)
  const nodes = useRef<(HTMLElement | null)[]>([])

  const register = useCallback((el: HTMLElement | null, i: number) => {
    nodes.current[i] = el
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStage(maxStage)
      return
    }
    const els = nodes.current.slice(0, count).filter(Boolean) as HTMLElement[]
    if (!els.length || typeof IntersectionObserver === 'undefined') {
      setStage(maxStage)
      return
    }
    const visible = new Set<number>()
    // Nothing in the band: either the chapter is still below the reader (beat
    // 0) or they have scrolled past it, in which case the drawing stays
    // finished rather than snapping back to blank.
    const settleOutOfBand = () => {
      if (visible.size) return
      const first = els[0].getBoundingClientRect()
      setStage(first.top > window.innerHeight * 0.6 ? 0 : maxStage)
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = els.indexOf(e.target as HTMLElement)
          if (i < 0) continue
          if (e.isIntersecting) visible.add(i)
          else visible.delete(i)
        }
        if (visible.size) setStage(Math.min(Math.max(...visible) + 1, maxStage))
        else settleOutOfBand()
      },
      { rootMargin: '-40% 0px -40% 0px' },
    )
    els.forEach((el) => io.observe(el))

    // A jump — a chapter-nav anchor, a restored scroll position, back-to-top —
    // can move the reader from past the chapter to above it without any
    // observed paragraph crossing the band, so the observer never fires and
    // the beat would stay stale. This settles it. While a paragraph IS in the
    // band, which is the whole time the chapter is being read, it costs one
    // Set lookup and reads no layout.
    let raf = 0
    const onScroll = () => {
      if (visible.size || raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        settleOutOfBand()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [enabled, count, maxStage])

  return { stage, register }
}

/**
 * The sticky frame the stepped figure sits in — the 760 figure column, pinned
 * below the site header at `lg` and in normal flow below it.
 */
export function StickyStepFrame({ stage, children }: { stage: number; children: ReactNode }) {
  return (
    <div
      data-stage={stage}
      // `py-2` is load-bearing, not spacing: without padding the figure's own
      // vertical margin collapses through this div, so the margin band sits
      // OUTSIDE the background box and the prose scrolls visibly through it
      // while the figure is stuck.
      className="max-w-[760px] mx-auto px-4 sm:px-0 py-2 bg-background lg:sticky lg:top-24 lg:z-10"
    >
      {children}
    </div>
  )
}
