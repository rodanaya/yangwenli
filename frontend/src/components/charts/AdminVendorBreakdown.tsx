import { formatCompactMXN } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatVendorName } from '@/lib/vendor/formatName'
import type { ColorToken } from '@/components/charts/editorial'

interface AdminVendorEntry {
  name: string
  total_mxn: number
  contracts: number
  risk_pct: number  // 0-100
  /** Optional vendor id — when present, name renders as <EntityIdentityChip>. */
  vendor_id?: number | string | null
}

interface Props {
  vendors: AdminVendorEntry[]
  /**
   * Era accent. Prefer a `ColorToken` ('sector-educacion', 'oecd', …) so the
   * DotBar resolves through the design-token system; raw hex strings remain
   * accepted as a legacy fallback for callers still passing palette literals.
   */
  eraColor: ColorToken | string
  loading?: boolean
}

export function AdminVendorBreakdown({ vendors, eraColor, loading }: Props) {
  const { t } = useTranslation('administrations')

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!vendors?.length) {
    return (
      <div className="text-sm text-text-muted py-4 text-center">
        {t('vendorSection.noData')}
      </div>
    )
  }

  const maxTotal = vendors[0]?.total_mxn ?? 1
  const displayList = vendors.slice(0, 10)

  // Resolve eraColor: ColorToken → CSS var; raw hex / var() string passes through.
  const eraColorResolved = /^[a-z][a-z0-9-]*$/i.test(eraColor) && !eraColor.startsWith('#') && !eraColor.startsWith('var(')
    ? `var(--color-${eraColor})`
    : eraColor

  return (
    <div className="space-y-2">
      {displayList.map((v, i) => {
        const pct = Math.min(100, (v.total_mxn / maxTotal) * 100)
        const formattedName = formatVendorName(v.name, 60)
        const riskScore = v.risk_pct > 1 ? v.risk_pct / 100 : v.risk_pct
        return (
          <div key={v.vendor_id ?? i} className="group">
            <div className="flex items-center justify-between text-xs mb-0.5 gap-2">
              {v.vendor_id != null ? (
                <EntityIdentityChip
                  type="vendor"
                  id={v.vendor_id}
                  name={v.name}
                  size="xs"
                  riskScore={riskScore}
                  className="min-w-0 flex-1"
                />
              ) : (
                <span
                  className="font-medium text-text-primary truncate"
                  title={v.name}
                >
                  {formattedName}
                </span>
              )}
              <span className="font-mono tabular-nums text-text-muted ml-2 shrink-0">
                {formatCompactMXN(v.total_mxn)}
              </span>
            </div>
            <DotBar
              value={pct}
              max={100}
              color={eraColorResolved}
              emptyColor="var(--color-background-elevated)"
              emptyStroke="var(--color-border)"
              dots={30}
              dotR={3}
              dotGap={8}
            />
            <div className="text-xs text-text-muted mt-0.5">
              <span className="font-mono tabular-nums">{v.contracts.toLocaleString()}</span> {t('vendorSection.contracts')} &middot; <span className="font-mono tabular-nums">{v.risk_pct.toFixed(0)}%</span> {t('vendorSection.riskScore')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
