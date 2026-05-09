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
import { useExploreUrlSync } from '@/components/explore/useExploreUrlSync'
import { YearScrubber, RiskFloorToggle, ShareViewButton } from '@/components/explore/CanvasControls'
import { SearchOverlay } from '@/components/explore/SearchOverlay'

export function Explore() {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  return (
    <ExploreProvider>
      <ExploreInner lang={lang} />
    </ExploreProvider>
  )
}

// Sits inside the provider so useExploreState/Dispatch are valid.
function ExploreInner({ lang }: { lang: 'en' | 'es' }) {
  // 2026-05-09 Phase 3: URL state sync — focus stack survives reload
  // and is shareable. /explore?s=salud&i=251&v=29277 deep-links into
  // vendor 29277 inside IMSS inside Salud.
  useExploreUrlSync()
  return (
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
        <SearchOverlay lang={lang} />
        <RiskFloorToggle lang={lang} />
        <ShareViewButton lang={lang} />
        <YearScrubber lang={lang} />
      </div>
      {/* Briefing rail — narrower than legacy 320px → keeps map dominant */}
      <div className="hidden lg:block">
        <BriefingPanel lang={lang} />
      </div>
    </div>
  )
}

export default Explore
