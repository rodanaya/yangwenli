/**
 * Explore — the spatial-nav rebuild page (docs/SPATIAL_NAV_PLAN.md).
 *
 * Replaces the failure of /atlas?z1=true. No legacy ClusterDetailPanel
 * modal, no ZoomedClusterPanel, no AtlasContext. Clean state machine in
 * ExploreState; clean canvas in ExploreCanvas.
 *
 * Layout: ExploreCanvas (the map) fills the page — single column.
 * (BriefingPanel rail killed 2026-05-20; file culled 2026-06-12.)
 *
 * Goal: the map IS the page. No hero block above, no toolbar below.
 *
 * 2026-06-12 (El Padrón Vivo, W2): orientation became recallable — the
 * first-visit hint chip gained quiet continuation exits and a persistent
 * `?` glyph at Z0 re-opens it; SearchOverlay (built 2026-05, never
 * mounted) now mounts here, so Ctrl+K finally does what the hint always
 * promised: search that drills the map without leaving it.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ExploreProvider,
  useCurrentFocus,
  useExploreState,
} from '@/components/explore/ExploreState'
import { ExploreCanvas, SEARCH_KBD } from '@/components/explore/ExploreCanvas'
import { SearchOverlay } from '@/components/explore/SearchOverlay'
import { useExploreUrlSync } from '@/components/explore/useExploreUrlSync'

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
  const atZ0 = exploreFocus.level === 0

  // First-visit hint — educational chip pointing at the canvas. Auto-
  // dismisses after 8s on first visit, and is RECALLABLE forever after via
  // the `?` glyph (the one-shot-then-never behavior was W2).
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

  const hintExits: Array<{ to: string; en: string; es: string }> = [
    { to: '/dashboard', en: 'Dashboard', es: 'Panel' },
    { to: '/cases', en: 'Cases', es: 'Casos' },
    { to: '/aria', en: 'Watchlist', es: 'Lista de Vigilancia' },
  ]

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
        {/* In-surface search — typeahead that drills the focus stack
            without leaving the page (Ctrl+K, capture-phase). */}
        <SearchOverlay lang={lang} />
        {/* Provenance microline — Archetype-C tools carry their colophon as a
            fixed-chrome microline (charter §C∞ / invariant #18) instead of a
            ProvenanceFooter, since the map is full-viewport. Non-interactive
            (pointer-events-none) so it never blocks pan/drill. (The 28px
            YearScrubber strip it used to dodge was culled 2026-06-12 — it
            dispatched into state nothing read and occluded the panel exits.) */}
        <div
          className="absolute left-3 z-[1] font-mono text-[9px] uppercase tracking-[0.16em] text-text-muted pointer-events-none select-none"
          style={{ bottom: 8, opacity: 0.7 }}
        >
          {lang === 'en'
            ? 'BUILT BY RUBLI · DATA: COMPRANET 2002–2025'
            : 'CONSTRUIDO POR RUBLI · DATOS: COMPRANET 2002–2025'}
        </div>
        {/* Recallable guide glyph — Z0 only (deeper levels carry their own
            breadcrumb + chrome). Re-opens the hint chip; never one-shot. */}
        {atZ0 && !showHint && (
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="absolute bottom-4 right-4 z-10 flex items-center justify-center font-mono transition-colors hover:opacity-80"
            style={{
              width: 24,
              height: 24,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              background: 'var(--color-background-card, #fff)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            aria-label={lang === 'en' ? 'Show map guide' : 'Mostrar guía del mapa'}
          >
            ?
          </button>
        )}
        {showHint && (
          <div
            role="dialog"
            aria-label={lang === 'en' ? 'Map guide' : 'Guía del mapa'}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 max-w-md text-left px-4 py-3"
            style={{
              background: 'var(--color-background-card, #fff)',
              border: '1px solid var(--color-border)',
              borderLeft: '3px solid var(--color-accent)',
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-text-muted mb-1">
                {lang === 'en' ? 'The big picture · Z0 → Z4' : 'El panorama · Z0 → Z4'}
              </div>
              <button
                type="button"
                onClick={dismissHint}
                className="font-mono text-[11px] leading-none text-text-muted hover:text-text-primary transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label={lang === 'en' ? 'Dismiss hint' : 'Cerrar pista'}
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-text-primary leading-snug">
              {lang === 'en'
                ? 'Click any sector to drill into its institutions, then a vendor, then a single contract.'
                : 'Haz clic en un sector para ver sus instituciones, luego un proveedor, luego un contrato.'}
            </div>
            <div className="text-[10px] text-text-muted mt-1.5 font-mono">
              {lang === 'en'
                ? `esc · back · ${SEARCH_KBD} · search this map`
                : `esc · atrás · ${SEARCH_KBD} · buscar en el mapa`}
            </div>
            {/* Quiet continuation exits — orientation paths live inside the
                recallable chip, costing zero permanent vertical. */}
            <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                {lang === 'en' ? 'Continue:' : 'Continúe:'}
              </span>
              {hintExits.map((x) => (
                <Link
                  key={x.to}
                  to={x.to}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--color-accent)' }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--color-text-secondary)' }}
                >
                  {lang === 'en' ? x.en : x.es}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Briefing rail removed — Z0 treemap + Z1-Z4 embedded chrome carry
          all the context that used to live here. */}
    </div>
  )
}

export default Explore
