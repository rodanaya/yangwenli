import { cn, formatCompactMXN } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

interface AdminVendorEntry {
  name: string
  total_mxn: number
  contracts: number
  risk_pct: number  // 0-100
}

interface Props {
  vendors: AdminVendorEntry[]
  eraColor: string
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

  return (
    <div className="space-y-2">
      {vendors.map((v, i) => {
        const pct = Math.min(100, (v.total_mxn / maxTotal) * 100)
        const riskOpacity = 0.3 + (v.risk_pct / 100) * 0.7
        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span
                className={cn('font-medium text-text-primary truncate max-w-[60%]')}
                title={v.name}
              >
                {v.name}
              </span>
              <span className="text-text-muted ml-2 shrink-0">
                {formatCompactMXN(v.total_mxn)}
              </span>
            </div>
            <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: eraColor, opacity: riskOpacity }}
              />
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {v.contracts.toLocaleString()} {t('vendorSection.contracts')} &middot; {v.risk_pct.toFixed(0)}% {t('vendorSection.riskScore')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
