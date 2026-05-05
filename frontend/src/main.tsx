import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './i18n' // Must be imported before App
import './index.css'
import App from './App.tsx'
import { initExchangeRates } from './lib/exchangeRates'
import { BUILD_ID } from './lib/constants'

// Surface the build ID at runtime so bumping it actually changes the bundle
// content hash. Without a runtime reference, Vite tree-shakes the export
// and the bundle hash never changes — defeating the cache-bust intent.
// eslint-disable-next-line no-console
console.info(`%c[RUBLI] build ${BUILD_ID}`, 'color:#a06820;font-weight:bold')

// ─────────────────────────────────────────────────────────────────────────────
// Stale-chunk recovery
//
// Every Vite production build generates new content-hashed chunk filenames
// (e.g. Watchlist-baTb_uiZ.js). When we deploy, the old hashes are gone but
// a user's cached index.html may still reference them — so route-level
// dynamic imports 404 with "Failed to fetch dynamically imported module."
//
// The fix: catch the failure and reload the document. The reload pulls a
// fresh index.html with valid chunk hashes. Guarded by sessionStorage so
// we never enter an infinite-reload loop if the failure is real.
// ─────────────────────────────────────────────────────────────────────────────
const RELOAD_GUARD_KEY = 'rubli_chunk_reload_at'

function isChunkLoadError(message: string): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Importing a module script failed/i.test(message)
  )
}

function recoverFromChunkError(reason: string) {
  const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? '0')
  // Don't reload more than once per 30 seconds — if a fresh page still
  // fails, the issue isn't stale chunks and the user should see the error.
  if (Date.now() - last < 30_000) return false
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  console.warn(`[chunk-recovery] reloading: ${reason}`)
  window.location.reload()
  return true
}

// Vite emits this custom event for module-preload failures.
window.addEventListener('vite:preloadError', (event) => {
  recoverFromChunkError('vite:preloadError')
  event.preventDefault()
})

// Also catch unhandled rejections — dynamic-import promises that reject.
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message ?? event.reason ?? '')
  if (isChunkLoadError(msg)) {
    if (recoverFromChunkError('unhandledrejection: ' + msg.slice(0, 80))) {
      event.preventDefault()
    }
  }
})

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.05,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_GIT_COMMIT ?? 'unknown',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
    ],
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  })
}

// Kick off exchange rate fetch before first render — non-blocking.
// formatCompactMXN uses the cached value synchronously; the first render
// may use the static fallback if the fetch hasn't resolved yet, subsequent
// renders will pick up live rates once the module cache is populated.
initExchangeRates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
