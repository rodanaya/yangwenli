/**
 * Explore — the spatial-nav rebuild page (docs/SPATIAL_NAV_PLAN.md).
 *
 * Replaces the failure of /atlas?z1=true. No legacy ClusterDetailPanel
 * modal, no ZoomedClusterPanel, no AtlasContext. Clean state machine in
 * ExploreState; clean canvas in ExploreCanvas; clean briefing in
 * BriefingPanel.
 *
 * Layout:
 *   ┌───────────────────────────────────────────┬────────────────┐
 *   │                                           │                │
 *   │           ExploreCanvas (the map)         │  BriefingPanel │
 *   │                                           │                │
 *   └───────────────────────────────────────────┴────────────────┘
 *
 * Goal: the map IS the page. No hero block above, no toolbar below.
 * Tools (year, risk floor, search) are floated as overlays inside the
 * canvas surface — Phase 2 work; today the canvas is just the bodies.
 */
import { useTranslation } from 'react-i18next'
import { ExploreProvider } from '@/components/explore/ExploreState'
import { ExploreCanvas } from '@/components/explore/ExploreCanvas'
import { BriefingPanel } from '@/components/explore/BriefingPanel'

export function Explore() {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  return (
    <ExploreProvider>
      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_320px]"
        style={{
          height: 'calc(100vh - var(--topbar-h, 64px))',
          background: 'var(--color-background, #faf9f6)',
        }}
      >
        {/* The map — fills available space */}
        <div className="relative overflow-hidden">
          <ExploreCanvas lang={lang} />
        </div>

        {/* Briefing rail — narrower than legacy 320px → keeps map dominant */}
        <div className="hidden lg:block">
          <BriefingPanel lang={lang} />
        </div>
      </div>
    </ExploreProvider>
  )
}

export default Explore
