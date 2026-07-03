/**
 * USDTooltip — hover-only USD annotation for large MXN amounts.
 *
 * Renders a small "≈$" badge. Hovering reveals the real 2024 USD equivalent.
 * Never inline — both units must never appear on the same line.
 */

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toReal2024USD, formatRealUSD } from '@/lib/currency'
import { useTranslation } from 'react-i18next'

interface USDTooltipProps {
  amountMXN: number
  year?: number
}

export function USDTooltip({ amountMXN, year = 2024 }: USDTooltipProps) {
  const { i18n } = useTranslation()

  if (amountMXN < 1_000_000) return null

  const usd = toReal2024USD(amountMXN, year)
  if (usd === null) return null

  const formatted = formatRealUSD(usd)
  const label = i18n.language.startsWith('es')
    ? `≈ ${formatted} valor real 2024`
    : `≈ ${formatted} real 2024 USD`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="text-[12px] font-mono text-text-muted cursor-help ml-1 opacity-60 hover:opacity-100 transition-opacity"
          aria-label={label}
        >
          ≈$
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-mono">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
