/**
 * El Atlas — the index that hands off. Three scopes and one exit:
 *
 *   0. El Padrón    — PadronBand: width = contracted value, hatch = share of
 *                     the cohort's vendors in the high/critical band.
 *   1. La Cohorte   — CohortRegister: the cohort's vendors ranked by money,
 *                     published as a sibling list so /vendors/:id can step.
 *   2. El Proveedor — VendorPivots: short card + relation pivots, then the
 *                     coda to the dossier. Never a dossier itself.
 *
 * Lens (patterns · sectors · categories) and sexenio (a global time filter,
 * never a lens) live in the URL with scope/code/vendor/pin/story — one writer.
 * Plan: .claude/plans/twinkling-spinning-cerf.md. The zoomable canvas engines
 * that used to sit behind ?legacy=1 were removed 2026-09; see git history.
 *
 * (Internal symbol names — Atlas component, ATLAS_STORIES — keep the "atlas"
 * prefix; the route stays /atlas to preserve the rubli_atlas_visited_v1 flag.
 * /observatorio and /observatory redirect here — see App.tsx.)
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, X, ArrowUpRight, BookOpen, Square, RotateCcw, SkipForward, FileText } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ATLAS_STORIES, type Story, type StoryChapter } from '@/lib/atlas-stories'
import { analysisApi, atlasApi, type AtlasClusterVendorItem } from '@/api/client'
import type { ConstellationMode } from '@/components/charts/ConcentrationConstellation'
import { formatNumber, formatDualCurrency, cn } from '@/lib/utils'
import { PERIOD_API_KEY, ADMIN_DISPLAY_ACCENTED, getAdministrationByPeriodKey } from '@/lib/administrations'
// atlas-C-P1: three-pane investigator console shell
import { AtlasContextProvider } from '@/components/atlas/AtlasContext'
import { AtlasShell } from '@/components/atlas/AtlasShell'
import { PadronBand } from '@/components/atlas/PadronBand'
import { CohortRegister } from '@/components/atlas/CohortRegister'
import { VendorPivots } from '@/components/atlas/VendorPivots'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SECTORS } from '@/lib/constants'
import { PlateFrame } from '@/components/atlas/PlateFrame'
// §7 «La Carta del Cielo» — folio scaffold reinvented around the untouched scatter engine.
import { CartaMasthead } from '@/components/atlas/CartaMasthead'
import { CartaLensIndex } from '@/components/atlas/CartaLensIndex'
import { CartaItinerarios } from '@/components/atlas/CartaItinerarios'
import { CartaColofon } from '@/components/atlas/CartaColofon'

// ─────────────────────────────────────────────────────────────────────────────
// CanvasAtlasView — the plate body: PadronBand (scope 0) → CohortRegister
// (scope 1) → VendorPivots (scope 2).
// ─────────────────────────────────────────────────────────────────────────────
interface CanvasAtlasViewProps {
  mode: ConstellationMode
  pinnedCode: string | null
  lang: 'en' | 'es'
  /** Scope 1 (Sep 2026): in-page cohort register. State lives in Atlas() —
   *  not here — because `key={constellationKey}` remounts this component on
   *  every lens change, which would otherwise re-read a stale scope/code
   *  pair from the URL for the new lens. */
  scope: 'padron' | 'cohorte' | 'proveedor'
  cohortCode: string | null
  onCohortSelect: (code: string) => void
  onCohortExit: () => void
  onCohortLoaded: (info: { code: string; label: string; loaded: number; total: number }) => void
  /** Scope 2 (Sep 2026): a vendor's short card + relation pivots, opened
   *  from a CohortRegister row. Same reasoning as scope 1 for living in
   *  Atlas() rather than here. */
  vendorId: number | null
  vendorRow: AtlasClusterVendorItem | null
  onOpenVendor: (vendor: AtlasClusterVendorItem) => void
  onVendorExit: () => void
  onVendorLoaded: (info: { vendorId: number; label: string; institutions: number; coBidders: number; categories: number }) => void
  /** Sexenio global time filter (Sep 2026) — API vocabulary. */
  period: string | null
}

function CanvasAtlasView({
  mode,
  pinnedCode,
  lang,
  scope,
  cohortCode,
  onCohortSelect,
  onCohortExit,
  onCohortLoaded,
  vendorId,
  vendorRow,
  onOpenVendor,
  onVendorExit,
  onVendorLoaded,
  period,
}: CanvasAtlasViewProps) {
  // Stage 2: live per-cluster aggregates for the faithful scatter (patterns +
  // sectors). Falls back to the static meta while loading / for other lenses.
  const { data: clusterStats, isLoading: clusterStatsLoading } = useQuery({
    queryKey: ['atlas-cluster-stats', mode, period],
    queryFn: () => atlasApi.getClusterStats(mode, period ?? undefined),
    enabled: mode === 'patterns' || mode === 'sectors' || mode === 'categories',
    staleTime: 10 * 60 * 1000,
  })
  const lensLabelMap: Record<ConstellationMode, { en: string; es: string }> = {
    patterns:   { en: 'Patterns',   es: 'Patrones' },
    sectors:    { en: 'Sectors',    es: 'Sectores' },
    categories: { en: 'Categories', es: 'Categorías' },
    sexenios:   { en: 'Terms',      es: 'Sexenios' },
  }
  const lensLabel = lensLabelMap[mode]?.[lang] ?? mode

  // Scatter clusters: prefer LIVE aggregates; fall back to static meta while
  // loading or for lenses without a live endpoint (categories/sexenios).
  const scatterClusters = useMemo(() => {
    const live = clusterStats?.clusters
    if (live && live.length > 0) {
      return live.map((c) => ({
        code: c.code,
        label: lang === 'es' ? c.label_es : c.label_en,
        vendors: c.vendors,
        t1: c.t1,
        highRiskPct: c.high_risk_rate,
        totalValueMxn: c.total_value_mxn,
      }))
    }
    // Static meta carries no value, so the band cannot draw it. Live data only.
    return []
  }, [clusterStats, lang])

  // Sexenio filter (Sep 2026): resolved once, reused by padronSaldo's
  // "durante X (years)" suffix and the empty-cohort notice above.
  const periodAdmin = useMemo(() => getAdministrationByPeriodKey(period), [period])

  // § EL SALDO — computed only from what the API returns. high_risk_rate is a
  // share of VENDORS, so no peso figure is derived from it: money and heat
  // stay separate numbers.
  const padronSaldo = useMemo(() => {
    if (scatterClusters.length === 0) return null
    const total = scatterClusters.reduce((acc, c) => acc + c.totalValueMxn, 0)
    // patterns/sectors assign each vendor to ONE cohort, so the sum is a real
    // headcount; categories are many-to-many and summing would double-count.
    const vendors = mode === 'categories' ? null : scatterClusters.reduce((acc, c) => acc + c.vendors, 0)
    const widest = [...scatterClusters].sort((a, b) => b.totalValueMxn - a.totalValueMxn)[0]
    const hottest = [...scatterClusters].sort((a, b) => b.highRiskPct - a.highRiskPct)[0]
    return {
      total,
      vendors,
      widest,
      hottest,
      n: scatterClusters.length,
      widestShare: total > 0 ? (widest.totalValueMxn / total) * 100 : 0,
    }
  }, [scatterClusters])

  // A cohort slice opens the in-page register (onCohortSelect, owned by
  // Atlas()). Escape backs out one scope at a time.
  useEffect(() => {
    if (scope !== 'cohorte' && scope !== 'proveedor') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      // Scope 2 escapes back to scope 1 (the cohort), not all the way home.
      if (scope === 'proveedor') onVendorExit()
      else onCohortExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scope, onCohortExit, onVendorExit])

  return (
    <div className="relative" style={{ position: 'relative', width: '100%' }}>
      {
        scatterClusters.length === 0 && !clusterStatsLoading ? (
          <p
            className="font-mono text-[12px] text-text-muted py-10 text-center"
            style={{ letterSpacing: '0.08em' }}
          >
            {period ? (
              lang === 'es'
                ? `Sin datos para ${ADMIN_DISPLAY_ACCENTED[getAdministrationByPeriodKey(period)?.key ?? 'fox']} en esta lente.`
                : `No data for ${ADMIN_DISPLAY_ACCENTED[getAdministrationByPeriodKey(period)?.key ?? 'fox']} in this lens.`
            ) : (
              lang === 'es' ? 'Sin datos en vivo para esta lente todavía.' : 'No live data for this lens yet.'
            )}
          </p>
        ) : scope === 'proveedor' && cohortCode && vendorId ? (
          <VendorPivots
            lens={mode}
            code={cohortCode}
            cohortLabel={scatterClusters.find((c) => c.code === cohortCode)?.label ?? cohortCode}
            lensLabel={lensLabel}
            vendorId={vendorId}
            vendorRow={vendorRow}
            lang={lang}
            onGoHome={onCohortExit}
            onExitToCohort={onVendorExit}
            onVendorLoaded={onVendorLoaded}
            period={period}
          />
        ) : scope === 'cohorte' && cohortCode ? (
          <CohortRegister
            lens={mode}
            code={cohortCode}
            label={scatterClusters.find((c) => c.code === cohortCode)?.label ?? cohortCode}
            lensLabel={lensLabel}
            lang={lang}
            onGoHome={onCohortExit}
            onLoaded={(loaded, total) =>
              onCohortLoaded({
                code: cohortCode,
                label: scatterClusters.find((c) => c.code === cohortCode)?.label ?? cohortCode,
                loaded,
                total,
              })
            }
            onOpenVendor={onOpenVendor}
            period={period}
          />
        ) : (
        <>
          {padronSaldo && (
            <div className="mb-3">
              <p
                className="font-mono"
                style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
              >
                {lang === 'es' ? '§ EL SALDO' : '§ THE BALANCE'}
              </p>
              <h2
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 'clamp(1.1rem, 2vw, 1.45rem)',
                  lineHeight: 1.3,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {lang === 'es' ? (
                  <>
                    {padronSaldo.n} cohortes suman{' '}
                    <strong style={{ color: 'var(--color-accent)' }}>{formatDualCurrency(padronSaldo.total)}</strong>
                    {padronSaldo.vendors != null ? <>{' '}entre {formatNumber(padronSaldo.vendors)} proveedores</> : null}. El dinero está en {padronSaldo.widest.label}
                    {' '}({padronSaldo.widestShare.toFixed(0)}% de la banda); el calor en {padronSaldo.hottest.label}, con
                    {' '}{(padronSaldo.hottest.highRiskPct * 100).toFixed(0)}% de sus {formatNumber(padronSaldo.hottest.vendors)}
                    {' '}proveedores en alto o crítico
                    {period && periodAdmin ? <>, durante {ADMIN_DISPLAY_ACCENTED[periodAdmin.key]} ({periodAdmin.yearStart}–{periodAdmin.yearEnd}).</> : '.'}
                  </>
                ) : (
                  <>
                    {padronSaldo.n} cohorts hold{' '}
                    <strong style={{ color: 'var(--color-accent)' }}>{formatDualCurrency(padronSaldo.total)}</strong>
                    {padronSaldo.vendors != null ? <>{' '}across {formatNumber(padronSaldo.vendors)} vendors</> : null}. The money sits in {padronSaldo.widest.label}
                    {' '}({padronSaldo.widestShare.toFixed(0)}% of the band); the heat in {padronSaldo.hottest.label}, with
                    {' '}{(padronSaldo.hottest.highRiskPct * 100).toFixed(0)}% of its {formatNumber(padronSaldo.hottest.vendors)}
                    {' '}vendors high or critical
                    {period && periodAdmin ? <>, during {ADMIN_DISPLAY_ACCENTED[periodAdmin.key]} ({periodAdmin.yearStart}–{periodAdmin.yearEnd}).</> : '.'}
                  </>
                )}
              </h2>
            </div>
          )}
          <PadronBand
            clusters={scatterClusters}
            lens={mode}
            lang={lang}
            onSelect={onCohortSelect}
            spotlightCode={pinnedCode}
          />
          {/* Rule #1: entity mentions route via EntityIdentityChip. The SVG
              slices are the picture; these chips are the navigation. */}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {[...scatterClusters]
              .sort((a, b) => b.totalValueMxn - a.totalValueMxn)
              .map((c) => {
                const sector = mode === 'sectors' ? SECTORS.find((sec) => sec.code === c.code) : undefined
                if (mode === 'sectors' && !sector) return null
                return (
                  // fullName makes the chip `w-full`; the inline-flex wrapper
                  // shrinks that to content width so the legend stays one row.
                  <span key={c.code} className="inline-flex max-w-full">
                    <EntityIdentityChip
                      type={mode === 'sectors' ? 'sector' : 'pattern'}
                      id={mode === 'sectors' && sector ? sector.id : c.code}
                      name={c.label}
                      size="sm"
                      hideIcon
                      fullName
                      sectorCode={mode === 'sectors' ? c.code : null}
                    />
                  </span>
                )
              })}
          </div>
        </>
        )
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Atlas page
// ─────────────────────────────────────────────────────────────────────────────
export default function Atlas() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'
  const navigate = useNavigate()

  // Read URL params synchronously so AtlasContextProvider.initialState is correct
  // on first render. Without this, the left rail shows "Patterns" active even when
  // ?lens=sectors is in the URL (context initializes before the mount useEffect fires).
  const [mode, setMode] = useState<ConstellationMode>(() => {
    const p = new URLSearchParams(window.location.search)
    const l = p.get('lens') as ConstellationMode | null
    return (l && ['patterns', 'sectors', 'categories'].includes(l)) ? l : 'patterns'
  })
  const [pinnedCode, setPinnedCode] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search)
    return p.get('pin') || null
  })
  // V6: long-form stories (replaces brief tours). A story is paused by
  // default when the user opens it; pressing Play autoplays through chapters.
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [activeChapter, setActiveChapter] = useState<number>(0)
  const [storyPlaying, setStoryPlaying] = useState<boolean>(false)
  const [storyEnded, setStoryEnded] = useState<boolean>(false)
  const [storiesMenuOpen, setStoriesMenuOpen] = useState<boolean>(false)
  // URL-state sharing
  const [searchParams, setSearchParams] = useSearchParams()
  // Sexenio global time filter (Sep 2026) — API vocabulary
  // (fox|calderon|pena_nieto|amlo|sheinbaum), validated against
  // PERIOD_API_KEY. Orthogonal to lens/scope: changing it does NOT reset
  // atlasScope/cohortCode/vendorId.
  const [period, setPeriod] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search)
    const per = p.get('period')
    const valid = new Set(Object.values(PERIOD_API_KEY))
    return per && valid.has(per) ? per : null
  })
  // Scope 1 (Sep 2026): in-page cohort register for the faithful scatter.
  // Lives here (not in CanvasAtlasView, which is remounted via
  // key={constellationKey} on every lens change) so a lens switch can
  // reliably reset it before the remount reads the URL for the new lens.
  const [atlasScope, setAtlasScope] = useState<'padron' | 'cohorte' | 'proveedor'>(() => {
    const p = new URLSearchParams(window.location.search)
    const s = p.get('scope')
    if (s === 'proveedor' && p.get('code') && p.get('vendor')) return 'proveedor'
    if (s === 'cohorte' && p.get('code')) return 'cohorte'
    return 'padron'
  })
  const [cohortCode, setCohortCode] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search)
    const s = p.get('scope')
    return s === 'cohorte' || s === 'proveedor' ? p.get('code') : null
  })
  // Caption-only cache (label + loaded/total) reported up by CohortRegister
  // via CanvasAtlasView; null falls back to the default padron caption.
  const [cohortScopeInfo, setCohortScopeInfo] = useState<
    { code: string; label: string; loaded: number; total: number } | null
  >(null)
  // Scope 2 (Sep 2026): the vendor short card + relation pivots opened from
  // a CohortRegister row. vendorId parses from the URL on a hard reload;
  // vendorRow (the AtlasClusterVendorItem clicked) is click-time-only —
  // VendorPivots re-derives it from the cached cohort-vendors page when null.
  const [vendorId, setVendorId] = useState<number | null>(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('scope') !== 'proveedor') return null
    const n = Number(p.get('vendor'))
    return Number.isFinite(n) && n > 0 ? n : null
  })
  const [vendorRow, setVendorRow] = useState<AtlasClusterVendorItem | null>(null)
  const [vendorScopeInfo, setVendorScopeInfo] = useState<
    { vendorId: number; label: string; institutions: number; coBidders: number; categories: number } | null
  >(null)

  // Scope 1: changing lens exits the cohort register. useLayoutEffect (not
  // useEffect) so this resolves before the browser paints — CanvasAtlasView
  // remounts in the same commit as the mode change (key={constellationKey}),
  // and without this the new instance would render one frame with the old
  // cohort code against the new lens.
  const prevModeForScopeRef = useRef(mode)
  useLayoutEffect(() => {
    if (prevModeForScopeRef.current !== mode) {
      setAtlasScope('padron')
      setCohortCode(null)
      setCohortScopeInfo(null)
      setVendorId(null)
      setVendorRow(null)
      setVendorScopeInfo(null)
      prevModeForScopeRef.current = mode
    }
  }, [mode])

  // ─── STORY playback ──────────────────────────────────────────────────────
  // Each chapter applies (mode, pin) — the pin spotlights that cohort's slice
  // in PadronBand — and either auto-advances after its dwellMs (when
  // storyPlaying) or waits for the user to hit Continue. The plate stays
  // interactive during a chapter. chapter.state.year is legacy data from the
  // year-scrubber era and is ignored: sexenio is the only time filter.
  useEffect(() => {
    if (!activeStory) return
    const chapter = activeStory.chapters[activeChapter]
    if (!chapter) return
    setMode(chapter.state.mode)
    setPinnedCode(chapter.state.pinnedCode)
    setStoryEnded(false)
  }, [activeStory, activeChapter])

  // Auto-advance chapters when storyPlaying is true
  useEffect(() => {
    if (!activeStory || !storyPlaying) return
    const chapter = activeStory.chapters[activeChapter]
    if (!chapter) return
    const id = setTimeout(() => {
      if (activeChapter + 1 < activeStory.chapters.length) {
        setActiveChapter(activeChapter + 1)
      } else {
        setStoryPlaying(false)
        setStoryEnded(true)
      }
    }, chapter.dwellMs)
    return () => clearTimeout(id)
  }, [activeStory, activeChapter, storyPlaying])

  // ─── URL STATE: read params on mount, push state on change ──────────────
  // Shareable view: ?lens=sectors&period=amlo&scope=cohorte&code=salud&pin=P5&story=<id>
  // (scope=proveedor adds &vendor=<id>). lens/pin/period/scope/code/vendor are
  // also read synchronously in the useState initializers above; this effect
  // only handles ?story=.
  useEffect(() => {
    // ?story=<id> auto-launches an Observatory tour. Used by the long-form
    // /stories pages to deep-link readers from the analytical article into
    // the visual trailer. Suppresses the first-visit auto-tour if present.
    const storyId = searchParams.get('story')
    if (storyId) {
      const story = ATLAS_STORIES.find((s) => s.id === storyId)
      if (story) {
        setActiveStory(story)
        setActiveChapter(0)
        setStoryPlaying(true)
        setStoryEnded(false)
      }
    }
    // intentionally only on mount — searchParams reads should not loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync URL when state changes (debounced — avoids history spam during scrub).
  // Sole URL writer (2026-09): the undebounced replaceState effect and the
  // AtlasUrlSync/AtlasContext debounced writer were consolidated into this
  // one — three writers racing on the same params was the root cause of
  // ?story= and ?scope= getting evicted mid-session.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams()
      if (mode !== 'patterns') params.set('lens', mode)
      if (pinnedCode) params.set('pin', pinnedCode)
      // Preserve ?story= so a playing story survives lens/pin/scope writes.
      const storyParam = searchParams.get('story')
      if (storyParam) params.set('story', storyParam)
      // Scope 1/2 (Sep 2026): shareable cohort-register / vendor-pivots deep link.
      if (atlasScope === 'proveedor' && cohortCode && vendorId) {
        params.set('scope', 'proveedor')
        params.set('code', cohortCode)
        params.set('vendor', String(vendorId))
      } else if (atlasScope === 'cohorte' && cohortCode) {
        params.set('scope', 'cohorte')
        params.set('code', cohortCode)
      }
      // Sexenio filter (Sep 2026): shareable, orthogonal to scope.
      if (period) params.set('period', period)
      setSearchParams(params, { replace: true })
    }, 250)
    return () => clearTimeout(id)
  }, [mode, pinnedCode, atlasScope, cohortCode, vendorId, period, searchParams, setSearchParams])

  // V5: first-visit auto-tour. Launch "The Pharmaceutical Cartel" automatically
  // the first time a user lands on /atlas with no URL state. Subsequent visits
  // skip auto-tour. Set `rubli_atlas_visited_v1` localStorage flag once played.
  // ?story=<id> arrivals also count as "visited" — the explicit story param
  // means the reader is being deep-linked from a long-form page and the
  // auto-tour would compete with their intended story.
  // Also skip when the URL carries any state (lens, pin, scope, period…) —
  // the user has a specific view they want to restore.
  useEffect(() => {
    const VISITED_KEY = 'rubli_atlas_visited_v1'
    // D-048: read the flag synchronously from localStorage AND from the
    // current URL (not the React searchParams closure, which may not be
    // populated on the very first render). The auto-tour must fire at
    // most once per browser, never re-fire on lens/year/mode changes.
    let visited = false
    try { visited = window.localStorage.getItem(VISITED_KEY) === '1' } catch {}
    if (visited) {
      // Already visited — never auto-launch again, period.
      return
    }
    // Read URL state directly from window.location so we don't depend on
    // the router's async population of searchParams.
    const rawSearch = typeof window !== 'undefined' ? window.location.search : ''
    const hasUrlState = rawSearch.length > 1 // accounts for the leading "?"
    const liveParams = new URLSearchParams(rawSearch)
    // 2026-05-08 audit fix: on phones (<768px) the chapter card pushes the
    // constellation off-screen — suppress the first-visit auto-launch on
    // mobile; the user can still tap "Play story" explicitly. Don't set the
    // visited flag so they still get the tour when they later open the same
    // URL on desktop.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (!hasUrlState && !isMobile) {
      // Wait briefly for the page to settle before launching
      const id = setTimeout(() => {
        // V6: launch a long-form story for first-time visitors
        setActiveStory(ATLAS_STORIES[0])
        setActiveChapter(0)
        setStoryPlaying(true)
        try { window.localStorage.setItem(VISITED_KEY, '1') } catch {}
      }, 1200)
      return () => clearTimeout(id)
    }
    // Mark as visited if arriving via ?story= or any shared state
    if (liveParams.get('story') || hasUrlState) {
      try { window.localStorage.setItem(VISITED_KEY, '1') } catch {}
    }
    // intentionally only on mount — do NOT include searchParams in deps,
    // otherwise the effect re-evaluates when lens/year/mode change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live dashboard data — only the total contract count is read (CartaColofon).
  const { data: dashboard } = useQuery({
    queryKey: ['atlas', 'dashboard'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  // §7 «La Carta del Cielo» — honest plate caption. Same query key as
  // CanvasAtlasView's — React Query dedupes, so this costs no extra request.
  // The caption must count what is actually drawn.
  const { data: liveClusterStats } = useQuery({
    queryKey: ['atlas-cluster-stats', mode, period],
    queryFn: () => atlasApi.getClusterStats(mode, period ?? undefined),
    enabled: mode === 'patterns' || mode === 'sectors' || mode === 'categories',
    staleTime: 10 * 60 * 1000,
  })
  const liveClusterCount = liveClusterStats?.clusters.length ?? 0

  const cartaCaption = useMemo(() => {
    const K = liveClusterCount
    const folioLetter: Record<ConstellationMode, string> = {
      patterns: 'a', sectors: 'b', categories: 'c', sexenios: 'd',
    }
    const lensLabelMap: Record<ConstellationMode, { en: string; es: string }> = {
      patterns:   { en: 'corruption patterns',    es: 'patrones de corrupción' },
      sectors:    { en: 'federal sectors',         es: 'sectores federales' },
      categories: { en: 'spending categories',     es: 'categorías de gasto' },
      sexenios:   { en: 'presidential terms',      es: 'sexenios presidenciales' },
    }
    const isLive = mode === 'patterns' || mode === 'sectors' || mode === 'categories'
    const letter = folioLetter[mode]
    const lensLabel = lensLabelMap[mode][lang]
    // Sexenio filter (Sep 2026): honest note appended to scopes 0 and 1 only
    // (scope 2 carries its own one-line honesty caveat in VendorPivots
    // instead, since a lifetime vendor card can't be period-scoped).
    // Prefers the API's `note` (period-scoped queries only); falls back to
    // the same meaning so the caption isn't blank if `note` is absent.
    const periodNote = period
      ? (liveClusterStats?.note ?? (lang === 'en'
          ? "Vendor counts include vendors with at least one contract during this period. The risk rate reflects each vendor's lifetime risk indicator — the model is not re-run per period."
          : 'El recuento de proveedores incluye a quienes tuvieron al menos un contrato durante este periodo. La tasa de riesgo refleja el indicador de riesgo de por vida de cada proveedor — el modelo no se vuelve a correr por periodo.'))
      : ''
    // Scope 2: vendor-pivots caption, only once VendorPivots has reported in
    // for THIS vendor (same staleness guard as scope 1 below).
    if (atlasScope === 'proveedor' && cohortCode && vendorId && vendorScopeInfo && vendorScopeInfo.vendorId === vendorId) {
      const { label, institutions, coBidders, categories } = vendorScopeInfo
      return lang === 'en'
        ? `Plate IX·${letter}·${cohortCode} — ${label}: ${institutions} institutions, ${coBidders} co-bidders, ${categories} categories; amount = lifetime contracted value. Live aggregates from the register.`
        : `Lámina IX·${letter}·${cohortCode} — ${label}: ${institutions} instituciones, ${coBidders} co-licitantes, ${categories} categorías; monto = valor contratado de por vida. Agregados en vivo del padrón.`
    }
    // Scope 1: register caption, only once CohortRegister has reported in
    // for THIS cohort (guards against a stale label/count from the
    // previously viewed cohort while the new one is still loading).
    if (atlasScope === 'cohorte' && cohortCode && cohortScopeInfo && cohortScopeInfo.code === cohortCode) {
      const { label, loaded, total } = cohortScopeInfo
      return lang === 'en'
        ? `Plate IX·${letter}·${cohortCode} — register of ${loaded} of ${total} vendors in ${label}, ranked by contracted value; amount = lifetime contracted value. Live aggregates from the register.${periodNote ? ` ${periodNote}` : ''}`
        : `Lámina IX·${letter}·${cohortCode} — registro de ${loaded} de ${total} proveedores de ${label}, ordenados por valor contratado; monto = valor contratado de por vida. Agregados en vivo del padrón.${periodNote ? ` ${periodNote}` : ''}`
    }
    if (lang === 'en') {
      if (!isLive || K === 0) {
        return `Plate IX·${letter} — no live data for ${lensLabel} yet. Nothing is drawn until the register serves it; this plate carries no curated stand-ins · data cut 2025·09·28.`
      }
      return `Plate IX·${letter} — the whole band is what ${K} ${lensLabel} contracted; each slice's width is its value, and the hatch rises to the share of its vendors in the high or critical band — a vendor rate, not a peso share. Red line = that rate. Live aggregates from the register · data cut 2025·09·28.${periodNote ? ` ${periodNote}` : ''}`
    }
    if (!isLive || K === 0) {
      return `Lámina IX·${letter} — sin datos en vivo para ${lensLabel} todavía. No se dibuja nada hasta que el padrón los sirva; esta lámina no lleva sustitutos curados · corte de datos 28·09·2025.`
    }
    return `Lámina IX·${letter} — la banda completa es lo que contrataron ${K} ${lensLabel}; el ancho de cada rebanada es su valor, y el achurado sube hasta la parte de sus proveedores en alto o crítico — una tasa de proveedores, no de pesos. Línea roja = esa tasa. Agregados en vivo del padrón · corte de datos 28·09·2025.${periodNote ? ` ${periodNote}` : ''}`
  }, [mode, lang, liveClusterCount, atlasScope, cohortCode, cohortScopeInfo, vendorId, vendorScopeInfo, period, liveClusterStats])

  const handleRailStoryOpen = (storyId: string) => {
    const story = ATLAS_STORIES.find((s) => s.id === storyId)
    if (story) {
      setActiveStory(story)
      setActiveChapter(0)
      setStoryPlaying(true)
      setStoryEnded(false)
    }
  }

  return (
    <AtlasContextProvider initialState={{ lens: mode, pinnedCode }}>
      <AtlasShell
        hideLeftRail
        leftRail={null}
        center={
          // 2026-05-09: bumped max-w 1200→1680 + py-6/8→py-3/4 so the
          // constellation canvas fills more of the viewport. User
          // feedback: "make it bigger… you can barely see shit".
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-3 sm:py-4 relative">
      {/* ── folio-skin: paper-grain texture overlay ─────────────────────────
          A very low-opacity SVG fractal noise sits behind the page content
          so the entire atlas surface reads as a printed plate, not a glossy
          screen. Pointer-events:none so it never blocks interaction. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="atlas-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#atlas-paper-grain)" />
      </svg>
      {/* All page content sits above the grain overlay */}
      <div className="relative" style={{ zIndex: 1 }}>
      {/* ── Hero header ─ folio aesthetic ──────────────────────────────────
          Eyebrow becomes an archival index line: Folio·IX · Atlas of contracting.
          Headline is set as a small-caps EB Garamond display — feels
          closer to a bound atlas plate than a generic dashboard title.
          Lede sits in a narrower measure with EB Garamond regular for
          the inline emphasis tokens. */}
      {/* §7 «La Carta del Cielo»: masthead states the survey's finding (thesis
          + computed-argmax dek) instead of a static stat strip. */}
      <CartaMasthead lang={lang} />

      {/* §7 «La Carta del Cielo»: the visible PLATE INDEX (four folio-numbered,
          provenance-stamped tabs). */}
      <CartaLensIndex
        lang={lang}
        mode={mode}
        setMode={setMode}
        onStoriesOpen={() => setStoriesMenuOpen(true)}
        period={period}
        setPeriod={setPeriod}
      />

      {/* M-OBS Phase 1 (FALCO): Stories popover — anchored to the toolbar
          BookOpen icon via fixed-position overlay. State controlled by
          `storiesMenuOpen` which AtlasToolbar opens via `onStoriesOpen`. */}
      {storiesMenuOpen && (
        <>
          {/* Backdrop click-out */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setStoriesMenuOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[120px] right-6 surface-card rounded-sm shadow-2xl overflow-hidden z-30"
            style={{ border: '1px solid var(--color-border-hover)', width: 380, maxWidth: '90vw' }}
          >
              <div className="px-4 py-3 border-b border-border/50" style={{ background: 'var(--color-border)' }}>
                <div className="text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted mb-0.5">
                  {lang === 'en' ? 'INVESTIGATIVE STORIES' : 'HISTORIAS DE INVESTIGACIÓN'}
                </div>
                <div className="text-[13px] text-text-secondary leading-[1.5]">
                  {lang === 'en'
                    ? 'Multi-chapter narratives told by the constellation. Pause, explore, resume.'
                    : 'Narrativas de varios capítulos contadas por la constelación. Pausa, explora, reanuda.'}
                </div>
              </div>
              {ATLAS_STORIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveStory(s)
                    setActiveChapter(0)
                    setStoryPlaying(true)
                    setStoriesMenuOpen(false)
                    setStoryEnded(false)
                  }}
                  className="w-full text-left px-4 py-3 transition-colors block hover:bg-background-elevated/40"
                  style={{ borderBottom: '1px solid var(--color-border)', borderLeft: `3px solid ${s.accent}` }}
                >
                  <div
                    className="font-extrabold text-[16px] leading-[1.15] text-text-primary mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {s.title[lang]}
                  </div>
                  <div className="text-[12px] text-text-secondary leading-[1.5] mb-1.5">
                    {s.subtitle[lang]}
                  </div>
                  <div className="text-[13px] font-mono uppercase tracking-[0.08em] flex items-center gap-2" style={{ color: s.accent }}>
                    <span>{s.chapters.length} {lang === 'en' ? 'chapters' : 'capítulos'}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">{s.duration}</span>
                  </div>
                </button>
              ))}
              {activeStory && (
                <button
                  onClick={() => {
                    setActiveStory(null)
                    setActiveChapter(0)
                    setStoryPlaying(false)
                    setStoryEnded(false)
                    setStoriesMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-[12px] font-mono uppercase tracking-[0.1em] font-bold transition-colors"
                  style={{ background: 'var(--color-border)', color: 'var(--color-risk-critical)' }}
                >
                  <Square className="h-3 w-3 inline mr-1.5" aria-hidden="true" />
                  {lang === 'en' ? 'Close story' : 'Cerrar historia'}
                </button>
              )}
              {/* Cross-surface link into Newsroom — context-aware. When the
                  Observatory has a pattern (P1–P7) or sector pinned, deep-
                  links the Newsroom dossier with that lens pre-filtered. */}
              <button
                onClick={() => {
                  setStoriesMenuOpen(false)
                  const params = new URLSearchParams()
                  if (mode === 'patterns' && pinnedCode && /^P[1-7]$/.test(pinnedCode)) {
                    params.set('pattern', pinnedCode)
                  } else if (mode === 'sectors' && pinnedCode) {
                    params.set('sector', pinnedCode)
                  }
                  const qs = params.toString()
                  navigate(`/journalists${qs ? '?' + qs : ''}`)
                }}
                className="w-full text-left px-4 py-2.5 text-[12px] font-mono uppercase tracking-[0.1em] font-bold text-text-secondary hover:bg-background-elevated/40 transition-colors flex items-center justify-between border-t border-border/50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  {(() => {
                    if (mode === 'patterns' && pinnedCode && /^P[1-7]$/.test(pinnedCode)) {
                      return lang === 'en'
                        ? `Long-form investigations · ${pinnedCode}`
                        : `Investigaciones de fondo · ${pinnedCode}`
                    }
                    if (mode === 'sectors' && pinnedCode) {
                      return lang === 'en'
                        ? `Long-form investigations · ${pinnedCode}`
                        : `Investigaciones de fondo · ${pinnedCode}`
                    }
                    return lang === 'en'
                      ? 'All long-form investigations'
                      : 'Todas las investigaciones'
                  })()}
                </span>
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </button>
          </motion.div>
        </>
      )}

      {/* ── STORY READER — replaces brief tour narration with rich chapter UI ─── */}
      <AnimatePresence mode="wait">
        {activeStory && !storyEnded && activeStory.chapters[activeChapter] && (() => {
          const chapter: StoryChapter = activeStory.chapters[activeChapter]
          const isLastChapter = activeChapter === activeStory.chapters.length - 1
          const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X']
          const romanCh = romanNumerals[activeChapter] ?? `${activeChapter + 1}`
          return (
            <motion.div
              key={`story-${activeStory.id}-${activeChapter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="surface-card rounded-sm mb-4 overflow-hidden"
              style={{ borderLeft: `3px solid ${activeStory.accent}` }}
            >
              {/* ── Story banner (story-level chrome) ── */}
              <div
                className="px-5 py-2.5 flex items-center justify-between gap-3"
                style={{ background: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-[8px] font-mono font-bold uppercase tracking-[0.16em] flex-shrink-0"
                    style={{ color: activeStory.accent }}
                  >
                    ◆ {lang === 'en' ? 'STORY' : 'HISTORIA'}
                  </span>
                  <span className="font-mono text-[13px] text-text-primary truncate font-semibold">
                    {activeStory.title[lang]}
                  </span>
                  {/* Long-form deep-link — only when the tour has a paired
                      /stories slug. Lets the reader jump from the playing
                      tour to the analytical article without waiting for
                      the end-card. New tab so the tour state persists. */}
                  {activeStory.longformSlug && (
                    <Link
                      to={`/stories/${activeStory.longformSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8px] font-mono font-bold uppercase tracking-[0.12em] hover:opacity-80 transition-opacity"
                      style={{
                        color: activeStory.accent,
                        border: `1px solid ${activeStory.accent}55`,
                        background: `${activeStory.accent}0d`,
                      }}
                      aria-label={lang === 'en' ? 'Read the full long-form investigation in a new tab' : 'Leer la investigación completa en una pestaña nueva'}
                      title={lang === 'en' ? 'Read full investigation' : 'Leer investigación completa'}
                    >
                      <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{lang === 'en' ? 'FULL' : 'COMPLETA'}</span>
                    </Link>
                  )}
                </div>
                {/* Chapter progress dots */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {activeStory.chapters.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveChapter(i)}
                      className="rounded-full transition-all hover:opacity-90"
                      style={{
                        width: i === activeChapter ? 16 : 6,
                        height: 5,
                        background: i <= activeChapter ? activeStory.accent : 'var(--color-border-hover)',
                        cursor: 'pointer',
                      }}
                      aria-label={`${lang === 'en' ? 'Go to chapter' : 'Ir al capítulo'} ${i + 1}`}
                    />
                  ))}
                </div>
                {/* Story controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setStoryPlaying(!storyPlaying)}
                    className="p-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                    aria-label={storyPlaying ? (lang === 'en' ? 'Pause story' : 'Pausar historia') : (lang === 'en' ? 'Play story' : 'Reproducir historia')}
                    title={storyPlaying ? (lang === 'en' ? 'Pause' : 'Pausar') : (lang === 'en' ? 'Play' : 'Reproducir')}
                  >
                    {storyPlaying
                      ? <Pause className="h-3.5 w-3.5" style={{ color: activeStory.accent }} />
                      : <Play className="h-3.5 w-3.5" style={{ color: activeStory.accent }} />
                    }
                  </button>
                  <button
                    onClick={() => {
                      if (isLastChapter) { setStoryPlaying(false); setStoryEnded(true) }
                      else setActiveChapter(activeChapter + 1)
                    }}
                    className="p-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                    aria-label={lang === 'en' ? 'Next chapter' : 'Siguiente capítulo'}
                    title={lang === 'en' ? 'Next' : 'Siguiente'}
                  >
                    <SkipForward className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => { setActiveStory(null); setActiveChapter(0); setStoryPlaying(false); setStoryEnded(false) }}
                    className="p-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                    aria-label={lang === 'en' ? 'Close story' : 'Cerrar historia'}
                    title={lang === 'en' ? 'Close' : 'Cerrar'}
                  >
                    <X className="h-3.5 w-3.5 text-text-muted" />
                  </button>
                </div>
              </div>

              {/* ── Chapter content ── */}
              <div className="px-5 py-5 md:px-7 md:py-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span
                    className="font-mono font-bold uppercase tracking-[0.14em] text-[12px]"
                    style={{ color: activeStory.accent }}
                  >
                    {lang === 'en' ? 'CHAPTER' : 'CAPÍTULO'} {romanCh}
                  </span>
                  <span className="font-mono text-[12px] text-text-muted">
                    {chapter.yearLabel[lang]}
                  </span>
                </div>
                <h2
                  className="font-extrabold text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.01em] text-text-primary mb-3 text-balance"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {chapter.title[lang]}
                </h2>
                <p
                  className="text-[14px] md:text-[15px] leading-[1.7] text-text-secondary text-pretty"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {chapter.body[lang]}
                </p>

                {/* Optional pull-stat callout */}
                {chapter.pull && (
                  <div
                    className="mt-4 pt-4 border-t flex items-baseline gap-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="font-extrabold tabular-nums leading-none flex-shrink-0"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        color: activeStory.accent,
                        fontSize: 32,
                      }}
                    >
                      {chapter.pull.value[lang]}
                    </div>
                    <div className="text-[13px] font-mono text-text-muted leading-[1.5] uppercase tracking-[0.06em]">
                      {chapter.pull.caption[lang]}
                    </div>
                  </div>
                )}

                {/* Continue / autoplay hint footer */}
                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[12px] font-mono text-text-muted">
                    {storyPlaying
                      ? (lang === 'en' ? `auto-advancing in ${(chapter.dwellMs / 1000).toFixed(0)}s · pause to read & explore` : `avanza en ${(chapter.dwellMs / 1000).toFixed(0)}s · pausa para leer y explorar`)
                      : (lang === 'en' ? 'paused · click ▶ to resume or use → to advance' : 'pausado · clic ▶ para reanudar o → para avanzar')
                    }
                  </div>
                  {!isLastChapter && (
                    <button
                      onClick={() => setActiveChapter(activeChapter + 1)}
                      className="text-[12px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                      style={{ background: activeStory.accent, color: 'white' }}
                    >
                      {lang === 'en' ? 'Continue' : 'Continuar'}
                      <ArrowUpRight className="h-3 w-3 rotate-45" aria-hidden="true" />
                    </button>
                  )}
                  {isLastChapter && (
                    <button
                      onClick={() => { setStoryPlaying(false); setStoryEnded(true) }}
                      className="text-[12px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                      style={{ background: activeStory.accent, color: 'white' }}
                    >
                      {lang === 'en' ? 'End of story' : 'Fin de la historia'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* End-of-story closing card */}
        {activeStory && storyEnded && (
          <motion.div
            key={`story-end-${activeStory.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45 }}
            className="surface-card rounded-sm mb-4 overflow-hidden"
            style={{ borderLeft: `3px solid ${activeStory.accent}` }}
          >
            <div className="px-5 py-2.5" style={{ background: 'var(--color-border)' }}>
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.16em]" style={{ color: activeStory.accent }}>
                ◆ {lang === 'en' ? 'FIN' : 'FIN'} · {activeStory.title[lang]}
              </span>
            </div>
            <div className="px-5 py-6 md:px-7 md:py-7">
              <h2
                className="font-extrabold text-[26px] md:text-[34px] leading-[1.05] tracking-[-0.015em] text-text-primary mb-3 text-balance"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {activeStory.closing.headline[lang]}
              </h2>
              <p
                className="text-[14px] md:text-[15px] leading-[1.7] text-text-secondary text-pretty mb-5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {activeStory.closing.body[lang]}
              </p>
              <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/50">
                {/* Primary CTA: read the full long-form investigation. Only
                    rendered when the tour has a paired /stories slug —
                    orphan tours (e.g. covid_year) skip this affordance. */}
                {activeStory.longformSlug && (
                  <button
                    onClick={() => navigate(`/stories/${activeStory.longformSlug}`)}
                    className="text-[12px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
                    style={{ background: activeStory.accent, color: 'white' }}
                  >
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    {lang === 'en' ? 'Read the full investigation' : 'Leer la investigación completa'}
                  </button>
                )}
                <button
                  onClick={() => { setActiveChapter(0); setStoryPlaying(true); setStoryEnded(false) }}
                  className={cn(
                    'text-[12px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-colors inline-flex items-center gap-1.5',
                    activeStory.longformSlug
                      ? 'hover:bg-background-elevated/40'
                      : 'hover:opacity-90',
                  )}
                  style={
                    activeStory.longformSlug
                      ? { border: '1px solid var(--color-border)', color: activeStory.accent }
                      : { background: activeStory.accent, color: 'white' }
                  }
                >
                  <RotateCcw className="h-3 w-3" />
                  {lang === 'en' ? 'Replay' : 'Repetir'}
                </button>
                {ATLAS_STORIES.filter((s) => s.id !== activeStory.id).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStory(s); setActiveChapter(0); setStoryPlaying(true); setStoryEnded(false) }}
                    className="text-[12px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-colors hover:bg-background-elevated/40 inline-flex items-center gap-1.5"
                    style={{ border: '1px solid var(--color-border)', color: s.accent }}
                  >
                    <BookOpen className="h-3 w-3" aria-hidden="true" />
                    {s.title[lang]}
                  </button>
                ))}
                <button
                  onClick={() => { setActiveStory(null); setActiveChapter(0); setStoryPlaying(false); setStoryEnded(false) }}
                  className="text-[12px] font-mono uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-sm transition-colors hover:bg-background-elevated/40 inline-flex items-center gap-1.5 text-text-muted ml-auto"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <X className="h-3 w-3" />
                  {lang === 'en' ? 'Continue exploring' : 'Seguir explorando'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The plate ──────────────────────── */}
      <PlateFrame
        lens={mode}
        lang={lang}
        caption={cartaCaption}
        /* M-OBS Phase 1 (FALCO): suppress PlateFrame's own folio header
           strip — CartaMasthead above carries the FOLIO·IX kicker. */
        minimal
      >
        {/* omega-N: chapter strip overlay — pinned over the chart while a story is playing.
            Cites NYT "How the Virus Got Out" — the camera follows the narrative, with a
            persistent chapter indicator so the reader never loses orientation. */}
        {activeStory && !storyEnded && activeStory.chapters[activeChapter] && (
          <div
            className="absolute top-2 left-2 z-10 inline-flex items-center gap-2 rounded-sm px-2 py-1 text-[12px] font-mono uppercase tracking-[0.12em]"
            style={{
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>▶</span>
            <span className="font-bold">
              {lang === 'en' ? 'Ch' : 'Cap'} {activeChapter + 1}/{activeStory.chapters.length}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span className="truncate max-w-[280px]" style={{ color: 'var(--color-text-primary)' }}>
              {activeStory.title[lang]}
            </span>
          </div>
        )}
        {/* folio-skin: PlateFrame above gives this card investigative-folio
            chrome (corner crops, archival folio number, plate caption). */}
        <CanvasAtlasView
          key={mode}
          mode={mode}
          pinnedCode={pinnedCode}
          lang={lang}
          scope={atlasScope}
          cohortCode={cohortCode}
          onCohortSelect={(code) => {
            setAtlasScope('cohorte')
            setCohortCode(code)
            setCohortScopeInfo(null)
            setVendorId(null)
            setVendorRow(null)
            setVendorScopeInfo(null)
          }}
          onCohortExit={() => {
            setAtlasScope('padron')
            setCohortCode(null)
            setCohortScopeInfo(null)
            setVendorId(null)
            setVendorRow(null)
            setVendorScopeInfo(null)
          }}
          onCohortLoaded={setCohortScopeInfo}
          vendorId={vendorId}
          vendorRow={vendorRow}
          onOpenVendor={(vendor) => {
            setAtlasScope('proveedor')
            setVendorId(vendor.vendor_id)
            setVendorRow(vendor)
            setVendorScopeInfo(null)
          }}
          onVendorExit={() => {
            setAtlasScope('cohorte')
            setVendorId(null)
            setVendorRow(null)
            setVendorScopeInfo(null)
          }}
          onVendorLoaded={setVendorScopeInfo}
          period={period}
        />
      </PlateFrame>

      {/* §7 «La Carta del Cielo»: the itinerary shelf — the three guided routes
          surfaced as first-class discovery below the plate. */}
      <CartaItinerarios
        stories={ATLAS_STORIES}
        activeStoryId={activeStory?.id ?? null}
        onOpen={handleRailStoryOpen}
        lang={lang}
      />

      {/* §7 «La Carta del Cielo»: «Fe de carta» — the surveyor's honesty note.
          Replaces the deleted promotional footer with a method-and-limits record. */}
      <CartaColofon lang={lang} totalContracts={dashboard?.overview?.total_contracts ?? null} />

          </div>{/* /folio-skin content wrapper */}
          </div>
        }
      />
    </AtlasContextProvider>
  )
}
