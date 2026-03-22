/**
 * DataQualityWarning — context-appropriate data quality notices
 * Extracted from MoneyFlow.tsx's getYearWarning() pattern.
 *
 * Shows a warning banner for COMPRANET data structures A (pre-2010) and B (2010-2017).
 * Returns null for 2018+ (structures C/D — acceptable quality).
 */

import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataQualityWarningProps {
  /** Single year to check */
  year?: number
  /** Range — shows warning if any part of the range falls in a lower-quality structure */
  yearMin?: number
  yearMax?: number
  className?: string
}

interface WarningInfo {
  level: 'error' | 'warning'
  structure: string
  rfcCoverage: string
  message: string
}

function getWarning(year: number): WarningInfo | null {
  if (year < 2010) {
    return {
      level: 'error',
      structure: 'A',
      rfcCoverage: '0.1%',
      message:
        `Data quality for ${year} is lowest (Structure A, 0.1% RFC coverage). ` +
        `Vendor identity matching is unreliable — the same company may appear as multiple nodes. ` +
        `Risk scores may be underestimated. Treat all findings as directional only.`,
    }
  }
  if (year < 2018) {
    return {
      level: 'warning',
      structure: 'B',
      rfcCoverage: '15.7%',
      message:
        `${year} data has ~15.7% RFC coverage (Structure B). ` +
        `Some vendors appear under multiple name variants; true concentration may be higher than shown.`,
    }
  }
  return null
}

function getWarningForRange(yearMin?: number, yearMax?: number): WarningInfo | null {
  if (yearMin == null && yearMax == null) return null
  // Check lower bound first (worst quality wins)
  const low = yearMin ?? yearMax!
  return getWarning(low)
}

export function DataQualityWarning({ year, yearMin, yearMax, className }: DataQualityWarningProps) {
  let warning: WarningInfo | null = null

  if (year != null) {
    warning = getWarning(year)
  } else {
    warning = getWarningForRange(yearMin, yearMax)
  }

  if (!warning) return null

  const isError = warning.level === 'error'
  const Icon = isError ? AlertTriangle : Info

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 rounded border-l-2 px-3 py-2 text-xs',
        isError
          ? 'border-amber-500 bg-amber-950/30 text-amber-300'
          : 'border-yellow-600/60 bg-yellow-950/20 text-yellow-300/80',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        <span className="font-semibold">
          {isError ? `Structure ${warning.structure} data (${warning.rfcCoverage} RFC coverage)` : `Note`}:{' '}
        </span>
        {warning.message}
      </span>
    </div>
  )
}

export default DataQualityWarning
