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
    <div className="space-y-2.5">
      {displayList.map((v, i) => {
        const pct = Math.min(100, (v.total_mxn / maxTotal) * 100)
        const formattedName = formatVendorName(v.name, 60)
        const riskScore = v.risk_pct > 1 ? v.risk_pct / 100 : v.risk_pct
        return (
          // Single row — name (flex, absorbs the slack) · bar · value. The bar
          // and value cluster on the right at a fixed width, so there's no dead
          // gutter between a short left-aligned bar and a far-right value.
          <div key={v.vendor_id ?? i} className="group flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {v.vendor_id != null ? (
                <EntityIdentityChip
                  type="vendor"
                  id={v.vendor_id}
                  name={v.name}
                  size="xs"
                  riskScore={riskScore}
                  className="min-w-0"
                />
              ) : (
                <span className="text-xs font-medium text-text-primary truncate block" title={v.name}>
                  {formattedName}
                </span>
              )}
              <div className="text-[13px] text-text-muted mt-0.5">
                <span className="font-mono tabular-nums">{v.contracts.toLocaleString()}</span> {t('vendorSection.contracts')} &middot; <span className="font-mono tabular-nums">{v.risk_pct.toFixed(0)}%</span> {t('vendorSection.riskScore')}
              </div>
            </div>
            <DotBar
              value={pct}
              max={100}
              color={eraColorResolved}
              emptyColor="var(--color-background-elevated)"
              emptyStroke="var(--color-border)"
              dots={20}
              dotR={3}
              dotGap={8}
            />
            <span className="font-mono tabular-nums text-xs text-text-muted shrink-0 w-[78px] text-right">
              {formatCompactMXN(v.total_mxn)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
