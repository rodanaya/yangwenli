/**
 * StoryMoneySankeyChart — Editorial Sankey: the pharma triangle
 *
 * Reveals the concentration of federal health spending flowing through
 * just 3 pharmaceutical intermediaries. MXN 270B across 3,830 contracts.
 * Dark editorial aesthetic with risk-colored flows.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { MoneySankeyChart } from '@/components/charts/MoneySankeyChart'

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {t('moneySankey.kicker')}
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('moneySankey.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('moneySankey.lede')}
      </p>

      {/* Key stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-risk-critical">
            MXN {(TOTAL_MXN / 1e9).toFixed(0)}B
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('moneySankey.stat1Label')}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-risk-high">
            {TOTAL_CONTRACTS.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {`${t('moneySankey.stat2LabelPrefix')} ${(TOTAL_MXN / TOTAL_CONTRACTS / 1e6).toFixed(0)}${t('moneySankey.stat2LabelSuffix')}`}
          </div>
        </div>
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-risk-critical">{t('moneySankey.stat3Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('moneySankey.stat3Label')}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <MoneySankeyChart flows={PHARMA_FLOWS} height={300} />
      </div>

      {/* Finding callout */}
      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          {t('moneySankey.findingLabel')}
        </p>
        <p className="text-sm text-text-secondary">
          {t('moneySankey.findingBody')}
        </p>
      </div>

      {/* Source line */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted">
          {t('moneySankey.footer')}
        </p>
        <a
          href="/aria"
          className="flex items-center gap-1.5 text-xs text-risk-high hover:text-accent font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" />
          {t('moneySankey.ariaLink')}
        </a>
      </div>
    </motion.div>
  )
}
