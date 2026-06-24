import { useEffect, useState } from 'react'

/**
 * useIsMobile — true when the viewport is at or below a phone-width breakpoint.
 *
 * The default 767px matches the `md:hidden` boundary used by MobileBottomNav, so
 * the mobile-native layouts (compact register cards, etc.) switch in lockstep
 * with the bottom navigation bar — one mental model for "what is mobile".
 *
 * SSR / first-paint safe: reads matchMedia synchronously when available so the
 * first render already picks the right layout (no desktop→mobile flash), and
 * falls back to `false` where matchMedia is absent.
 */
export function useIsMobile(maxWidth = 767): boolean {
  const query = `(max-width: ${maxWidth}px)`
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return isMobile
}
