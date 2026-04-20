/**
 * currency.ts — Real 2024 USD conversion utilities
 *
 * Methodology:
 *   1. Adjust MXN amount to 2024 MXN using Mexican CPI (INEGI, base 2018=100)
 *   2. Convert 2024 MXN → 2024 USD using the 2024 annual average exchange rate
 *
 * This gives a purchasing-power equivalent in 2024 USD, meaningful for
 * comparing 2003 contracts with 2024 contracts across the 23-year dataset.
 *
 * Data sources:
 *   - Exchange rates: Banxico annual averages
 *   - CPI: INEGI (Índice Nacional de Precios al Consumidor, base 2018=100)
 */

// Annual average MXN/USD exchange rates (Banxico)
const MXN_USD_RATE: Record<number, number> = {
  2000: 9.46,  2001: 9.34,  2002: 9.66,  2003: 10.79, 2004: 11.29,
  2005: 10.90, 2006: 10.90, 2007: 10.93, 2008: 13.16, 2009: 13.51,
  2010: 12.64, 2011: 12.43, 2012: 13.17, 2013: 12.77, 2014: 13.29,
  2015: 15.87, 2016: 18.66, 2017: 18.91, 2018: 19.24, 2019: 19.26,
  2020: 21.49, 2021: 20.27, 2022: 20.12, 2023: 17.16, 2024: 17.20,
  2025: 19.80,
}

// Mexican CPI Index (INEGI, base 2018=100)
const MX_CPI: Record<number, number> = {
  2000: 43.0,  2001: 45.5,  2002: 47.5,  2003: 49.8,  2004: 52.0,
  2005: 54.6,  2006: 56.4,  2007: 58.5,  2008: 63.5,  2009: 65.4,
  2010: 68.0,  2011: 71.6,  2012: 74.6,  2013: 78.0,  2014: 81.6,
  2015: 84.5,  2016: 86.0,  2017: 91.4,  2018: 100.0, 2019: 103.6,
  2020: 106.5, 2021: 113.5, 2022: 126.1, 2023: 134.2, 2024: 139.0,
  2025: 143.5,
}

const BASE_YEAR = 2024
const BASE_CPI = MX_CPI[BASE_YEAR]       // 139.0
const BASE_RATE = MXN_USD_RATE[BASE_YEAR] // 17.20

/**
 * Convert a historical MXN amount to real 2024 USD.
 *
 * Steps:
 *   amount_2024_mxn = amount × (MX_CPI_2024 / MX_CPI_year)
 *   amount_2024_usd = amount_2024_mxn / EXCHANGE_RATE_2024
 *
 * Returns null if year data is unavailable.
 */
export function toReal2024USD(amountMXN: number, year: number): number | null {
  const cpi = MX_CPI[year]
  const rate = MXN_USD_RATE[year]
  if (!cpi || !rate) return null

  const amount2024MXN = amountMXN * (BASE_CPI / cpi)
  return amount2024MXN / BASE_RATE
}

/**
 * Format a 2024 USD amount compactly.
 * Examples: 1_200_000_000 → "US$1.2B", 67_000_000 → "US$67M", 5_000 → "US$5K"
 */
export function formatRealUSD(amount2024USD: number): string {
  if (amount2024USD >= 1e12) return `US$${(amount2024USD / 1e12).toFixed(1)}T`
  if (amount2024USD >= 1e9)  return `US$${(amount2024USD / 1e9).toFixed(1)}B`
  if (amount2024USD >= 1e6)  return `US$${(amount2024USD / 1e6).toFixed(0)}M`
  if (amount2024USD >= 1e3)  return `US$${(amount2024USD / 1e3).toFixed(0)}K`
  return `US$${Math.round(amount2024USD)}`
}

/**
 * Full label for display.
 * Returns null if year data is unavailable or amount is below 1M MXN.
 *
 * Examples:
 *   ES: "≈ US$67M valor real 2024"
 *   EN: "≈ US$67M real 2024 USD"
 */
export function realUSDLabel(
  amountMXN: number,
  year: number,
  lang: string = 'es',
): string | null {
  if (amountMXN < 1_000_000) return null
  const usd = toReal2024USD(amountMXN, year)
  if (usd === null) return null

  const formatted = formatRealUSD(usd)
  return lang === 'es'
    ? `≈ ${formatted} valor real 2024`
    : `≈ ${formatted} real 2024 USD`
}
