/**
 * StoryCommunityBubbles — honest empty-state placeholder.
 *
 * History: this component previously rendered a 22-node radial "planet +
 * moons" graph claiming to depict a vendor community detected by Louvain
 * clustering. The nodes were synthetic placeholders (V-A01 … V-F05) with
 * fabricated risk scores and value shares. Per the honest-pitch matrix
 * (CLAUDE.md) and DESIGNUS Phase 2 audit (May 2026), that visualization
 * was a fake-network rhetoric: no real edges, no real vendors, no real
 * community structure — it shipped placeholder data styled as analysis.
 *
 * Until the Louvain pipeline emits a per-story community payload (vendor
 * names, value shares, risk tier, hub institution), this component
 * renders an editorial empty-state inside the existing EditorialChartFrame
 * with a deep-link to the live `/network` surface where real community
 * detection runs.
 *
 * Replacement plan (when data lands):
 *   - Wire (vendorId, name, valueShare, risk) per row
 *   - Render with DotStrip from @/components/charts/editorial (canonical N=50)
 *   - Use formatVendorName() + EntityIdentityChip for cross-linking
 *   - Sort by valueShare desc; color by RISK_COLORS tier (no green)
 */

import { useTranslation } from 'react-i18next'
import { ExternalLink, Network } from 'lucide-react'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StoryCommunityBubbles() {
  const { t } = useTranslation('storyCharts')

  return (
    <EditorialChartFrame
      kicker={t('communityBubbles.kicker')}
      headline={t('communityBubbles.headline')}
      lede={t('communityBubbles.lede')}
      footer={
        <div className="flex items-center justify-between">
          <span>{t('communityBubbles.footer')}</span>
          <a
            href="/network"
            className="flex items-center gap-1.5 text-xs text-risk-high hover:text-accent font-mono uppercase tracking-wide"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {t('communityBubbles.exploreLink')}
          </a>
        </div>
      }
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
        <Network className="h-8 w-8 text-text-muted mb-3" aria-hidden="true" />
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-2">
          {t('communityBubbles.pendingKicker')}
        </p>
        <p className="text-sm text-text-secondary max-w-md leading-relaxed">
          {t('communityBubbles.pendingBody')}
        </p>
        <a
          href="/network"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-risk-high hover:text-accent font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {t('communityBubbles.pendingCta')}
        </a>
      </div>
    </EditorialChartFrame>
  )
}
