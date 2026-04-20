/**
 * USDTooltip — secondary USD annotation for large MXN amounts.
 *
 * Renders a small muted label showing the real 2024 USD equivalent of
 * a historical MXN contract amount, accounting for Mexican CPI inflation.
 * Only shown for amounts >= 1M MXN where the conversion is meaningful.
 *
 * Design rules:
 *   - Secondary display only — MXN remains the primary format
 *   - Smaller text, muted color (#52525b zinc-600)
 *   - Monospace font to align with data values
 *   - Never shown below 1M MXN
 */

import { toReal2024USD, formatRealUSD } from '@/lib/currency'
import { useTranslation } from 'react-i18next'

interface USDTooltipProps {
  /** The original MXN amount */
  amountMXN: number
  /**
   * The contract year used for CPI and exchange-rate lookup.
   * Defaults to 2024 if omitted (no inflation adjustment applied).
   */
  year?: number
  /** Additional Tailwind classes */
  className?: string
}

/**
 * Renders "≈ US$67M valor real 2024" (ES) or "≈ US$67M real 2024 USD" (EN)
 * as a small muted annotation next to a MXN amount.
 *
 * Returns null for amounts below 1M MXN or when year data is unavailable.
 */
export function USDTooltip({ amountMXN, year = 2024, className }: USDTooltipProps) {
  const { i18n } = useTranslation()

  if (amountMXN < 1_000_000) return null

  const usd = toReal2024USD(amountMXN, year)
  if (usd === null) return null

  const formatted = formatRealUSD(usd)
  const label =
    i18n.language === 'es'
      ? `≈ ${formatted} valor real 2024`
      : `≈ ${formatted} real 2024 USD`

  return (
    <span
      className={`text-xs text-[#71717a] font-mono ml-1 ${className ?? ''}`}
      aria-label={i18n.language === 'es' ? `Equivalente real 2024: ${formatted}` : `Real 2024 value: ${formatted}`}
    >
      {label}
    </span>
  )
}
