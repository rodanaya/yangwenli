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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExploreProvider } from '@/components/explore/ExploreState'
import { ExploreCanvas } from '@/components/explore/ExploreCanvas'
import { BriefingPanel } from '@/components/explore/BriefingPanel'
import { useExploreUrlSync } from '@/components/explore/useExploreUrlSync'
import { YearScrubber, RiskFloorToggle, ShareViewButton } from '@/components/explore/CanvasControls'
import { SearchOverlay } from '@/components/explore/SearchOverlay'

const FIRST_VISIT_KEY = 'rubli_explore_visited_v1'

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

  // First-visit hint — one-time educational chip pointing at the canvas.
  // Auto-dismisses after 8s or on user click. Persisted via localStorage
  // (rubli_explore_visited_v1).
  const [showHint, setShowHint] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(FIRST_VISIT_KEY)) {
        setShowHint(true)
        const t = setTimeout(() => {
          setShowHint(false)
          localStorage.setItem(FIRST_VISIT_KEY, '1')
        }, 8000)
        return () => clearTimeout(t)
      }
    } catch {
      // Private mode or storage disabled — quietly skip.
    }
  }, [])
  const dismissHint = () => {
    setShowHint(false)
    try { localStorage.setItem(FIRST_VISIT_KEY, '1') } catch { /* ignore */ }
  }

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
        {showHint && (
          <button
            type="button"
            onClick={dismissHint}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 max-w-md text-left px-4 py-3 transition-opacity"
            style={{
              background: 'var(--color-background-card, #fff)',
              border: '1px solid var(--color-border)',
              borderLeft: '3px solid var(--color-accent)',
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              cursor: 'pointer',
            }}
            aria-label={lang === 'en' ? 'Dismiss hint' : 'Cerrar pista'}
          >
            <div className="text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-text-muted mb-1">
              {lang === 'en' ? 'Spatial Map · Z0 → Z3' : 'Mapa Espacial · Z0 → Z3'}
            </div>
            <div className="text-sm text-text-primary leading-snug">
              {lang === 'en'
                ? 'Click any sector to drill into its institutions, then a vendor, then a single contract.'
                : 'Haz clic en un sector para ver sus instituciones, luego un proveedor, luego un contrato.'}
            </div>
            <div className="text-[10px] text-text-muted mt-1.5 font-mono">
              {lang === 'en' ? 'esc · back · ⌘K · search' : 'esc · atrás · ⌘K · buscar'}
            </div>
          </button>
        )}
      </div>
      {/* Briefing rail — narrower than legacy 320px → keeps map dominant */}
      <div className="hidden lg:block">
        <BriefingPanel lang={lang} />
      </div>
    </div>
  )
}

export default Explore
