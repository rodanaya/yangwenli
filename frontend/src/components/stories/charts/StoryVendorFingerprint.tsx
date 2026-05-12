/**
 * StoryVendorFingerprint — Editorial: the anatomy of a suspect vendor
 *
 * HEMOSER's SHAP fingerprint as a Nightingale rose. The dominant petal is
 * same_day_count — 12 cardiac contracts awarded in a single day to the
 * same vendor, a textbook threshold-splitting pattern.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import VendorFingerprintChart from '@/components/charts/VendorFingerprintChart'

const HEMOSER_SHAP = {
  price_volatility:      0.62,
  price_ratio:           0.41,
  vendor_concentration:  0.88,
  network_member_count:  0.19,
  same_day_count:        1.24,
  single_bid:            0.53,
  ad_period_days:        0.28,
  institution_diversity: -0.14,
}

export function StoryVendorFingerprint() {
  const { t } = useTranslation('storyCharts')
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline with risk pill */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
          {t('vendorFingerprint.kicker')}
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1
                        bg-risk-critical/10 border border-red-500/20 text-xs text-risk-critical">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          {t('vendorFingerprint.criticalPill')}
        </div>
      </div>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('vendorFingerprint.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('vendorFingerprint.ledePrefix')}{' '}
        <span className="text-risk-critical font-mono font-bold">0.94</span>{' '}
        {t('vendorFingerprint.ledeSuffix')}
      </p>

      {/* SHAP factor callouts */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t('vendorFingerprint.factor1Label'), value: '+1.24', color: 'text-risk-critical', note: t('vendorFingerprint.factor1Note') },
          { label: t('vendorFingerprint.factor2Label'), value: '+0.88', color: 'text-risk-critical', note: t('vendorFingerprint.factor2Note') },
          { label: t('vendorFingerprint.factor3Label'), value: '+0.62', color: 'text-orange-400', note: t('vendorFingerprint.factor3Note') },
          { label: t('vendorFingerprint.factor4Label'), value: '-0.14', color: 'text-teal-400', note: t('vendorFingerprint.factor4Note') },
        ].map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-background-card p-2.5 text-center">
            <div className={`text-lg font-mono font-bold ${f.color}`}>{f.value}</div>
            <div className="text-[9px] text-text-muted uppercase tracking-wide mt-0.5">{f.label}</div>
            <div className="text-[9px] text-text-muted mt-0.5">{f.note}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4 flex justify-center">
        <VendorFingerprintChart
          shapValues={HEMOSER_SHAP}
          riskScore={0.94}
          vendorName="HEMOSER"
          size={300}
          showLabels={true}
          animate={true}
        />
      </div>

      {/* Reading guide */}
      <div className="rounded-sm border border-border bg-background-card p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-text-muted mb-1">
          {t('vendorFingerprint.readGuideLabel')}
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('vendorFingerprint.readGuidePrefix')}
          <strong className="text-risk-critical">{t('vendorFingerprint.readGuideRedLabel')}</strong>{t('vendorFingerprint.readGuideRedSuffix')}
          <strong className="text-teal-400">{t('vendorFingerprint.readGuideTealLabel')}</strong>{t('vendorFingerprint.readGuideTealSuffix')}
        </p>
      </div>

      {/* Investigation hook */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted">
          {t('vendorFingerprint.footer')}
        </p>
        <a
          href="/aria"
          className="flex items-center gap-1.5 text-xs text-risk-high hover:text-accent font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" />
          {t('vendorFingerprint.ariaLink')}
        </a>
      </div>
    </motion.div>
  )
}
