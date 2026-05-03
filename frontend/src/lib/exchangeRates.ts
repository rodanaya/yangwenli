/**
 * exchangeRates.ts — Live MXN/USD exchange rate lookup.
 *
 * Fetches annual rates from /api/v1/stats/exchange-rates once at app boot,
 * caches them in a module-level variable, and provides a synchronous
 * getExchangeRate() accessor used by formatCompactMXN and other callers.
 *
 * Falls back to the static MXN_USD_RATES table from utils.ts if the fetch
 * fails (e.g. backend offline, test environment).
 */

import { MXN_USD_RATES } from './utils'

// Module-level cache populated by initExchangeRates()
let _ratesCache: Record<number, number> | null = null
let _currentRate = 20.10  // 2026 default until hydrated

/**
 * Initialize exchange rates from the API.  Call once at app boot.
 * Subsequent calls are no-ops if already fetched.
 */
export async function initExchangeRates(): Promise<void> {
  if (_ratesCache !== null) return

  try {
    const res = await fetch('/api/v1/stats/exchange-rates')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      rates: Record<string, number>
      current_year: number
      current_rate: number
    }

    const parsed: Record<number, number> = {}
    for (const [yearStr, rate] of Object.entries(data.rates)) {
      parsed[parseInt(yearStr, 10)] = rate
    }

    _ratesCache = parsed
    _currentRate = data.current_rate
  } catch {
    // Fetch failed — fall back to static table
    _ratesCache = { ...MXN_USD_RATES }
    _currentRate = MXN_USD_RATES[2025] ?? 19.50
  }
}

/**
 * Return the MXN/USD exchange rate for the given year (or current year if
 * omitted).  Uses the cached API response, falling back to static table.
 *
 * Synchronous — safe to call inside formatCompactMXN after initExchangeRates()
 * has resolved.  Before hydration, returns the module-level default.
 */
export function getExchangeRate(year?: number): number {
  if (year === undefined) {
    return _currentRate
  }

  if (_ratesCache !== null) {
    return _ratesCache[year] ?? _currentRate
  }

  // Pre-hydration fallback: use static table
  return MXN_USD_RATES[year] ?? _currentRate
}
