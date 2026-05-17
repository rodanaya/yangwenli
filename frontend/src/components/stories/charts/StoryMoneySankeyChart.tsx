/**
 * StoryMoneySankeyChart — Editorial Sankey: the pharma triangle
 *
 * Reveals the concentration of federal health spending flowing through
 * just 3 pharmaceutical intermediaries. MXN 270B across 3,830 contracts.
 * Dark editorial aesthetic with risk-colored flows.
 */

import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { MoneySankeyChart } from '@/components/charts/MoneySankeyChart'
import { EditorialChartFrame } from '../EditorialChartFrame'

const PHARMA_FLOWS = [
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 101, target_name: 'Farmacos Especializados',
    value: 98_000_000_000, contracts: 1240, avg_risk: 0.97, high_risk_pct: 98.2,
  },
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 102, target_name: 'Maypo S.A.',
    value: 54_000_000_000, contracts: 890, avg_risk: 0.96, high_risk_pct: 97.1,
  },
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 103, target_name: 'DIMM Distribuidora',
    value: 41_000_000_000, contracts: 620, avg_risk: 0.97, high_risk_pct: 96.8,
  },
  {
    source_type: 'institution', source_id: 2, source_name: 'ISSSTE',
    target_type: 'vendor',      target_id: 101, target_name: 'Farmacos Especializados',
    value: 38_000_000_000, contracts: 480, avg_risk: 0.96, high_risk_pct: 97.4,
  },
  {
    source_type: 'institution', source_id: 2, source_name: 'ISSSTE',
    target_type: 'vendor',      target_id: 102, target_name: 'Maypo S.A.',
    value: 21_000_000_000, contracts: 310, avg_risk: 0.95, high_risk_pct: 96.0,
  },
  {
    source_type: 'institution', source_id: 3, source_name: 'INSABI / IMSS-Bienestar',
    target_type: 'vendor',      target_id: 103, target_name: 'DIMM Distribuidora',
    value: 18_000_000_000, contracts: 290, avg_risk: 0.97, high_risk_pct: 98.0,
  },
]

const TOTAL_MXN = PHARMA_FLOWS.reduce((s, f) => s + f.value, 0)
const TOTAL_CONTRACTS = PHARMA_FLOWS.reduce((s, f) => s + f.contracts, 0)

export function StoryMoneySankeyChart() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('moneySankey.kicker')}
      headline={t('moneySankey.headline')}
      lede={t('moneySankey.lede')}
      stats={[
        {
          value: `MXN ${(TOTAL_MXN / 1e9).toFixed(0)}B`,
          label: t('moneySankey.stat1Label'),
          accent: 'var(--color-risk-critical)',
        },
        {
          value: TOTAL_CONTRACTS.toLocaleString(),
          label: `${t('moneySankey.stat2LabelPrefix')} ${(TOTAL_MXN / TOTAL_CONTRACTS / 1e6).toFixed(0)}${t('moneySankey.stat2LabelSuffix')}`,
          accent: 'var(--color-risk-high)',
        },
        {
          value: t('moneySankey.stat3Value'),
          label: t('moneySankey.stat3Label'),
          accent: 'var(--color-risk-critical)',
        },
      ]}
      finding={{ label: t('moneySankey.findingLabel'), body: t('moneySankey.findingBody') }}
      footer={
        <div className="flex items-center justify-between">
          <span>{t('moneySankey.footer')}</span>
          <a
            href="/aria"
            className="flex items-center gap-1.5 text-xs text-risk-high hover:text-accent font-mono uppercase tracking-wide"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {t('moneySankey.ariaLink')}
          </a>
        </div>
      }
      tone="bare"
    >
      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <MoneySankeyChart flows={PHARMA_FLOWS} height={300} />
      </div>
    </EditorialChartFrame>
  )
}
