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
import { BriefingPanel } from '@/components/explore/BriefingPanel'
import { useExploreUrlSync } from '@/components/explore/useExploreUrlSync'
import { YearScrubber, RiskFloorToggle, ShareViewButton, LensToggle } from '@/components/explore/CanvasControls'
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
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] -mt-5 -mb-20 md:-mb-5 -mx-3 sm:-mx-5"
      style={{
        height: 'calc(100vh - var(--topbar-h, 64px))',
        gridTemplateRows: '1fr',
        background: 'var(--color-background, #faf9f6)',
      }}
    >
      {/* The map — fills available space */}
      <div className="relative overflow-hidden">
        <ExploreCanvas lang={lang} />
        <SearchOverlay lang={lang} />
        <LensToggle lang={lang} />
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
      {/* Mobile briefing drawer — slide-up bottom sheet on < lg breakpoints.
          Renders the same BriefingPanel content but as a drawer the user can
          peek (closed: 56px tab visible) or expand (open: 60vh). Touch
          devices get the entity preview that desktop lg-grid users see in
          the right rail. */}
      <MobileBriefingDrawer lang={lang} />
    </div>
  )
}

function MobileBriefingDrawer({ lang }: { lang: 'en' | 'es' }) {
  const [open, setOpen] = useState(false)
  // 2026-05-11 Gap 5: auto-open the drawer when the user drills into a
  // body. On mobile the user can't see the right-rail briefing, so the
  // first signal that "the tap did something" is the drawer sliding up.
  // We only auto-open on transitions INTO non-system focus, not on
  // hover state or system reset, and we respect a user-initiated close
  // (if you close it then drill, it opens again — but if you close it
  // and pan around without drilling, it stays closed).
  const state = useExploreState()
  const focus = useCurrentFocus(state)
  useEffect(() => {
    if (focus.kind !== 'system') setOpen(true)
    else setOpen(false)
  }, [focus.kind, focus.level, (focus as { sectorId?: number }).sectorId, (focus as { institutionId?: number }).institutionId, (focus as { vendorId?: number }).vendorId, (focus as { contractId?: number }).contractId])
  return (
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-20 transition-transform duration-300 ease-out"
      style={{
        transform: open ? 'translateY(0)' : 'translateY(calc(100% - 44px))',
        maxHeight: '60vh',
      }}
    >
      <div
        style={{
          background: 'var(--color-background-card, #fff)',
          borderTop: '1px solid var(--color-border)',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle / toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex flex-col items-center justify-center py-2 transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
          }}
          aria-label={open
            ? (lang === 'en' ? 'Collapse briefing' : 'Cerrar resumen')
            : (lang === 'en' ? 'Open briefing' : 'Abrir resumen')}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--color-border)',
              marginBottom: 6,
            }}
          />
          <div className="text-[9px] font-mono uppercase tracking-[0.18em]">
            {open
              ? (lang === 'en' ? 'tap to close' : 'tocar para cerrar')
              : (lang === 'en' ? 'briefing · tap to open' : 'resumen · tocar para abrir')}
          </div>
        </button>
        {open && (
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            <BriefingPanel lang={lang} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Explore
