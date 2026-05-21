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
import {
  ExploreProvider,
  useCurrentFocus,
  useExploreState,
} from '@/components/explore/ExploreState'
import { ExploreCanvas } from '@/components/explore/ExploreCanvas'
import { useExploreUrlSync } from '@/components/explore/useExploreUrlSync'
import { YearScrubber } from '@/components/explore/CanvasControls'

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
  const exploreState = useExploreState()
  const exploreFocus = useCurrentFocus(exploreState)
  const isPanelOpen = exploreFocus.level > 0

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

  // Briefing rail killed at all Z levels (2026-05-20): every Z-level now
  // carries its own breadcrumb + kicker + headline + sort toggle + footer
  // link via ZPrimitives. The 280px right rail was duplicating the
  // breadcrumb + sector context the new chrome already provides. Single
  // column at every level → more room for the editorial register.
  return (
    <div
      className="grid grid-cols-1 -mt-5 -mb-20 md:-mb-5 -mx-3 sm:-mx-5"
      style={{
        height: 'calc(100vh - var(--topbar-h, 64px) - var(--footer-h, 56px))',
        gridTemplateRows: '1fr',
        background: 'var(--color-background, #faf9f6)',
      }}
    >
      {/* The map — fills available space */}
      <div className="relative overflow-hidden">
        <ExploreCanvas lang={lang} />
        {isPanelOpen && <YearScrubber lang={lang} />}
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
              {lang === 'en' ? 'El Panorama · Z0 → Z3' : 'El Panorama · Z0 → Z3'}
            </div>
            <div className="text-sm text-text-primary leading-snug">
              {lang === 'en'
                ? 'Click any sector to drill into its institutions, then a vendor, then a single contract.'
                : 'Haz clic en un sector para ver sus instituciones, luego un proveedor, luego un contrato.'}
            </div>
            <div className="text-[10px] text-text-muted mt-1.5 font-mono">
              {lang === 'en' ? 'esc · back · Ctrl+K · search' : 'esc · atrás · Ctrl+K · buscar'}
            </div>
          </button>
        )}
      </div>
      {/* Briefing rail removed — Z0 treemap + Z1-Z4 embedded chrome carry
          all the context that used to live here. */}
      {/* MobileBriefingDrawer removed (2026-05-20): the Z1 redesign carries
          its own breadcrumb + kicker + pull-line + footer link, so the
          bottom-sheet drawer was rendering duplicate chrome that visually
          collided with the new panel. Z2/Z3 keep their own embedded
          headers until Steps 3/4 of the Z1-Z4 redesign rebuild them. */}
    </div>
  )
}

export default Explore
