/**
 * Dashboard (/dashboard) — the RUBLI executive briefing, Folio·I.
 *
 * Composition (top to bottom):
 *   masthead (eyebrow + Print, dateline, h1 with two accent spans, byline, lede)
 *   § 1 El Atlas (lens toggle + the shared ObservatoryScatter + «Open full Atlas»)
 *   MacroArc (Folio·III) · lead-time advantage (Folio·IV)
 *   headline numbers — four chapter tiles I–IV (Folio·V)
 *   what the analysis found — four FINDING cards
 *   pesos at risk (Folio·VI) · where the money goes (Folio·VII)
 *   § 2 La Lente — the Cascade Ledger + GT anchor band (Folio·VIII)
 *   documented cases seismograph (Folio·IX) · recent critical alerts wire
 *   «Start Here» CTA · § Adónde ir coda · credibility colophon
 *
 * All data blocks load from one bundled request (useExecutiveData).
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryState, parseAsStringLiteral } from 'nuqs'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Printer, ArrowUpRight, Shield, Clock } from 'lucide-react'
import { formatCompactMXN, formatNumber, formatCompactUSD } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { SECTOR_COLORS, RISK_COLORS, RISK_TEXT_COLORS, getSectorTextColor, SECTORS, GROUND_TRUTH_CASE_COUNT_FALLBACK, GROUND_TRUTH_VENDOR_COUNT_FALLBACK } from '@/lib/constants'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { type ConstellationMode } from '@/components/charts/ConcentrationConstellation'
import { ObservatoryScatter } from '@/components/atlas/ObservatoryScatter'
import { useScatterClusters } from '@/lib/atlas/useScatterClusters'
import { useExecutiveData } from '@/hooks/useExecutiveData'
import { MacroArc } from '@/components/dashboard/MacroArc'
import { CaseTimeline } from '@/components/executive/CaseTimeline'
import { LeadTimeChart } from '@/components/executive/LeadTimeChart'
import { TopCategoriesChart } from '@/components/executive/TopCategoriesChart'
import { PesosAtRiskChart } from '@/components/executive/PesosAtRiskChart'
import { ChapterTiles } from '@/components/executive/ChapterTiles'
import { CaptureLeaders } from '@/components/executive/CaptureLeaders'

const MotionLink = motion.create(Link)

const ATLAS_LENSES = ['patterns', 'sectors', 'categories', 'sexenios'] as const satisfies readonly ConstellationMode[]

export default function Executive() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  // § 1 The Atlas — constellation mode (PATRONES / SECTORES / SEXENIOS)
  // The lens lives in the URL (?lens=) so /dashboard?lens=sectors deep-links;
  // the default stays out of the URL (clearOnDefault).
  const [atlasMode, setAtlasMode] = useQueryState(
    'lens',
    parseAsStringLiteral(ATLAS_LENSES).withDefault('patterns').withOptions({ history: 'replace', clearOnDefault: true }),
  )

  // All 6 Dashboard data blocks in ONE cached, server-side-concurrent request
  // via /executive/dashboard-bundle (was 6 separate calls fanning out on
  // mount). Each block falls back to null/empty per-section; bundleLoading /
  // bundleError drive the page-level loading + error chrome.
  const {
    dashboard,
    recentCritical,
    ariaStats,
    executiveSummary,
    caseStats,
    captureLeaders: captureLeadersData,
    isLoading: bundleLoading,
    isError: bundleError,
  } = useExecutiveData()
  const gtCaseCount = executiveSummary?.ground_truth?.cases ?? GROUND_TRUTH_CASE_COUNT_FALLBACK

  const stats = useMemo(() => {
    const d = dashboard
    const totalContracts = d?.overview?.total_contracts ?? 3_058_286
    const totalValue = d?.overview?.total_value_mxn ?? 9_881_000_000_000
    const rd = Array.isArray(d?.risk_distribution) ? d!.risk_distribution : []
    const highCriticalCount =
      rd.reduce(
        (sum, r) =>
          r.risk_level === 'critical' || r.risk_level === 'high' ? sum + (r.count ?? 0) : sum,
        0,
      ) || 337_693
    const highCriticalRate =
      totalContracts > 0
        ? Math.round((highCriticalCount / totalContracts) * 1000) / 10
        : 11.01
    // Value-at-risk = summed MXN through high+critical contracts, sourced from
    // the precomputed `overview.high_risk_value_mxn` (the "backend high_risk_value
    // field that doesn't exist yet" now exists — added with the M3v2 sector VaR
    // work). Replaces the old count-share × spend approximation, which understated
    // it ~5× (its uniform-value assumption is wrong — high-risk contracts skew
    // large). Now consistent with the /sectors Exposure Ledger total (~5.5T).
    // Fallback ≈55.9% of spend matches the real share when the bundle is absent.
    const valueAtRisk = d?.overview?.high_risk_value_mxn ?? totalValue * 0.559
    const valueAtRiskPct =
      totalValue > 0 ? Math.round((valueAtRisk / totalValue) * 1000) / 10 : 55.9
    return {
      totalContracts,
      totalValue,
      highCriticalRate,
      valueAtRisk,
      valueAtRiskPct,
      highCriticalCount,
    }
  }, [dashboard])

  const handlePrint = () => window.print()

  // ─── § · ADÓNDE IR — coda exit-ramp chips, computed from ALREADY-FETCHED
  //     bundle data only (no new API calls). The charter requires ≥2 navigable
  //     EntityIdentityChips drawn from the cross-link graph. We resolve:
  //       · top critical sector (executiveSummary.sectors, by high+ share)
  //       · top exposed vendor (executiveSummary.top_vendors, by indicador)
  //       · a second vendor from the live critical wire (recentCritical)
  //     Each chip carries a real navigable id, so every coda link routes to a
  //     live dossier. Case chips are intentionally omitted: the on-page case
  //     payload (ground_truth.case_details) has no slug/id to route on. ───
  const codaChips = useMemo(() => {
    // Top critical sector — highest high+critical share, mapped code → numeric
    // dossier id via the canonical SECTORS table.
    const sectorsList = executiveSummary?.sectors ?? []
    const topSector = sectorsList
      .filter((s) => s.code && s.code !== 'otros')
      .slice()
      .sort((a, b) => (b.high_plus_pct ?? 0) - (a.high_plus_pct ?? 0))[0]
    const topSectorId = topSector
      ? SECTORS.find((s) => s.code === topSector.code)?.id ?? null
      : null

    // Top exposed vendor by indicador de riesgo (avg_risk).
    const vendorsList = executiveSummary?.top_vendors ?? []
    const topVendor = vendorsList
      .slice()
      .sort((a, b) => (b.avg_risk ?? 0) - (a.avg_risk ?? 0))[0]

    // Second vendor from the live critical wire — first entry with a vendor_id
    // distinct from topVendor so the two chips never collide.
    const wireVendor = recentCritical.find(
      (c) => typeof c.vendor_id === 'number' && c.vendor_id !== topVendor?.id,
    )

    return {
      sector: topSector && topSectorId
        ? { id: topSectorId, code: topSector.code, name: topSector.name }
        : null,
      vendor: topVendor && typeof topVendor.id === 'number'
        ? { id: topVendor.id, name: topVendor.name, riskScore: topVendor.avg_risk }
        : null,
      wireVendor: wireVendor
        ? { id: wireVendor.vendor_id as number, name: wireVendor.vendor_name ?? '', riskScore: wireVendor.risk_score ?? undefined }
        : null,
    }
  }, [executiveSummary, recentCritical])

  // Coda renders only when at least two navigable chips resolved — the charter
  // floor. Below that, the existing CTA + credibility strip remain the exit.
  const codaChipCount =
    (codaChips.sector ? 1 : 0) +
    (codaChips.vendor ? 1 : 0) +
    (codaChips.wireVendor ? 1 : 0)

  // § 1 The Observatory — faithful-scatter cluster data (live per-cluster
  // aggregates with static-meta fallback), shared with /atlas via the hook so
  // both surfaces render the identical map.
  const { clusters: scatterClusters, isLoading: scatterLoading } = useScatterClusters(atlasMode, lang)

  // § 1 The Atlas — click navigation: each mode opens the right page
  const handleAtlasClusterClick = (clusterCode: string) => {
    if (atlasMode === 'patterns') {
      navigate(`/clusters#${clusterCode}`)
    } else if (atlasMode === 'sectors') {
      navigate(`/sectors?sector=${clusterCode}`)
    } else if (atlasMode === 'categories') {
      navigate(`/sectors?view=categories&category=${clusterCode}`)
    } else {
      navigate('/administrations')
    }
  }

  // ─── Headline numbers — each tile has a unique editorial micro-viz ──────
  // Localized: Spanish uses "billones" for 10¹² and "MDP" for millions.
  const TOTAL_SPEND_MXN = 9_900_000_000_000
  const headlineSpend = lang === 'es' ? '9.9 billones' : '9.9T'
  // English-only USD companion — surfaces foreign-reader scale alongside MXN.
  // Spanish stays MXN-only (Mexican audience reads pesos natively).
  const headlineSpendUSD = lang === 'en' ? `≈${formatCompactUSD(TOTAL_SPEND_MXN)}` : null
  // Per-tile descriptors below are inlined into the editorial cards JSX
  // so they can each have a distinctive micro-visualization and layout.

  return (
    <>
      {/* Print-only styles: hide sidebar and chrome */}
      <style>{`
        @media print {
          aside, nav, header, [data-sidebar], [role="navigation"], .no-print {
            display: none !important;
          }
          body, html { background: #ffffff !important; }
          .executive-page { padding: 0 !important; max-width: 100% !important; }
          .executive-page .print-hide { display: none !important; }
          .executive-page * { box-shadow: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div data-frame className="executive-page max-w-[1010px] mx-auto px-4 sm:px-6 py-6 sm:py-8 relative">
        {/* ─── E0 folio-v1-P1b: page-scoped paper-grain overlay ───────────────
            SVG fractalNoise at opacity 0.045, multiply blend, ochre tint.
            Pointer-events:none so it never blocks interaction. Content sits
            above via z-index. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 print-hide"
          style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
        >
          <filter id="executive-paper-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#executive-paper-grain)" />
        </svg>
        <div className="relative" style={{ zIndex: 1 }}>
        {/* ─── E1 folio-v1-P1b: Header / Dateline (folio aesthetic) ─── */}
        <motion.header
          className="mb-7"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start justify-between mb-4 print-hide">
            {/* Eyebrow — IBM Plex Mono 0.18em archival index pattern */}
            <div
              className="flex items-center gap-3"
              style={{
                fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                fontWeight: 400,
              }}
            >
              <span style={{ color: 'var(--color-accent-hover)', fontStyle: 'normal', fontWeight: 500 }}>Folio·I</span>
              <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
              <span style={{ fontStyle: 'normal', fontWeight: 300 }}>
                {lang === 'en' ? 'RUBLI executive briefing' : 'RUBLI reporte ejecutivo'}
              </span>
            </div>
            <button
              onClick={handlePrint}
              type="button"
              className="min-h-6 rounded-sm inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              aria-label={lang === 'en' ? 'Print this page' : 'Imprimir esta página'}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'en' ? 'Print / PDF' : 'Imprimir / PDF'}
            </button>
          </div>

          {/* Dateline anchors to the frozen data horizon (Sep 28 2025), not
              new Date() — the upstream COMPRANET feed froze there and the model
              is fixed at v0.8.5. A live today's-date implied a freshness the
              data doesn't have (same neutralization applied across the June QA
              sweep; the global masthead clock keeps showing "today"). */}
          <div className="text-[13px] font-mono text-text-muted mb-4">
            {lang === 'en' ? 'Data through Sep 2025' : 'Datos hasta sep 2025'}
            {' · '}
            {lang === 'en' ? 'Mexico Federal Procurement Analysis' : 'Análisis de Contratación Federal México'}
          </div>

          {/* Headline — EB Garamond 500, ochre/red normal-weight accents.
              Left / ragged-right with text-balance, like every headline on the
              site (PARALLAX D2c measure directive: justified text is banned —
              it opened word gaps on desktop, flagged in the Day-1 sweep). */}
          <h1
            className="text-[36px] sm:text-[52px] md:text-[64px] leading-[0.98] text-text-primary mb-4 text-balance"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              letterSpacing: '-0.012em',
            }}
          >
            {/* Accents inherit the (upright-in-italic broke the glyph
                rhythm and read as misaligned) and never wrap mid-phrase. */}
            {lang === 'en' ? (
              <>
                Twenty-three years.{' '}
                <span style={{ fontWeight: 600, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>MX$9.9 trillion</span>
                {' '}in federal contracts. More than{' '}
                <span style={{ fontWeight: 600, color: 'var(--color-risk-critical)', whiteSpace: 'nowrap' }}>7 in 10</span>
                {' '}bypass competitive bidding.
              </>
            ) : (
              <>
                Veintitrés años.{' '}
                <span style={{ fontWeight: 600, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>MX$9.9 billones</span>
                {' '}en contratos federales. Más de{' '}
                <span style={{ fontWeight: 600, color: 'var(--color-risk-critical)', whiteSpace: 'nowrap' }}>7 de cada 10</span>
                {' '}evitan la licitación competitiva.
              </>
            )}
          </h1>

          {/* Dateline — publisher + data provenance, archival mono */}
          <p
            className="mb-6"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
              fontStyle: 'normal',
            }}
          >
            {lang === 'en'
              ? 'Built by RUBLI · Data: COMPRANET 2002–2025 · Updated May 2026 · Model v0.8.5'
              : 'Por RUBLI · Datos: COMPRANET 2002–2025 · Actualizado may 2026 · Modelo v0.8.5'}
          </p>

          {/* Live-data status — the whole page loads from ONE bundled request
              (useExecutiveData). While it resolves the sections show reference
              figures; this pill signals loading, and on failure tells the
              reader the figures are reference values (graceful per-section
              fallback, never a blank page). */}
          {(bundleLoading || bundleError) && (
            <div
              role="status"
              aria-live="polite"
              className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-mono uppercase tracking-[0.12em]"
              style={{ color: bundleError ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
            >
              <span
                aria-hidden="true"
                className={bundleLoading ? 'animate-pulse' : ''}
                style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }}
              />
              {bundleError
                ? (lang === 'en' ? 'Live data unavailable — reference figures shown' : 'Datos en vivo no disponibles — se muestran cifras de referencia')
                : (lang === 'en' ? 'Loading live data…' : 'Cargando datos en vivo…')}
            </div>
          )}

          {/* Lede — EB Garamond regular 17px / 1.55. Spans the full content
              column (no 68ch cap) so the paragraph extends across the width
              instead of leaving a large empty gutter on its right. */}
          <p
            className="text-pretty"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.55,
              color: 'var(--color-text-secondary, var(--color-text-muted))',
              letterSpacing: '0.005em',
            }}
          >
            {lang === 'en'
              ? <>
                  Every administration since 2001 has bypassed competitive procurement at
                  {' '}<em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>two to three times the OECD recommended ceiling</em>.
                  This is not an aberration — it is the structural condition of Mexican federal spending.
                  RUBLI analyzed <em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>{formatNumber(stats.totalContracts)} contracts</em> across 23 years,
                  trained its risk model on <em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>{gtCaseCount.toLocaleString('en-US')} documented corruption cases</em> — Segalmex, Odebrecht, IMSS Ghost, COVID emergency procurement, and more —
                  and now flags <em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>{formatNumber(stats.highCriticalCount)} contracts</em> matching those patterns.
                  {' '}These are investigation signals, not verdicts.
                </>
              : <>
                  Cada administración desde 2001 ha evitado la licitación competitiva a
                  {' '}<em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>dos o tres veces el límite recomendado por la OCDE</em>.
                  No es una anomalía — es la condición estructural del gasto federal mexicano.
                  RUBLI analizó <em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>{formatNumber(stats.totalContracts)} contratos</em> en 23 años,
                  entrenó su modelo de riesgo en <em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>{gtCaseCount.toLocaleString('es-MX')} casos documentados</em> — Segalmex, Odebrecht, Fantasmas IMSS, emergencia COVID y más —
                  y ahora señala <em style={{ fontStyle: 'normal', color: 'var(--color-text-primary)' }}>{formatNumber(stats.highCriticalCount)} contratos</em> con esas huellas.
                  {' '}Son señales de investigación, no veredictos.
                </>
            }
          </p>
        </motion.header>

        {/* ─── § 1 The Atlas — every contract clustered into one view ─── */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          aria-labelledby="atlas-title"
        >
          <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
            <h2 id="atlas-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? '§ 1 · The Atlas — every contract in one view' : '§ 1 · El Atlas — cada contrato en una vista'}
            </h2>

            {/* Mode toggle */}
            <div
              className="flex items-center text-[13px] font-mono uppercase tracking-[0.1em] rounded-sm overflow-hidden"
              role="group"
              aria-label={lang === 'en' ? 'Atlas mode' : 'Modo del Atlas'}
              style={{ border: '1px solid var(--color-border)' }}
            >
              {(
                [
                  { id: 'patterns',   en: 'PATTERNS',   es: 'PATRONES' },
                  { id: 'sectors',    en: 'SECTORS',    es: 'SECTORES' },
                  { id: 'categories', en: 'CATEGORIES', es: 'CATEGORÍAS' },
                  { id: 'sexenios',   en: 'TERMS',      es: 'SEXENIOS' },
                ] as Array<{ id: ConstellationMode; en: string; es: string }>
              ).map((m, i, arr) => {
                const isActive = atlasMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setAtlasMode(m.id)}
                    className="px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    style={{
                      background: isActive ? '#a06820' : 'transparent',
                      color: isActive ? 'var(--color-background)' : 'var(--color-text-muted)',
                      borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {lang === 'en' ? m.en : m.es}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Each orb is a cluster of the federal contract record — positioned left-to-right by vendor count and bottom-to-top by high-risk rate, sized to the Tier-1 priority leads inside. Toggle the lens to re-cluster the same population by pattern, sector, category, or term, and click any orb to fly into its vendors.'
              : 'Cada orbe es un cúmulo del registro de contratación federal — ubicado de izquierda a derecha por número de proveedores y de abajo hacia arriba por tasa de alto riesgo, dimensionado según los líderes prioritarios Tier-1 que contiene. Alterna la lente para reagrupar la misma población por patrón, sector, categoría o sexenio, y haz clic en cualquier orbe para entrar a sus proveedores.'}
          </p>

          {/* The faithful Observatory — same component as /atlas. It carries
              its own folio frame + how-to-read strip + ranked name index, so it
              is NOT wrapped in PlateFrame (that would double-frame + double the
              encoding caption). */}
          {scatterClusters.length === 0 && !scatterLoading ? (
            <p
              role="status"
              className="font-mono text-[12px] text-text-muted py-10 text-center"
              style={{ letterSpacing: '0.08em' }}
            >
              {lang === 'es' ? 'Sin datos en vivo para esta lente todavía.' : 'No live data for this lens yet.'}
            </p>
          ) : (
            <ObservatoryScatter
              clusters={scatterClusters}
              lens={atlasMode}
              lang={lang}
              onOpenDossier={handleAtlasClusterClick}
              onVendorClick={(id) => navigate(`/vendors/${id}`)}
            />
          )}
          {/* Footer link into the full /atlas surface — preserves the
              current lens by passing it through as ?lens=<atlasMode>. */}
          <div className="mt-3 flex items-center justify-end">
            <Link
              to={`/atlas${atlasMode !== 'patterns' ? `?lens=${atlasMode}` : ''}`}
              className="min-h-6 rounded-sm text-[12px] font-mono uppercase tracking-[0.12em] font-bold text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              {lang === 'en' ? 'Open full Atlas' : 'Abrir Atlas completo'}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </motion.section>

        {/* ─── MacroArc — 23-year direct award trend ─── */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          aria-labelledby="macro-arc-title"
        >
          <h2 id="macro-arc-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1 flex items-center gap-2">
            {lang === 'en' ? 'Five administrations · one structural failure' : 'Cinco administraciones · una falla estructural'}
          </h2>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Direct award rate — share of contracts awarded without competitive bidding — has stayed six to eight times the EU scoreboard line under every Mexican administration the register can score. The AI model trained on this systemic pattern now detects its variants automatically.'
              : 'La tasa de adjudicación directa — contratos sin licitación — se ha mantenido de seis a ocho veces por encima de la línea del Tablero UE en cada administración que el registro puede calificar. El modelo entrenado en este patrón sistémico lo detecta automáticamente.'}
          </p>
          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="III"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Plate — Direct-award rate stays six to eight times above the EU scoreboard line across five administrations.'
              : 'Lámina — La tasa de adjudicación directa permanece de seis a ocho veces sobre la línea del Tablero UE en cinco administraciones.'}
          >
            <MacroArc lang={lang} />
          </PlateFrame>
        </motion.section>

        {/* ─── LEAD-TIME ADVANTAGE — Hero #3 (promoted by d-P4 2026-05-04) ─── */}
        <section className="mb-10" aria-labelledby="leadtime-title">
          <h2 id="leadtime-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Lead-time advantage — when RUBLI saw it vs. when the press did' : 'Ventaja temporal — cuándo lo vio RUBLI vs. cuándo lo vio la prensa'}
          </h2>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? <>For each documented corruption case, the gap between when the contracts crossed RUBLI's <strong className="text-text-primary">critical-risk threshold</strong> in the data, and when the scandal became public. The bigger the gap, the longer the platform could have flagged it for investigation.</>
              : <>Para cada caso documentado, la distancia entre cuándo los contratos cruzaron el <strong className="text-text-primary">umbral de riesgo crítico</strong> en los datos, y cuándo el escándalo se hizo público. Cuanto mayor la brecha, más tiempo la plataforma habría podido señalarlo.</>
            }
          </p>
          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="IV"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Plate — Time between the data first crossing the critical-risk threshold and the scandal becoming public.'
              : 'Lámina — Tiempo entre el primer cruce del umbral crítico en los datos y la cobertura pública del escándalo.'}
          >
            <LeadTimeChart lang={lang} />
          </PlateFrame>
        </section>

        {/* ─── HEADLINE NUMBERS — investigative sequence (4 chapters)
            Reads as one argument: spend → bypass → flag → catch.
            Each tile carries a chapter kicker (I/II/III/IV) and a tail
            connector ("of which …") that ties to the next step. ─── */}
        <section className="mb-8">
          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="V"
            contextLabel={{ en: 'Headline numbers', es: 'Cifras clave' }}
            caption={lang === 'en'
              ? 'Plate — Four chapters of the federal-procurement record, read left-to-right: total spend, the bypass, the flag, the catch.'
              : 'Lámina — Cuatro capítulos del registro federal, leídos de izquierda a derecha: el gasto, el desvío, la marca, la captura.'}
          >
          <ChapterTiles
            lang={lang}
            stats={stats}
            headlineSpend={headlineSpend}
            headlineSpendUSD={headlineSpendUSD}
          />
          </PlateFrame>
        </section>

        {/* ─── KEY FINDINGS — specific discoveries with animated visualizations ─── */}
        <section className="mb-8" aria-labelledby="findings-title">
          <h2 id="findings-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'What the analysis found' : 'Lo que encontró el análisis'}
          </h2>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-5 text-pretty">
            {lang === 'en'
              ? 'Four findings that only became visible at scale — impossible to see by auditing contracts one by one.'
              : 'Cuatro hallazgos que solo se volvieron visibles a escala — imposibles de detectar auditando contrato por contrato.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Finding 01 — Ghost Economy: compare-gap animation */}
            <motion.article
              className="surface-card rounded-sm border-l-2"
              style={{ borderLeftColor: '#dc2626' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
            >
              <Link
                to="/aria?pattern=P2"
                className="group block h-full p-5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                aria-label={lang === 'en' ? 'Open ghost-company investigation queue (ARIA P2)' : 'Abrir cola de investigación de empresas fantasma (ARIA P2)'}
              >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 01 · GHOST ECONOMY' : 'HALLAZGO 01 · ECONOMÍA FANTASMA'}
                </span>
                <span className="text-[13px] font-mono uppercase tracking-[0.1em] opacity-0 max-md:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: RISK_TEXT_COLORS.critical }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              </div>
              {/* Detection gap — magazine triptych: [42 official | 145× | 6,118 detected] */}
              <div className="mb-4 rounded-sm overflow-hidden" style={{ height: 92 }}>
                <div className="flex h-full">

                  {/* Left panel: SAT official count — small, dim, de-emphasized */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0 gap-0.5"
                    style={{
                      width: 74,
                      background: 'rgba(100,116,139,0.09)',
                      borderRight: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-mono font-bold text-[28px] leading-none tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      42
                    </span>
                    <span className="text-[7px] font-mono text-text-muted uppercase tracking-[0.06em] text-center leading-[1.25]">
                      SAT<br />official
                    </span>
                  </div>

                  {/* Center bridge: the multiplier */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0"
                    style={{ width: 50, background: 'var(--color-background)' }}
                  >
                    <span className="font-mono font-bold text-[15px] leading-none" style={{ color: RISK_TEXT_COLORS.critical }}>
                      145×
                    </span>
                    <span className="text-[7px] font-mono text-text-muted mt-0.5 leading-none">gap</span>
                  </div>

                  {/* Right panel: RUBLI detection — large, dramatic, animated */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Background wash slides in from left */}
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: '#dc2626', transformOrigin: 'left' }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileInView={{ scaleX: 1, opacity: 0.10 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Vivid left edge accent */}
                    <div className="absolute inset-y-0 left-0" style={{ width: 3, background: '#dc2626', opacity: 0.65 }} />
                    {/* Number + label — fade in after wash */}
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.92 }}
                    >
                      <span
                        className="font-mono font-bold text-[42px] leading-none tabular-nums"
                        style={{ color: RISK_TEXT_COLORS.critical }}
                      >
                        6,118
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1"
                        style={{ color: RISK_TEXT_COLORS.critical }}
                      >
                        {lang === 'en' ? 'RUBLI detected' : 'RUBLI detectó'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[15px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'SAT officially confirmed 42. RUBLI found 145× more.' : 'SAT confirmó 42 oficialmente. RUBLI encontró 145× más.'}
              </h3>
              <p className="text-sm text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'No digital footprint, burst activity, RFC anomalies, shared addresses. The 97% detection gap means most ghost-company fraud goes unregistered — and unrecovered.'
                  : 'Sin huella digital, actividad en ráfaga, anomalías RFC, domicilios compartidos. La brecha del 97% significa que la mayoría del fraude fantasma no se registra — y no se recupera.'}
              </p>
              </Link>
            </motion.article>

            {/* Finding 02 — Audit Blindspot: fill animation */}
            <motion.article
              className="surface-card rounded-sm border-l-2"
              style={{ borderLeftColor: '#f59e0b' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Link
                to="/contracts?risk_level=critical&min_amount=5000000000"
                className="group block h-full p-5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                aria-label={lang === 'en' ? 'Open contracts above MX$5B at critical risk' : 'Ver contratos sobre MX$5B con riesgo crítico'}
              >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 02 · AUDIT BLINDSPOT' : 'HALLAZGO 02 · PUNTO CIEGO DE AUDITORÍA'}
                </span>
                <span className="text-[13px] font-mono uppercase tracking-[0.1em] opacity-0 max-md:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: RISK_TEXT_COLORS.high }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              </div>
              {/* Audit gap — magazine triptych: [5% audited | 19× | MX$1.25T unreviewed] */}
              <div className="mb-4 rounded-sm overflow-hidden" style={{ height: 92 }}>
                <div className="flex h-full">

                  {/* Left: tiny audit slice */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0 gap-0.5"
                    style={{
                      width: 74,
                      background: 'rgba(100,116,139,0.09)',
                      borderRight: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-mono font-bold text-[28px] leading-none tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      5%
                    </span>
                    <span className="text-[7px] font-mono text-text-muted uppercase tracking-[0.06em] text-center leading-[1.25]">
                      ASF<br />audits
                    </span>
                  </div>

                  {/* Bridge: gap multiplier */}
                  <div
                    className="flex flex-col items-center justify-center flex-shrink-0"
                    style={{ width: 50, background: 'var(--color-background)' }}
                  >
                    <span className="font-mono font-bold text-[15px] leading-none" style={{ color: RISK_TEXT_COLORS.high }}>
                      19×
                    </span>
                    <span className="text-[7px] font-mono text-text-muted mt-0.5 leading-none">gap</span>
                  </div>

                  {/* Right: massive value-at-risk panel */}
                  <div className="flex-1 relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: '#f59e0b', transformOrigin: 'left' }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileInView={{ scaleX: 1, opacity: 0.12 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <div className="absolute inset-y-0 left-0" style={{ width: 3, background: '#f59e0b', opacity: 0.7 }} />
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.92 }}
                    >
                      <span
                        className={`font-mono font-bold leading-none tabular-nums ${lang === 'en' ? 'text-[36px]' : 'text-[28px]'}`}
                        style={{ color: RISK_TEXT_COLORS.high }}
                      >
                        {lang === 'en' ? 'MX$1.25T' : 'MX$1.25 billones'}
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1.5"
                        style={{ color: RISK_TEXT_COLORS.high }}
                      >
                        {lang === 'en' ? '95% never audited' : '95% sin auditar'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[15px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'MX$1.25 trillion above 5B MXN — zero audit coverage.' : 'MX$1.25 billones sobre 5,000 MDP — sin cobertura de auditoría.'}
              </h3>
              <p className="text-sm text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'ASF reviews ~5% of contracts above MX$5B annually. At that rate, a high-value contract waits ~25 years for review — long after the money is gone and the vendor dissolved.'
                  : 'La ASF revisa ~5% de contratos sobre 5,000 MDP al año. A ese ritmo, un contrato de alto valor espera ~25 años para ser revisado — mucho después de que el dinero desapareció.'}
              </p>
              </Link>
            </motion.article>

            {/* Finding 03 — Threshold Gaming: two-bar comparison */}
            <motion.article
              className="surface-card rounded-sm border-l-2"
              style={{ borderLeftColor: '#8b5cf6' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Link
                to="/contracts?procedure_type=ADJUDICACION_DIRECTA&sort_by=amount&sort_order=desc"
                className="group block h-full p-5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                aria-label={lang === 'en' ? 'Open direct-award contracts sorted by amount' : 'Ver contratos por adjudicación directa ordenados por monto'}
              >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 03 · THRESHOLD GAMING' : 'HALLAZGO 03 · JUEGO DE UMBRALES'}
                </span>
                <span className="text-[13px] font-mono uppercase tracking-[0.1em] opacity-0 max-md:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: getSectorTextColor('tecnologia') }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              </div>
              {/* Threshold-bunching histogram — the statistical fingerprint */}
              <div className="mb-4">
                {(() => {
                  // Bars before threshold ramp toward a peak just below the legal limit
                  const PRE = [22, 24, 27, 30, 34, 40, 50, 64, 80]
                  // Bars after threshold drop sharply to normal market rate
                  const POST = [30, 28, 32, 30]
                  const BAR_W = 18
                  const GAP = 3
                  const X0 = 6
                  const THRESH_GAP = 18
                  const Y_BASE = 92
                  const threshX = X0 + PRE.length * (BAR_W + GAP) + 7
                  return (
                    <svg viewBox="0 0 320 110" className="w-full" style={{ height: 110 }} aria-hidden>
                      {/* Y baseline */}
                      <line x1={4} x2={316} y1={Y_BASE} y2={Y_BASE} stroke="var(--color-border)" strokeWidth={0.8} />

                      {/* Pre-threshold bars: full violet at the spike, faded for normal */}
                      {PRE.map((h, i) => {
                        const x = X0 + i * (BAR_W + GAP)
                        const isPeak = i >= PRE.length - 3
                        return (
                          <motion.rect
                            key={`pre-${i}`}
                            x={x}
                            width={BAR_W}
                            rx={1}
                            fill={isPeak ? '#8b5cf6' : 'rgba(139,92,246,0.30)'}
                            initial={{ y: Y_BASE, height: 0 }}
                            whileInView={{ y: Y_BASE - h, height: h }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                          />
                        )
                      })}

                      {/* Threshold line — vertical red dashed */}
                      <motion.line
                        x1={threshX}
                        x2={threshX}
                        y1={4}
                        y2={Y_BASE}
                        stroke="#dc2626"
                        strokeWidth={1.4}
                        strokeDasharray="3 3"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 0.85 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.85 }}
                      />

                      {/* Threshold label */}
                      <motion.text
                        x={threshX + 4}
                        y={11}
                        fontSize={8}
                        fill="#dc2626"
                        fontFamily="var(--font-family-mono, monospace)"
                        fontWeight="700"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 1.05 }}
                      >
                        {lang === 'en' ? 'TENDER THRESHOLD' : 'UMBRAL LICITACIÓN'}
                      </motion.text>

                      {/* Post-threshold bars: muted gray = normal market */}
                      {POST.map((h, i) => {
                        const x = X0 + PRE.length * (BAR_W + GAP) + THRESH_GAP + i * (BAR_W + GAP)
                        return (
                          <motion.rect
                            key={`post-${i}`}
                            x={x}
                            width={BAR_W}
                            rx={1}
                            fill="rgba(100,116,139,0.32)"
                            initial={{ y: Y_BASE, height: 0 }}
                            whileInView={{ y: Y_BASE - h, height: h }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.7 + i * 0.05, ease: 'easeOut' }}
                          />
                        )
                      })}

                      {/* Spike annotation (over the peak) */}
                      <motion.text
                        x={X0 + (PRE.length - 2) * (BAR_W + GAP) - 28}
                        y={20}
                        fontSize={13}
                        fontWeight="700"
                        fill="#8b5cf6"
                        fontFamily="var(--font-family-mono, monospace)"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 1.1 }}
                      >
                        ↘ 75% DA
                      </motion.text>

                      {/* Post-threshold annotation */}
                      <motion.text
                        x={threshX + THRESH_GAP + 26}
                        y={56}
                        fontSize={13}
                        fontWeight="700"
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-family-mono, monospace)"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 1.2 }}
                      >
                        ~28% DA
                      </motion.text>

                      {/* X-axis caption */}
                      <text
                        x={4}
                        y={106}
                        fontSize={7}
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-family-mono, monospace)"
                      >
                        {lang === 'en' ? '← smaller contracts' : '← contratos menores'}
                      </text>
                      <text
                        x={316}
                        y={106}
                        fontSize={7}
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-family-mono, monospace)"
                        textAnchor="end"
                      >
                        {lang === 'en' ? 'larger →' : 'mayores →'}
                      </text>
                    </svg>
                  )
                })()}
                <div className="text-[8px] font-mono text-text-muted leading-[1.4] mt-1">
                  {lang === 'en'
                    ? 'Bar height = contract count by amount · spike just below threshold = artificial bunching to avoid public tender'
                    : 'Altura barra = número de contratos · pico justo bajo umbral = agrupamiento artificial para evitar licitación'}
                </div>
              </div>
              <h3 className="font-semibold text-[15px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'Contracts cluster statistically just below tender thresholds.' : 'Los contratos se agrupan estadísticamente justo debajo de los umbrales.'}
              </h3>
              <p className="text-sm text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'Large contracts split into multiple awards just below the legal threshold that triggers public tender. The density spike is detectable only across all 3.1M contracts at once.'
                  : 'Contratos grandes divididos en múltiples adjudicaciones justo bajo el umbral legal. El pico de densidad solo es detectable con los 3.1M contratos a la vez.'}
              </p>
              </Link>
            </motion.article>

            {/* Finding 04 — Institutional Capture */}
            <CaptureLeaders lang={lang} leaders={captureLeadersData?.leaders} />

          </div>
        </section>

        {/* ─── PESOS AT RISK — estimated overpayment by pattern ─── */}
        <section className="mb-8" aria-labelledby="pesos-title">
          <h2 id="pesos-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Pesos at risk — estimated exposure by corruption pattern' : 'Pesos en riesgo — exposición estimada por patrón'}
          </h2>
          {/* U-007: surface the methodological caveat that previously only
              lived as a code comment. The aggregate scales high+critical
              contract counts by total spend, assuming each risk band's
              average ticket equals the population mean. */}
          <div className="text-[13px] font-mono uppercase tracking-[0.12em] text-text-muted mb-2">
            {lang === 'en'
              ? '(estimated · assumes uniform value distribution across risk bands)'
              : '(estimado · supone distribución uniforme de valor entre bandas de riesgo)'}
          </div>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Risk scores count contracts. This counts pesos. For each ARIA pattern we estimate the financial exposure using pattern-specific overpayment models — direct overcharges (P5), full ghost-network volume (P2), capture premiums, monopoly discounts lost. Estimates are illustrative; methodology in the footnote.'
              : 'Los puntajes cuentan contratos. Esto cuenta pesos. Para cada patrón ARIA estimamos la exposición financiera usando modelos específicos de sobrepago — sobrecargos directos (P5), volumen completo de redes fantasma (P2), premios de captura, descuentos monopólicos perdidos. Las estimaciones son ilustrativas; metodología en la nota.'}
          </p>
          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="VI"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Plate — Estimated financial exposure by ARIA pattern, computed with pattern-specific overpayment models.'
              : 'Lámina — Exposición financiera estimada por patrón ARIA, calculada con modelos de sobrepago específicos.'}
          >
            <PesosAtRiskChart lang={lang} />
          </PlateFrame>
        </section>

        {/* SPENDING CATEGORIES — restored 2026-05-05 from d-P1 cut.
            User feedback: the bare link card 'shows nothing'; bringing back
            the actual 2-row proportional treemap of top 8 categories. */}
        <section className="mb-8" aria-labelledby="categories-title">
          <div className="flex items-start justify-between mb-1">
            <h2 id="categories-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? 'Where the money goes — top spending categories' : 'Dónde va el dinero — principales categorías de gasto'}
            </h2>
            <Link
              to="/sectors?view=categories"
              className="min-h-6 rounded-sm text-[12px] font-mono uppercase tracking-[0.1em] text-accent-hover hover:underline underline-offset-2 transition-colors inline-flex items-center gap-1 flex-shrink-0 ml-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              {lang === 'en' ? 'All categories' : 'Todas'}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Cell width = total spend; cell color = sector palette tinted by risk score. The top 8 categories cover the majority of federal spend.'
              : 'Ancho de celda = gasto total; color de celda = paleta sectorial teñida por puntaje de riesgo. Las 8 categorías principales cubren la mayoría del gasto federal.'}
          </p>
          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="VII"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Plate — Top 8 federal spending categories, cell width proportional to spend, hue tinted by risk.'
              : 'Lámina — Las 8 categorías principales del gasto federal, con ancho proporcional al monto y matiz por riesgo.'}
          >
            <TopCategoriesChart lang={lang} />
          </PlateFrame>
        </section>

        {/* ─── § 2 LA LENTE — concentric-rings narrowing visualization ─── */}
        <section className="mb-8" aria-labelledby="la-lente-title">
          <h2 id="la-lente-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? '§ 2 · The Lens — narrowing 3.1M to 299' : '§ 2 · La Lente — de 3.1M a 299'}
          </h2>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Four filters in sequence — risk model, then ARIA patterns, then GT match, then manual triage. Each step narrows the population further; the last 299 are hand-investigable today.'
              : 'Cuatro filtros en cadena — modelo de riesgo, patrones ARIA, coincidencia con GT, y triaje manual. Cada paso reduce la población; los últimos 299 son investigables a mano hoy.'}
          </p>

          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="VIII"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Cascade — from 3.1M COMPRANET records to 299 hand-investigable T1 vendors. Each filter step\'s retention shown in log-scale; 43 named cases anchor the model below.'
              : 'Cascada — de 3.1M registros COMPRANET a 299 proveedores T1 investigables a mano. La retención de cada paso se muestra en escala logarítmica; 43 casos con nombre anclan el modelo abajo.'}
          >
            {(() => {
              // ── Cascade Ledger — 4 log-scaled rungs + GT anchor band ──
              const totalContracts = stats.totalContracts || 3_058_286
              const highCriticalCount = stats.highCriticalCount || 337_693
              const tier2 = ariaStats?.latest_run?.tier2_count ?? 1_490
              const tier3 = ariaStats?.latest_run?.tier3_count ?? 5_578
              const aria23 = tier2 + tier3
              const tier1 = ariaStats?.latest_run?.tier1_count ?? 299
              // Use the canonical fallback constant — the caseStats API
              // sometimes returns the small "hero cases" subset (43) instead
              // of the full GT vendor count, so we floor at the constant.
              const gtVendors = Math.max(
                caseStats?.total_cases ?? 0,
                GROUND_TRUTH_VENDOR_COUNT_FALLBACK,
              )

              type Rung = {
                count: number
                pct: number
                drop: number | null // null on rung 0; ratio to previous on rungs 1+
                label: { en: string; es: string }
                operation: { en: string; es: string } | null // filter caption BELOW this rung
                href: string
              }

              const rungs: Rung[] = [
                {
                  count: totalContracts,
                  pct: 100,
                  drop: null,
                  label: { en: 'COMPRANET universe · 2002–2025', es: 'Universo COMPRANET · 2002–2025' },
                  operation: {
                    en: '↓ filter by risk model v0.8.5 (≥0.40)',
                    es: '↓ filtrar por modelo de riesgo v0.8.5 (≥0.40)',
                  },
                  href: '/contracts',
                },
                {
                  count: highCriticalCount,
                  pct: (highCriticalCount / totalContracts) * 100,
                  drop: totalContracts / highCriticalCount,
                  label: { en: 'High + critical contracts', es: 'Contratos alto + crítico' },
                  operation: {
                    en: '↓ aggregate to vendor, apply ARIA patterns P1–P7',
                    es: '↓ agregar a proveedor, aplicar patrones ARIA P1–P7',
                  },
                  href: '/aria',
                },
                {
                  count: aria23,
                  pct: (aria23 / totalContracts) * 100,
                  drop: highCriticalCount / aria23,
                  label: { en: 'ARIA queue · tiers 2 + 3', es: 'Cola ARIA · niveles 2 + 3' },
                  operation: {
                    en: '↓ co-cluster GT, manual triage, capacity cap',
                    es: '↓ co-agrupar con GT, triaje manual, tope de capacidad',
                  },
                  href: '/aria?tier=2,3',
                },
                {
                  count: tier1,
                  pct: (tier1 / totalContracts) * 100,
                  drop: aria23 / tier1,
                  label: { en: 'Tier 1 · hand-investigable today', es: 'Nivel 1 · investigable a mano hoy' },
                  operation: null,
                  href: '/aria?tier=1',
                },
              ]

              // Risk-intensity gradient — each rung visually escalates as the
              // filter narrows toward the most-concentrated risk population.
              // Rung 0 (universe) = neutral; rung 3 (T1) = critical red.
              // GT anchor below stays ochre as its own "training corpus" identity.
              // Type twin of rungColors (the bars keep RISK_COLORS as marks).
              const rungInks = [
                RISK_TEXT_COLORS.low,
                RISK_TEXT_COLORS.medium,
                RISK_TEXT_COLORS.high,
                RISK_TEXT_COLORS.critical,
              ]
              const rungColors = [
                RISK_COLORS.low,      // #71717a grey — universe, no judgment yet
                RISK_COLORS.medium,   // #a16207 amber — flagging starts
                RISK_COLORS.high,     // #f59e0b orange — escalation
                RISK_COLORS.critical, // #ef4444 red — hand-investigable concentration
              ]

              // Log-scale bar widths. log10(maxCount) is full width; log10(count)
              // is normalized against it. Floor at 4% so the smallest rung still
              // reads as a bar (otherwise 299 renders as a 0.5% slice and
              // disappears next to 3.05M).
              const maxLog = Math.log10(totalContracts)
              const barWidth = (n: number) => {
                const w = (Math.log10(Math.max(1, n)) / maxLog) * 100
                return Math.max(4, Math.min(100, w))
              }

              const fmtPct = (p: number) => {
                if (p >= 10) return `${p.toFixed(1)}%`
                if (p >= 1) return `${p.toFixed(2)}%`
                if (p >= 0.01) return `${p.toFixed(3)}%`
                return `${p.toFixed(4)}%`
              }
              const fmtDrop = (d: number) => {
                if (d >= 100) return `${Math.round(d)}×`
                if (d >= 10) return `${d.toFixed(0)}×`
                return `${d.toFixed(1)}×`
              }

              return (
                <div className="relative">
                  {/* Axis hint — top-right, archival caption */}
                  <div className="flex items-center justify-end mb-3">
                    <span className="text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted">
                      {lang === 'en'
                        ? 'logarithmic scale · width = log₁₀(count)'
                        : 'escala logarítmica · ancho = log₁₀(conteo)'}
                    </span>
                  </div>

                  {/* Four rungs */}
                  <ol className="relative">
                    {rungs.map((r, i) => {
                      const w = barWidth(r.count)
                      return (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: '-30px' }}
                          transition={{ duration: 0.42, delay: 0.1 + i * 0.12, ease: 'easeOut' }}
                          className="relative"
                        >
                          {/* Rung row */}
                          <Link
                            to={r.href}
                            className="group grid items-baseline gap-x-4 py-2 rounded-sm transition-colors hover:bg-[color:var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                            style={{ gridTemplateColumns: '136px minmax(0,1fr) 92px' }}
                            aria-label={`${formatNumber(r.count)} — ${r.label[lang]}`}
                          >
                            {/* Count — Playfair Italic 800 anchor */}
                            <span
                              className="tabular-nums leading-none text-right pr-1"
                              style={{
                                fontFamily: "'Playfair Display', Georgia, serif",
                                fontStyle: 'normal',
                                fontWeight: 800,
                                fontSize: i === 0 ? 28 : 26,
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              {formatNumber(r.count)}
                            </span>

                            {/* Log-scaled bar + label stack */}
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="relative h-[7px] w-full rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
                                <motion.div
                                  className="absolute inset-y-0 left-0 rounded-sm"
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${w}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.7, delay: 0.18 + i * 0.12, ease: 'easeOut' }}
                                  style={{ background: rungColors[i], opacity: 0.92 }}
                                />
                              </div>
                              <div className="text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted leading-[1.3] truncate">
                                {r.label[lang]}
                              </div>
                            </div>

                            {/* Percentage readout */}
                            <span className="font-mono tabular-nums text-[13px] text-text-secondary text-right group-hover:text-text-primary transition-colors">
                              {fmtPct(r.pct)}
                            </span>
                          </Link>

                          {/* Filter-operation caption between this rung and next */}
                          {r.operation && (
                            <div className="grid gap-x-4 py-1.5" style={{ gridTemplateColumns: '136px minmax(0,1fr) 92px' }}>
                              <span /> {/* spacer for count column */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="text-[12px] leading-[1.4] truncate"
                                  style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    fontStyle: 'normal',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {r.operation[lang]}
                                </span>
                              </div>
                              {/* × drop readout, paired with the operation.
                                  Color tints toward the destination rung so the
                                  eye reads "this drop lands in critical territory". */}
                              {rungs[i + 1]?.drop != null && (
                                <span className="font-mono tabular-nums text-[13px] text-right" style={{ color: rungInks[i + 1], letterSpacing: '0.06em' }}>
                                  ··· {fmtDrop(rungs[i + 1].drop as number)} {lang === 'en' ? 'drop' : 'caída'}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.li>
                      )
                    })}
                  </ol>

                  {/* GT anchor band — sub-baseline, dotted-rule separator */}
                  <MotionLink
                    to="/cases"
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="group block mt-5 pt-3 rounded-sm transition-colors hover:bg-[color:var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                    style={{ borderTop: '1px dashed rgba(160, 104, 32, 0.45)' }}
                    aria-label={lang === 'en'
                      ? `43 named cases · ${formatNumber(GROUND_TRUTH_VENDOR_COUNT_FALLBACK)} GT vendors — training corpus`
                      : `43 casos con nombre · ${formatNumber(GROUND_TRUTH_VENDOR_COUNT_FALLBACK)} proveedores GT — corpus de entrenamiento`}
                  >
                    <div className="grid items-baseline gap-x-4" style={{ gridTemplateColumns: '136px minmax(0,1fr) 92px' }}>
                      {/* Eyebrow + count, indented to align under count column */}
                      <div className="flex flex-col gap-1 items-end pr-1">
                        <span className="text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--color-accent-hover)' }}>
                          {lang === 'en' ? 'Anchor' : 'Ancla'}
                        </span>
                        <span
                          className="tabular-nums leading-none"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontStyle: 'normal',
                            fontWeight: 800,
                            fontSize: 22,
                            color: 'var(--color-accent-hover)',
                          }}
                        >
                          43
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="text-[12px] font-mono uppercase tracking-[0.14em]" style={{ color: 'var(--color-accent-hover)' }}>
                          {lang === 'en' ? 'Training corpus' : 'Corpus de entrenamiento'}
                        </div>
                        <div className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors leading-[1.4]">
                          {lang === 'en'
                            ? <>43 named cases · <span className="tabular-nums">{formatNumber(gtVendors)}</span> GT vendors</>
                            : <>43 casos con nombre · <span className="tabular-nums">{formatNumber(gtVendors)}</span> proveedores GT</>}
                        </div>
                        <div
                          className="text-[12px] leading-[1.4] mt-0.5"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontStyle: 'normal',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {lang === 'en' ? '← informs every filter above' : '← informa todos los filtros anteriores'}
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-[13px] text-right uppercase tracking-[0.12em] text-text-muted self-start">
                        {lang === 'en' ? 'seed' : 'semilla'}
                      </span>
                    </div>
                  </MotionLink>
                </div>
              )
            })()}

            {/* Methodology footer — supplementary stats inline */}
            <div className="mt-6 pt-4 border-t border-border/40 text-[13px] font-mono text-text-muted leading-[1.6]">
              {lang === 'en' ? (
                <>
                  Per-sector calibrated logistic regression · vendor-stratified validation · Test AUC <strong className="text-text-secondary">0.785</strong> · 72 active spending categories · 1,830 vendor memos (440 LLM-narrative) · model <strong className="text-text-secondary">v0.8.5</strong>. See the{' '}
                  <Link to="/methodology" className="rounded-sm text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">methodology</Link> for scope and limits.
                </>
              ) : (
                <>
                  Regresión logística calibrada por sector · validación estratificada por proveedor · AUC <strong className="text-text-secondary">0.785</strong> · 72 categorías activas · 1,830 memos de proveedores (440 LLM-narrativos) · modelo <strong className="text-text-secondary">v0.8.5</strong>. Consulta la{' '}
                  <Link to="/methodology" className="rounded-sm text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">metodología</Link> para alcance y límites.
                </>
              )}
            </div>
          </PlateFrame>
        </section>

        {/* ─── Amber divider ─── */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-40 mb-10" />

        {/* ─── Documented Cases Timeline ─── */}
        <section className="mb-8" aria-labelledby="timeline-title">
          <h2 id="timeline-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 flex items-center gap-2">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {lang === 'en' ? 'Documented corruption cases · 2008–2025' : 'Casos documentados de corrupción · 2008–2025'}
          </h2>
          <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Ten landmark cases — IMSS ghost companies, Segalmex, Odebrecht, COVID-19 emergency procurement — form the backbone of the model\'s ground truth. The model detects these patterns years before the scandal becomes public.'
              : 'Diez casos emblemáticos — empresas fantasma IMSS, Segalmex, Odebrecht, compras de emergencia COVID-19 — forman la base de verdad del modelo. El modelo detecta estos patrones años antes de que el escándalo se haga público.'}
          </p>
          <PlateFrame
            bleed
            captionFull
            lang={lang}
            folio="IX"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Plate — Ten landmark cases, 2008–2025; height = critical risk, hue = sector.'
              : 'Lámina — Diez casos emblemáticos 2008–2025; alto = riesgo crítico, color = sector.'}
          >
            <CaseTimeline lang={lang} />
          </PlateFrame>
        </section>

        {/* ─── Recent Critical Alerts — news wire (frozen upstream feed) ─── */}
        <section className="mb-8" aria-labelledby="wire-title">
            <div className="flex items-center justify-between mb-2">
              <h2 id="wire-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-risk-critical" aria-hidden />
                {lang === 'en' ? 'Recent critical alerts' : 'Alertas críticas recientes'}
                <span className="normal-case tracking-[0.08em] text-text-muted font-normal">
                  {lang === 'en' ? '· feed frozen Sep 28 2025' : '· corte 28 sep 2025'}
                </span>
              </h2>
              <Link
                to="/contracts?risk_level=critical"
                className="min-h-6 rounded-sm text-[13px] font-mono uppercase tracking-[0.12em] text-accent-hover hover:underline underline-offset-2 transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {lang === 'en' ? 'View all' : 'Ver todas'}
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
            <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
              {lang === 'en'
                ? 'Five contracts most recently flagged at critical risk by the live model. Each is an investigation signal — not a verdict.'
                : 'Los cinco contratos marcados más recientemente en riesgo crítico por el modelo. Cada uno es una señal de investigación — no un veredicto.'}
            </p>
            {recentCritical.length === 0 ? (
              <div className="surface-card rounded-sm p-4 text-xs font-mono text-text-muted leading-[1.6]">
                {lang === 'en'
                  ? 'No wire entries available right now. The upstream feed (CompraNet) was frozen on Sep 28 2025 — alerts reflect the latest flagged contracts on record, not new activity.'
                  : 'No hay entradas del cable disponibles por ahora. La fuente (CompraNet) quedó congelada el 28 de septiembre de 2025 — las alertas reflejan los últimos contratos marcados en el registro, no actividad nueva.'}
              </div>
            ) : (
            <div className="surface-card rounded-sm overflow-hidden divide-y divide-border/50">
              {recentCritical.slice(0, 5).map((c) => {
                const sectorColor = c.sector_name
                  ? SECTOR_COLORS[c.sector_name.toLowerCase()] ?? '#64748b'
                  : '#64748b'
                return (
                  <div
                    key={c.id}
                    className="group w-full text-left p-4 flex items-center gap-4 hover:bg-background-elevated transition-colors"
                  >
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[12px] font-mono font-bold tracking-[0.1em] flex-shrink-0 w-[72px] justify-center"
                      style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: RISK_TEXT_COLORS.critical }}
                    >
                      {lang === 'en' ? 'CRITICAL' : 'CRÍTICO'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        {c.vendor_id
                          ? <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name ?? ''} size="sm" />
                          : <span className="text-sm font-semibold text-text-primary">{formatVendorName(c.vendor_name) || (lang === 'en' ? 'Unknown vendor' : 'Proveedor desconocido')}</span>
                        }
                      </div>
                      <p className="text-[13px] truncate mt-0.5">
                        <Link
                          to={`/contracts/${c.id}`}
                          className="rounded-sm text-text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                        >
                          {c.title || c.institution_name || `${lang === 'en' ? 'Contract' : 'Contrato'} #${c.id}`}
                        </Link>
                      </p>
                    </div>
                    <div className="hidden md:flex flex-shrink-0 w-36 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sectorColor }}
                      />
                      <span className="text-xs text-text-secondary capitalize truncate">
                        {c.sector_name || '—'}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-mono tabular-nums text-text-primary">
                        {formatCompactMXN(c.amount_mxn)}
                      </div>
                      {c.contract_date && (
                        <div className="text-[12px] font-mono text-text-muted mt-0.5">
                          {new Date(c.contract_date).toISOString().slice(0, 10)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </section>

        {/* ─── CTA ─── */}
        <section className="mb-8 print-hide" aria-labelledby="cta-title">
          <div
            className="rounded-sm p-8 border border-accent/30"
            style={{ background: 'linear-gradient(135deg, rgba(160,104,32,0.06), rgba(160,104,32,0.02))' }}
          >
            <h2 id="cta-title" className="scroll-mt-14 text-[12px] font-mono font-semibold uppercase tracking-[0.15em] text-accent-hover mb-2">
              {lang === 'en' ? 'Start Here' : 'Comienza aquí'}
            </h2>
            <h3
              className="font-serif text-[28px] leading-[1.15] font-bold text-text-primary mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {lang === 'en' ? 'Investigate a vendor.' : 'Investigar un proveedor.'}
            </h3>
            <p className="text-[15px] text-text-secondary mb-6 leading-[1.6]">
              {lang === 'en'
                ? 'Search by RFC, company name, or browse ARIA Tier 1 — 299 GT-anchored vendors at the top of the investigation queue.'
                : 'Busca por RFC, nombre de empresa, o explora ARIA Nivel 1 — 299 proveedores anclados en GT al tope de la cola de investigación.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/aria"
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/80 text-text-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {lang === 'en' ? 'Open ARIA queue' : 'Abrir cola ARIA'}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                to="/explore?entity=vendor"
                className="inline-flex items-center gap-1.5 bg-transparent hover:bg-accent/5 text-accent-hover border border-accent/40 font-medium text-sm px-4 py-2 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {lang === 'en' ? 'Search a vendor' : 'Buscar un proveedor'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── § · ADÓNDE IR — coda exit ramp (charter A∞/C3) ───
            One amber-mono investigate CTA into the live ARIA queue + the
            related-entity chips resolved above. Rendered only when ≥2 chips
            carry navigable ids (the charter coda floor). All entity links
            route exclusively through EntityIdentityChip. */}
        {codaChipCount >= 2 && (
          <section className="mb-8 print-hide" aria-labelledby="coda-title">
            <h2
              id="coda-title"
              className="scroll-mt-14 text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted mb-2"
            >
              {lang === 'en' ? '§ · WHERE TO GO NEXT' : '§ · ADÓNDE IR'}
            </h2>
            <p className="text-[15px] text-text-secondary leading-[1.6] mb-4 text-pretty">
              {lang === 'en'
                ? 'The patterns above resolve to specific entities. Open the investigation queue, or pull the most exposed sector and vendors on record — each opens a live dossier with the evidence behind its risk indicator.'
                : 'Los patrones de arriba se resuelven en entidades concretas. Abre la cola de investigación, o entra al sector y los proveedores más expuestos del registro — cada uno abre un dossier en vivo con la evidencia detrás de su indicador de riesgo.'}
            </p>

            {/* Investigate CTA — amber, mono, uppercase (charter coda rule) */}
            <Link
              to="/aria"
              className="rounded-sm inline-flex items-center gap-1.5 text-[13px] font-mono uppercase tracking-[0.12em] font-bold text-accent-hover hover:underline underline-offset-2 transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              aria-label={lang === 'en'
                ? 'Open the ARIA investigation queue — 299 GT-anchored Tier-1 vendors'
                : 'Abrir la cola de investigación ARIA — 299 proveedores Nivel 1 anclados en GT'}
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'en'
                ? 'Open the ARIA investigation queue'
                : 'Abrir la cola de investigación ARIA'}
            </Link>

            {/* Related-entity chips — all on-page data, all navigable */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {codaChips.sector && (
                <EntityIdentityChip
                  type="sector"
                  id={codaChips.sector.id}
                  name={codaChips.sector.name}
                  sectorCode={codaChips.sector.code}
                  size="md"
                />
              )}
              {codaChips.vendor && (
                <EntityIdentityChip
                  type="vendor"
                  id={codaChips.vendor.id}
                  name={codaChips.vendor.name}
                  riskScore={codaChips.vendor.riskScore}
                  size="md"
                />
              )}
              {codaChips.wireVendor && (
                <EntityIdentityChip
                  type="vendor"
                  id={codaChips.wireVendor.id}
                  name={codaChips.wireVendor.name}
                  riskScore={codaChips.wireVendor.riskScore}
                  size="md"
                />
              )}
            </div>
          </section>
        )}

        {/* ─── Credibility colophon — one colophon (PARALLAX D10 § Change 6):
            a paragraph inside main; the shell colophon is the page's only
            <footer>. ─── */}
        <div className="pt-8 border-t border-border font-mono text-[13px] text-text-muted leading-[1.6]">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Shield className="h-3 w-3" aria-hidden="true" />
            <span>AUC 0.785</span>
            <span aria-hidden="true">·</span>
            <span>{formatNumber(stats.totalContracts)} {lang === 'en' ? 'contracts' : 'contratos'}</span>
            <span aria-hidden="true">·</span>
            <span>{lang === 'en' ? 'EU scoreboard context' : 'contexto del Tablero UE'}</span>
            <span aria-hidden="true">·</span>
            <span>{lang === 'en' ? 'open source' : 'código abierto'}</span>
            <span aria-hidden="true">·</span>
            <span>RUBLI v0.8.5</span>
          </p>
          <p className="mt-2 max-w-[68ch]">
            {lang === 'en'
              ? 'Risk scores are statistical indicators of similarity to documented corruption patterns. A high score does not constitute proof of wrongdoing. All data from COMPRANET 2002–2025 — public records, no FOIA required.'
              : 'Las puntuaciones de riesgo son indicadores estadísticos de similitud con patrones de corrupción documentados. Una puntuación alta no constituye prueba de irregularidad. Todos los datos provienen de COMPRANET 2002–2025 — registros públicos, sin requerir FOIA.'}
          </p>
        </div>
        </div>{/* /folio-v1-P1b: end paper-grain content wrapper */}
      </div>
    </>
  )
}
