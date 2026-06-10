import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * useWayfindingScroll — router-aware scroll manager (EXPLORAR "El Hilo" P0).
 *
 * Replaces MainLayout's blanket `window.scrollTo(0, 0)` on every pathname
 * change, which actively defeated the browser's native back-scroll
 * restoration and dumped users at the top of the index every time they
 * returned from a dossier (diagnosis F1 — one bug, six pages).
 *
 * Behaviour by navigation type (react-router `useNavigationType`):
 *  - PUSH to a NEW pathname  → scrollTo(0, 0)   (drill-in / forward nav)
 *  - PUSH, same pathname     → leave scroll      (index filter change)
 *  - REPLACE                 → leave scroll      (URL-synced sort/filter)
 *  - POP (back / forward)    → restore the saved offset for that location
 *
 * Scroll offsets are stored per `pathname + search` in an in-memory LRU map
 * (cap 20) mirrored to sessionStorage so a same-session reload survives.
 *
 * The restore defeats the framer-motion `AnimatePresence mode="popLayout"`
 * height race (MainLayout.tsx): on POP the index remounts and animates from
 * its initial variant, so the document is short until data/charts settle.
 * We poll up to ~12 frames for `scrollHeight >= target` before scrolling,
 * then give up gracefully (land near the row; the origin-row highlight added
 * in P1/P4 covers the last few hundred px on long async ledgers).
 */

const STORE_KEY = 'rubli_wayfinding_scroll_v1'
const LRU_MAX = 20
const MAX_RESTORE_FRAMES = 12

// Module-level store so it survives route remounts within a session.
let memStore: Map<string, number> | null = null

function getStore(): Map<string, number> {
  if (memStore) return memStore
  memStore = new Map<string, number>()
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>
      for (const [k, v] of Object.entries(parsed)) memStore.set(k, v)
    }
  } catch {
    /* sessionStorage unavailable (private mode) — in-memory only */
  }
  return memStore
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(): void {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(getStore())))
    } catch {
      /* quota / unavailable — keep the in-memory map authoritative */
    }
  }, 500)
}

function saveOffset(key: string, y: number): void {
  const store = getStore()
  store.delete(key) // move-to-end keeps the map in LRU order
  store.set(key, y)
  while (store.size > LRU_MAX) {
    const oldest = store.keys().next().value
    if (oldest === undefined) break
    store.delete(oldest)
  }
  schedulePersist()
}

function readOffset(key: string): number | undefined {
  const store = getStore()
  const v = store.get(key)
  if (v !== undefined) {
    store.delete(key)
    store.set(key, v) // touch on read
  }
  return v
}

function locationKey(pathname: string, search: string): string {
  return pathname + search
}

function restoreScrollTo(target: number): void {
  if (target <= 0) {
    window.scrollTo(0, 0)
    return
  }
  let frames = 0
  const tick = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    if (maxScroll >= target || frames >= MAX_RESTORE_FRAMES) {
      window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)))
      return
    }
    frames += 1
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function useWayfindingScroll(): void {
  const location = useLocation()
  const navType = useNavigationType()
  const prevPathnameRef = useRef<string | null>(null)
  const currentKeyRef = useRef<string>(locationKey(location.pathname, location.search))

  // Keep the live key current so the scroll listener saves under the right page.
  currentKeyRef.current = locationKey(location.pathname, location.search)

  // Continuously record the current page's scroll offset (one write per frame).
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        saveOffset(currentKeyRef.current, window.scrollY)
      })
    }
    const onPageHide = () => {
      saveOffset(currentKeyRef.current, window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Decide scroll behaviour on each navigation. location.key changes on every
  // history transition (PUSH/POP/REPLACE), so this runs once per navigation.
  useLayoutEffect(() => {
    const pathChanged = prevPathnameRef.current !== location.pathname
    prevPathnameRef.current = location.pathname

    if (navType === 'POP') {
      const target = readOffset(locationKey(location.pathname, location.search))
      restoreScrollTo(target ?? 0)
    } else if (navType === 'PUSH' && pathChanged) {
      window.scrollTo(0, 0)
    }
    // REPLACE, or PUSH that only changed the query string (index filtering),
    // intentionally leave the scroll position untouched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])
}
