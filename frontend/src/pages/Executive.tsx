/**
 * Executive Summary — Newspaper-style 1-pager for decision-makers
 *
 * Designed to be consumed in 90 seconds by senators, NGO directors,
 * embassy staff, and prosecutors. Editorial weight over data density.
 *
 * Composition:
 *   1. Dateline + headline (Playfair Display 800)
 *   2. Lede paragraph
 *   3. 2x2 KPI tile grid (HR rate, value at risk, high+critical, model AUC)
 *   4. Three Signal cards (top model predictors)
 *   5. Documented cases timeline (2002-2025 dot-strip, expanded)
 *   6. Recommendations by audience (investigators / reformers / journalists)
 *   7. Single CTA — "Investigate a vendor"
 *   8. Credibility strip
 *   9. Print button (hides sidebar)
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Printer, ArrowUpRight, Shield, Clock } from 'lucide-react'
import { formatCompactMXN, formatNumber, formatCompactUSD } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, GROUND_TRUTH_CASE_COUNT_FALLBACK, GROUND_TRUTH_VENDOR_COUNT_FALLBACK } from '@/lib/constants'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { type ConstellationMode } from '@/components/charts/ConcentrationConstellation'
import { ObservatoryScatter } from '@/components/atlas/ObservatoryScatter'
import { useScatterClusters } from '@/lib/atlas/useScatterClusters'
import { useExecutiveData } from '@/hooks/useExecutiveData'
// DashboardSledgehammer removed 2026-05-05 — duplicated MacroArc's 74% headline
import { MacroArc } from '@/components/dashboard/MacroArc'
// LensVisualization/buildLensTiers retired 2026-05-20 — replaced by Cascade
// Ledger (log-scale rungs + GT anchor band) inline in this file. The legacy
// concentric-funnel component is still on disk for reference but no longer
// imported.
import { CaseTimeline } from '@/components/executive/CaseTimeline'
import { LeadTimeChart } from '@/components/executive/LeadTimeChart'
import { TopCategoriesChart } from '@/components/executive/TopCategoriesChart'
import { PesosAtRiskChart } from '@/components/executive/PesosAtRiskChart'

// ─────────────────────────────────────────────────────────────────────────────
// § 5 Historias Ejemplares — three hand-picked vendor dossiers
// ─────────────────────────────────────────────────────────────────────────────
type DossierFlag = 'gt' | 'efos' | 'sfp' | 'ghost' | 'fp_structural'
interface ExampleDossier {
  vendorId: number
  name: string
  risk: number
  tier: 1 | 2 | 3 | 4
  flags: DossierFlag[]
  contracts: string
  /** Display string per locale. Display only — USD is computed from mxnAmount. */
  value: { en: string; es: string }
  /** Numeric MXN total used to compute the USD scale companion in the card
   *  footer. Liconsa uses the documented MX$15B food-scandal anchor; Pharma
   *  and Hemoser use their precise contract totals. */
  mxnAmount: number
  kicker: { en: string; es: string }
  lede: { en: string; es: string }
  detected: { en: string; es: string }
  outcome: { en: string; es: string }
}

const EXAMPLE_DOSSIERS: ExampleDossier[] = [
  {
    vendorId: 29277,
    name: 'GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.',
    risk: 0.99, tier: 1, flags: ['gt'],
    contracts: '6,303', value: { en: '$133.2B MXN', es: '133,200 MDP' },
    mxnAmount: 133_200_000_000,
    kicker: { en: 'PHARMA OLIGOPOLY · IMSS CAPTURE', es: 'OLIGOPOLIO FARMACÉUTICO · CAPTURA IMSS' },
    lede: {
      en: '$133.2B MXN in IMSS medicines over 14 years — 60% of the entire pharma category. A single distributor holding a majority of Mexico\'s public drug supply, 79% awarded without competitive bidding.',
      es: '133,200 MDP en medicamentos al IMSS en 14 años — 60% de toda la categoría farmacéutica. Un solo distribuidor con la mayoría del suministro de medicamentos públicos de México, 79% sin licitación.',
    },
    detected: {
      en: 'ARIA Tier 1 · P6 institutional capture · price volatility critical · 6,303 contracts all above sector median',
      es: 'ARIA Tier 1 · captura institucional P6 · volatilidad de precio crítica · 6,303 contratos sobre la mediana sectorial',
    },
    outcome: {
      en: 'COFECE opened cartel investigation 2018 · AMLO publicly vetoed the pharma cartel 2019 · SFP imposed sanctions',
      es: 'COFECE abrió investigación de cártel 2018 · AMLO vetó públicamente el cártel farmacéutico 2019 · SFP impuso sanciones',
    },
  },
  {
    vendorId: 31655,
    name: 'LICONSA S.A. DE C.V.',
    risk: 0.92, tier: 1, flags: ['gt'],
    contracts: '~3,000', value: { en: '~$15B MXN', es: '~15,000 MDP' },
    mxnAmount: 15_000_000_000,
    kicker: { en: 'SEGALMEX FOOD FRAUD', es: 'FRAUDE SEGALMEX' },
    lede: {
      en: 'Government parastatal at the center of a MX$15B food-distribution scandal. Funds diverted from a program feeding Mexico\'s poorest households — corn tortillas, milk, and beans that never arrived.',
      es: 'Paraestatal al centro de un escándalo de 15,000 MDP en distribución de alimentos. Fondos desviados de un programa que alimenta a los hogares más pobres de México — tortillas, leche y frijoles que nunca llegaron.',
    },
    detected: {
      en: 'Anchor GT case · avg risk score 0.66 · P6 capture pattern · 90%+ direct-award rate · network links to shell intermediaries',
      es: 'Caso GT ancla · puntaje de riesgo promedio 0.66 · patrón de captura P6 · 90%+ adjudicación directa · vínculos con intermediarios fantasma',
    },
    outcome: {
      en: 'MX$15B diverted from food subsidies · FGR criminal investigation ongoing since 2022 · parastatal placed under federal intervention',
      es: '15,000 MDP desviados de subsidios alimentarios · investigación penal FGR en curso desde 2022 · paraestatal sometida a intervención federal',
    },
  },
  {
    vendorId: 6038,
    name: 'HEMOSER, S.A. DE C.V.',
    risk: 0.85, tier: 1, flags: ['gt'],
    contracts: '~400', value: { en: '$17.2B MXN', es: '17,200 MDP' },
    mxnAmount: 17_200_000_000,
    kicker: { en: 'COVID MEDICAL SUPPLY · SAME-DAY IMSS', es: 'INSUMOS COVID · MISMO DÍA IMSS' },
    lede: {
      en: '$17.2B MXN in IMSS medical supplies awarded during COVID emergency — many contracts signed and fulfilled the same day, a pattern that is physically impossible under normal procurement.',
      es: '17,200 MDP en insumos médicos al IMSS adjudicados durante la emergencia COVID — muchos contratos firmados y cumplidos el mismo día, un patrón físicamente imposible en contratación normal.',
    },
    detected: {
      en: 'ARIA Tier 1 · same-day-award spike pattern · COVID emergency bracket · risk score 0.85 · price ratio above sector by 2.4×',
      es: 'ARIA Tier 1 · patrón de adjudicación mismo-día · emergencia COVID · puntaje 0.85 · razón de precio 2.4× sobre el sector',
    },
    outcome: {
      en: 'Documented in GT corruption corpus · congressional review initiated · part of broader COVID emergency procurement investigation',
      es: 'Documentado en corpus GT · revisión congresional iniciada · parte de la investigación más amplia de compras COVID',
    },
  },
]

export default function Executive() {
  const { t, i18n } = useTranslation('executive')
  const navigate = useNavigate()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  // § 1 The Atlas — constellation mode (PATRONES / SECTORES / SEXENIOS)
  const [atlasMode, setAtlasMode] = useState<ConstellationMode>('patterns')

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
    const totalContracts = d?.overview?.total_contracts ?? 3_051_294
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
    // Estimated value-at-risk: high+critical contract count / total contract
    // count × total spend. This is an approximation that assumes uniform value
    // distribution across risk bands (which is NOT exact — high-risk contracts
    // skew larger). Labeled as ESTIMATED in the UI; the only honest alternative
    // is a backend high_risk_value field that doesn't exist yet.
    const highRiskShare =
      totalContracts > 0 ? highCriticalCount / totalContracts : 0.139
    const valueAtRisk = totalValue * highRiskShare
    return {
      totalContracts,
      totalValue,
      highCriticalRate,
      valueAtRisk,
      highCriticalCount,
    }
  }, [dashboard])

  const handlePrint = () => window.print()

  // § 1 The Observatory — faithful-scatter cluster data (live per-cluster
  // aggregates with static-meta fallback), shared with /atlas via the hook so
  // both surfaces render the identical map.
  const scatterClusters = useScatterClusters(atlasMode, lang)

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
  const spendCurrencyLabel = 'MXN'
  // English-only USD companion — surfaces foreign-reader scale alongside MXN.
  // Spanish stays MXN-only (Mexican audience reads pesos natively).
  const headlineSpendUSD = lang === 'en' ? `≈${formatCompactUSD(TOTAL_SPEND_MXN)}` : null
  // Per-tile descriptors below are inlined into the editorial cards JSX
  // so they can each have a distinctive micro-visualization and layout.

  // ─── Recommendations (3-column audience grid) ──────────────────────────────
  const audiences: Array<{ key: 'a1' | 'a2' | 'a3' }> = [
    { key: 'a1' },
    { key: 'a2' },
    { key: 'a3' },
  ]

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

      <div className="executive-page max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8 relative">
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
            {/* Eyebrow — IBM Plex Mono italic 0.18em archival index pattern */}
            <div
              className="flex items-center gap-3"
              style={{
                fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
                fontSize: '10px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                fontWeight: 400,
              }}
            >
              <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}>Folio·I</span>
              <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
              <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
                {lang === 'en' ? 'RUBLI executive briefing' : 'RUBLI reporte ejecutivo'}
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent transition-colors"
              aria-label={lang === 'en' ? 'Print this page' : 'Imprimir esta página'}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'en' ? 'Print / PDF' : 'Imprimir / PDF'}
            </button>
          </div>

          <div className="text-[11px] font-mono text-text-muted mb-4">
            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
            {' · '}
            {lang === 'en' ? 'Mexico Federal Procurement Analysis' : 'Análisis de Contratación Federal México'}
          </div>

          {/* Headline — EB Garamond italic 500, ochre/red normal-weight accents */}
          <h1
            className="text-[36px] sm:text-[52px] md:text-[64px] leading-[0.98] text-text-primary mb-4 text-balance"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              letterSpacing: '-0.012em',
            }}
          >
            {lang === 'en' ? (
              <>
                Twenty-three years.{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>MX$9.9 trillion</span>
                {' '}in federal contracts. More than{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-risk-critical)' }}>7 in 10</span>
                {' '}bypass competitive bidding.
              </>
            ) : (
              <>
                Veintitrés años.{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>MX$9.9 billones</span>
                {' '}en contratos federales. Más de{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-risk-critical)' }}>7 de cada 10</span>
                {' '}evitan la licitación competitiva.
              </>
            )}
          </h1>

          {/* Dateline — publisher + data provenance, archival mono italic */}
          <p
            className="mb-6"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
              fontStyle: 'italic',
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
              className="mt-1.5 inline-flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-[0.12em]"
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

          {/* Lede — EB Garamond regular 17px / 1.55, max-width 68ch */}
          <p
            className="max-w-[68ch] text-pretty"
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
                  {' '}<em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>two to three times the OECD recommended ceiling</em>.
                  This is not an aberration — it is the structural condition of Mexican federal spending.
                  RUBLI analyzed <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>{formatNumber(stats.totalContracts)} contracts</em> across 23 years,
                  trained its risk model on <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>{gtCaseCount.toLocaleString('en-US')} documented corruption cases</em> — Segalmex, Odebrecht, IMSS Ghost, COVID emergency procurement, and more —
                  and now flags <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>{formatNumber(stats.highCriticalCount)} contracts</em> matching those patterns.
                  {' '}These are investigation signals, not verdicts.
                </>
              : <>
                  Cada administración desde 2001 ha evitado la licitación competitiva a
                  {' '}<em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>dos o tres veces el límite recomendado por la OCDE</em>.
                  No es una anomalía — es la condición estructural del gasto federal mexicano.
                  RUBLI analizó <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>{formatNumber(stats.totalContracts)} contratos</em> en 23 años,
                  entrenó su modelo de riesgo en <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>{gtCaseCount.toLocaleString('es-MX')} casos documentados</em> — Segalmex, Odebrecht, Fantasmas IMSS, emergencia COVID y más —
                  y ahora señala <em style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>{formatNumber(stats.highCriticalCount)} contratos</em> con esas huellas.
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
            <div id="atlas-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? '§ 1 · The Observatory — every contract in one view' : '§ 1 · El Observatorio — cada contrato en una vista'}
            </div>

            {/* Mode toggle */}
            <div
              className="flex items-center text-[9px] font-mono uppercase tracking-[0.1em] rounded-sm overflow-hidden"
              role="tablist"
              aria-label={lang === 'en' ? 'Constellation mode' : 'Modo del Observatorio'}
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
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setAtlasMode(m.id)}
                    className="px-3 py-1.5 transition-colors"
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

          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Each orb is a cluster of the federal contract record — positioned left-to-right by vendor count and bottom-to-top by high-risk rate, sized to the Tier-1 priority leads inside. Toggle the lens to re-cluster the same population by pattern, sector, category, or term, and click any orb to fly into its vendors.'
              : 'Cada orbe es un cúmulo del registro de contratación federal — ubicado de izquierda a derecha por número de proveedores y de abajo hacia arriba por tasa de alto riesgo, dimensionado según los líderes prioritarios Tier-1 que contiene. Alterna la lente para reagrupar la misma población por patrón, sector, categoría o sexenio, y haz clic en cualquier orbe para entrar a sus proveedores.'}
          </p>

          {/* The faithful Observatory — same component as /atlas. It carries
              its own folio frame + how-to-read strip + ranked name index, so it
              is NOT wrapped in PlateFrame (that would double-frame + double the
              encoding caption). */}
          <ObservatoryScatter
            clusters={scatterClusters}
            lens={atlasMode}
            lang={lang}
            onOpenDossier={handleAtlasClusterClick}
            onVendorClick={(id) => navigate(`/vendors/${id}`)}
          />
          {/* Footer link into the full /atlas surface — preserves the
              current lens by passing it through as ?lens=<atlasMode>. */}
          <div className="mt-3 flex items-center justify-end">
            <Link
              to={`/atlas${atlasMode !== 'patterns' ? `?lens=${atlasMode}` : ''}`}
              className="text-[10px] font-mono uppercase tracking-[0.12em] font-bold text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
            >
              {lang === 'en' ? 'Open full Observatory' : 'Abrir Observatorio completo'}
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
          <div id="macro-arc-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1 flex items-center gap-2">
            {lang === 'en' ? 'Five administrations · one structural failure' : 'Cinco administraciones · una falla estructural'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Direct award rate — share of contracts awarded without competitive bidding — has remained 2–3× the OECD ceiling under every Mexican administration since 2001. The AI model trained on this systemic pattern now detects its variants automatically.'
              : 'La tasa de adjudicación directa — contratos sin licitación — ha permanecido 2–3× por encima del umbral OCDE en cada administración mexicana desde 2001. El modelo entrenado en este patrón sistémico lo detecta automáticamente.'}
          </p>
          <PlateFrame
            lang={lang}
            folio="III"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Plate — Direct-award rate stays 2–3× above the OECD ceiling across five administrations.'
              : 'Lámina — La tasa de adjudicación directa permanece 2–3× sobre el techo OCDE en cinco administraciones.'}
          >
            <MacroArc lang={lang} />
          </PlateFrame>
        </motion.section>

        {/* ─── LEAD-TIME ADVANTAGE — Hero #3 (promoted by d-P4 2026-05-04) ─── */}
        <section className="mb-10" aria-labelledby="leadtime-title">
          <div id="leadtime-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Lead-time advantage — when RUBLI saw it vs. when the press did' : 'Ventaja temporal — cuándo lo vio RUBLI vs. cuándo lo vio la prensa'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? <>For each documented corruption case, the gap between when the contracts crossed RUBLI's <strong className="text-text-primary">critical-risk threshold</strong> in the data, and when the scandal became public. The bigger the gap, the longer the platform could have flagged it for investigation.</>
              : <>Para cada caso documentado, la distancia entre cuándo los contratos cruzaron el <strong className="text-text-primary">umbral de riesgo crítico</strong> en los datos, y cuándo el escándalo se hizo público. Cuanto mayor la brecha, más tiempo la plataforma habría podido señalarlo.</>
            }
          </p>
          <PlateFrame
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

        {/* DashboardSledgehammer DELETED 2026-05-05 per user critique:
            "delete it. We already have that same figure below." The MacroArc
            chart above already carries the 74% headline + the trend; the
            duplicated giant Playfair number was redundant. */}

        {/* ─── HEADLINE NUMBERS — investigative sequence (4 chapters)
            Reads as one argument: spend → bypass → flag → catch.
            Each tile carries a chapter kicker (I/II/III/IV) and a tail
            connector ("of which …") that ties to the next step. ─── */}
        <section className="mb-12">
          <PlateFrame
            lang={lang}
            folio="V"
            contextLabel={{ en: 'Headline numbers', es: 'Cifras clave' }}
            caption={lang === 'en'
              ? 'Plate — Four chapters of the federal-procurement record, read left-to-right: total spend, the bypass, the flag, the catch.'
              : 'Lámina — Cuatro capítulos del registro federal, leídos de izquierda a derecha: el gasto, el desvío, la marca, la captura.'}
          >
          {(() => {
            // Chapter-marker rail: one Roman per step, sitting above the tile.
            // Each marker carries the tile's accent color so the eye can map
            // marker → tile at a glance. Tail captions ("of which 75% …") on
            // the right edge of each marker hand off to the next chapter.
            type Step = {
              roman: string
              accent: string
              kicker: { en: string; es: string }
              tail: { en: string; es: string } | null
              story: string
              ariaLabel: { en: string; es: string }
            }
            const steps: Step[] = [
              {
                roman: 'I',
                accent: '#a06820',
                kicker: { en: 'The spend', es: 'El gasto' },
                tail:   { en: 'of which —', es: 'del cual —' },
                story: '/stories/el-gran-precio',
                ariaLabel: { en: 'Read: The Bigger the Contract the Higher the Risk', es: 'Leer: A Mayor Contrato, Mayor Riesgo' },
              },
              {
                roman: 'II',
                accent: '#dc2626',
                kicker: { en: 'The bypass', es: 'El desvío' },
                tail:   { en: 'inside that bypass —', es: 'dentro de ese desvío —' },
                story: '/stories/marea-de-adjudicaciones',
                ariaLabel: { en: 'Read: The Direct Award Tide', es: 'Leer: La Marea de las Adjudicaciones' },
              },
              {
                roman: 'III',
                accent: '#f59e0b',
                kicker: { en: 'The flag', es: 'La marca' },
                tail:   { en: 'and the catch —', es: 'y la captura —' },
                story: '/stories/el-sexenio-del-riesgo',
                ariaLabel: { en: 'Read: The Era of Risk', es: 'Leer: El Sexenio del Riesgo' },
              },
              {
                roman: 'IV',
                accent: 'var(--color-text-primary)',
                kicker: { en: 'The catch', es: 'La captura' },
                tail: null,
                story: '/stories/volatilidad-el-precio-del-riesgo',
                ariaLabel: { en: 'Read: Price Volatility — The Algorithm\'s Smoking Gun', es: 'Leer: Volatilidad — El Precio del Riesgo' },
              },
            ]

            const ChapterRail = ({ step, delay }: { step: Step; delay: number }) => (
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay }}
              >
                <div className="flex items-baseline gap-2.5">
                  <span
                    className="leading-none tabular-nums"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: 22,
                      color: step.accent,
                    }}
                  >
                    {step.roman}
                  </span>
                  <span className="h-[2px] flex-1" style={{ background: step.accent, opacity: 0.55 }} />
                  <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] whitespace-nowrap" style={{ color: step.accent, opacity: 0.95 }}>
                    {lang === 'en' ? step.kicker.en : step.kicker.es}
                  </span>
                </div>
                {/* Tail caption "of which → ..." removed 2026-05-21: the
                    absolutely-positioned overlay collided with the kicker label
                    at all viewport widths, mashing the two into a single
                    unreadable line. The narrative arc is still legible from
                    the Roman numerals + plate caption below. */}
              </motion.div>
            )

            // Shared tile chrome — a single panel with the accent moved to the
            // chapter rail above, not the tile's left edge. The bottom hairline
            // unifies the row visually.
            const tileBase =
              'relative cursor-pointer group p-5 pt-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'

            // Wrap each "column" so the chapter rail and tile share width.
            const ColumnFrame = ({ children, step, onActivate, ariaLabel }: {
              children: React.ReactNode
              step: Step
              onActivate: () => void
              ariaLabel: string
            }) => (
              <div className="relative flex flex-col">
                <ChapterRail step={step} delay={0.05 + steps.indexOf(step) * 0.06} />
                <div
                  className={`${tileBase} surface-card rounded-sm mt-2 hover:shadow-lg`}
                  onClick={onActivate}
                  onKeyDown={(e) => { if (e.key === 'Enter') onActivate() }}
                  tabIndex={0}
                  role="link"
                  aria-label={ariaLabel}
                  style={{ outlineColor: step.accent }}
                >
                  {/* drop-line fusing chapter rail to tile (lg only — on
                      stacked layouts the rail already sits flush above) */}
                  <span
                    className="hidden lg:block absolute -top-2 left-0 w-[2px] h-2"
                    style={{ background: step.accent, opacity: 0.55 }}
                    aria-hidden="true"
                  />
                  {children}
                </div>
              </div>
            )

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7">

                {/* Chapter I — The Spend */}
                <ColumnFrame
                  step={steps[0]}
                  onActivate={() => navigate(steps[0].story)}
                  ariaLabel={lang === 'en' ? steps[0].ariaLabel.en : steps[0].ariaLabel.es}
                >
                  <div
                    className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                      fontSize: 48,
                      color: '#a06820',
                    }}
                  >
                    {headlineSpend}
                  </div>
                  {headlineSpendUSD && (
                    <div className="font-mono text-[11px] tracking-[0.04em] tabular-nums mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.85 }}>
                      {headlineSpendUSD}
                    </div>
                  )}
                  <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1">
                    {spendCurrencyLabel} {lang === 'en' ? '· over 23 years' : '· en 23 años'}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                    {lang === 'en' ? 'ANALYZED SPEND' : 'GASTO ANALIZADO'}
                  </div>
                  <svg viewBox="0 0 200 22" className="w-full mt-1" style={{ height: 22 }} aria-hidden>
                    {Array.from({ length: 23 }).map((_, i) => {
                      const w = 7
                      const gap = 1.5
                      const x = i * (w + gap)
                      const heights = [10, 11, 12, 13, 14, 15, 16, 17, 17, 17, 18, 18, 18, 19, 20, 20, 20, 20, 19, 22, 21, 19, 14]
                      const h = heights[i] ?? 14
                      return <rect key={i} x={x} y={22 - h} width={w} height={h} fill="#a06820" fillOpacity={0.55} rx={1} />
                    })}
                  </svg>
                  <div className="mt-2.5 pt-1.5 text-[9px] font-mono text-text-muted leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
                    {lang === 'en' ? '3.05M contracts · 12 sectors · post-outlier' : '3.05M contratos · 12 sectores · post-atípicos'}
                  </div>
                </ColumnFrame>

                {/* Chapter II — The Bypass */}
                <ColumnFrame
                  step={steps[1]}
                  onActivate={() => navigate(steps[1].story)}
                  ariaLabel={lang === 'en' ? steps[1].ariaLabel.en : steps[1].ariaLabel.es}
                >
                  <div
                    className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                      fontSize: 48,
                      color: '#dc2626',
                    }}
                  >
                    75<span className="text-[26px] align-baseline" style={{ fontFamily: 'inherit' }}>%</span>
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1.5">
                    {lang === 'en' ? '· vs 30% OECD ceiling' : '· vs umbral OCDE 30%'}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                    {lang === 'en' ? 'DIRECT AWARDS' : 'ADJUDICACIÓN DIRECTA'}
                  </div>
                  <svg viewBox="0 0 200 22" className="w-full mt-1" style={{ height: 22 }} aria-hidden>
                    {Array.from({ length: 100 }).map((_, i) => {
                      const cols = 25
                      const col = i % cols
                      const row = Math.floor(i / cols)
                      const cx = 4 + col * 7.5
                      const cy = 4 + row * 5
                      const isDA = i < 75
                      return (
                        <circle key={i} cx={cx} cy={cy} r={1.6}
                          fill={isDA ? '#dc2626' : 'var(--color-border-hover)'}
                          fillOpacity={isDA ? 0.85 : 0.55} />
                      )
                    })}
                    <line x1={4 + 30 * 7.5 / 25} x2={4 + 30 * 7.5 / 25} y1={1} y2={21}
                      stroke="#10b981" strokeWidth={1.2} strokeDasharray="2 2" opacity={0.7} />
                  </svg>
                  <div className="mt-2.5 pt-1.5 text-[9px] font-mono text-text-muted leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
                    {lang === 'en' ? '2.5× the OECD recommended ceiling' : '2.5× el umbral recomendado OCDE'}
                  </div>
                </ColumnFrame>

                {/* Chapter III — The Flag */}
                <ColumnFrame
                  step={steps[2]}
                  onActivate={() => navigate(steps[2].story)}
                  ariaLabel={lang === 'en' ? steps[2].ariaLabel.en : steps[2].ariaLabel.es}
                >
                  <div
                    className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                      fontSize: 40,
                      color: '#f59e0b',
                    }}
                  >
                    {formatNumber(stats.highCriticalCount)}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1.5">
                    {lang === 'en' ? '· 11.0% of all flagged' : '· 11.0% del total marcado'}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                    {lang === 'en' ? 'HIGH + CRITICAL' : 'ALTO + CRÍTICO'}
                  </div>
                  <div className="flex h-[14px] w-full rounded-sm overflow-hidden gap-[1px]" style={{ background: 'var(--color-border)' }}>
                    <div style={{ width: '5.20%', background: '#dc2626', opacity: 0.85 }} />
                    <div style={{ width: '5.90%', background: '#f59e0b', opacity: 0.85 }} />
                    <div style={{ width: '16.20%', background: '#a06820', opacity: 0.40 }} />
                    <div style={{ width: '72.70%', background: 'var(--color-text-muted)', opacity: 0.20 }} />
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-text-muted mt-2.5 pt-1.5 leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
                    <span style={{ color: 'var(--color-risk-critical)' }}>● {lang === 'en' ? 'crit' : 'crít'} 5%</span>
                    <span style={{ color: 'var(--color-risk-high)' }}>● {lang === 'en' ? 'high' : 'alto'} 6%</span>
                    <span style={{ color: 'var(--color-risk-medium)' }}>● {lang === 'en' ? 'med' : 'med'} 16%</span>
                  </div>
                </ColumnFrame>

                {/* Chapter IV — The Catch */}
                <ColumnFrame
                  step={steps[3]}
                  onActivate={() => navigate(steps[3].story)}
                  ariaLabel={lang === 'en' ? steps[3].ariaLabel.en : steps[3].ariaLabel.es}
                >
                  <div
                    className="font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                      fontSize: 48,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    0.785
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.1em] text-text-muted mt-1.5">
                    {lang === 'en' ? '· random = 0.5  ·  perfect = 1.0' : '· azar = 0.5  ·  perfecto = 1.0'}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 mb-2">
                    {lang === 'en' ? 'MODEL ACCURACY' : 'PRECISIÓN MODELO'}
                  </div>
                  <div className="relative h-[14px] w-full rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div
                      className="absolute inset-y-0 rounded-sm"
                      style={{
                        left: '0%',
                        width: '57%',
                        background: 'linear-gradient(90deg, var(--color-text-muted) 0%, #a06820 100%)',
                        opacity: 0.65,
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-[2px]"
                      style={{ left: '57%', background: 'var(--color-text-primary)' }}
                    />
                    <div
                      className="absolute -bottom-0.5 -translate-x-1/2 w-2 h-2 rotate-45 rounded-[1px]"
                      style={{ left: '57%', background: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-text-muted mt-2.5 pt-1.5 leading-[1.4]" style={{ borderTop: '1px solid rgba(160, 104, 32, 0.18)' }}>
                    <span>0.5 {lang === 'en' ? '· random' : '· azar'}</span>
                    <span style={{ color: 'var(--color-accent)' }}>● {lang === 'en' ? 'v0.8.5' : 'v0.8.5'}</span>
                    <span>1.0 {lang === 'en' ? '· perfect' : '· perfecto'}</span>
                  </div>
                </ColumnFrame>

              </div>
            )
          })()}
          </PlateFrame>
        </section>

        {/* ─── KEY FINDINGS — specific discoveries with animated visualizations ─── */}
        <section className="mb-12" aria-labelledby="findings-title">
          <div id="findings-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'What the analysis found' : 'Lo que encontró el análisis'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-5 text-pretty">
            {lang === 'en'
              ? 'Four findings that only became visible at scale — impossible to see by auditing contracts one by one.'
              : 'Cuatro hallazgos que solo se volvieron visibles a escala — imposibles de detectar auditando contrato por contrato.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Finding 01 — Ghost Economy: compare-gap animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#dc2626' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate('/aria?pattern=P2')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open ghost-company investigation queue (ARIA P2)' : 'Abrir cola de investigación de empresas fantasma (ARIA P2)'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/aria?pattern=P2') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 01 · GHOST ECONOMY' : 'HALLAZGO 01 · ECONOMÍA FANTASMA'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: 'var(--color-risk-critical)' }}>
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
                    <span className="font-mono font-bold text-[15px] leading-none" style={{ color: 'var(--color-risk-critical)' }}>
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
                        style={{ color: 'var(--color-risk-critical)' }}
                      >
                        6,118
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1"
                        style={{ color: 'var(--color-risk-critical)', opacity: 0.65 }}
                      >
                        {lang === 'en' ? 'RUBLI detected' : 'RUBLI detectó'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'SAT officially confirmed 42. RUBLI found 145× more.' : 'SAT confirmó 42 oficialmente. RUBLI encontró 145× más.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'No digital footprint, burst activity, RFC anomalies, shared addresses. The 97% detection gap means most ghost-company fraud goes unregistered — and unrecovered.'
                  : 'Sin huella digital, actividad en ráfaga, anomalías RFC, domicilios compartidos. La brecha del 97% significa que la mayoría del fraude fantasma no se registra — y no se recupera.'}
              </p>
            </motion.article>

            {/* Finding 02 — Audit Blindspot: fill animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#f59e0b' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.1 }}
              onClick={() => navigate('/contracts?risk_level=critical&min_amount=5000000000')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open contracts above MX$5B at critical risk' : 'Ver contratos sobre MX$5B con riesgo crítico'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/contracts?risk_level=critical&min_amount=5000000000') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 02 · AUDIT BLINDSPOT' : 'HALLAZGO 02 · PUNTO CIEGO DE AUDITORÍA'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: 'var(--color-risk-high)' }}>
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
                    <span className="font-mono font-bold text-[15px] leading-none" style={{ color: 'var(--color-risk-high)' }}>
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
                        className="font-mono font-bold text-[36px] leading-none tabular-nums"
                        style={{ color: 'var(--color-risk-high)' }}
                      >
                        {lang === 'en' ? 'MX$1.25T' : 'MX$1.25 bln'}
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-[0.1em] mt-1.5"
                        style={{ color: 'var(--color-risk-high)', opacity: 0.7 }}
                      >
                        {lang === 'en' ? '95% never audited' : '95% sin auditar · billones'}
                      </span>
                    </motion.div>
                  </div>

                </div>
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'MX$1.25 trillion above 5B MXN — zero audit coverage.' : 'MX$1.25 billones sobre 5,000 MDP — sin cobertura de auditoría.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'ASF reviews ~5% of contracts above MX$5B annually. At that rate, a high-value contract waits ~25 years for review — long after the money is gone and the vendor dissolved.'
                  : 'La ASF revisa ~5% de contratos sobre 5,000 MDP al año. A ese ritmo, un contrato de alto valor espera ~25 años para ser revisado — mucho después de que el dinero desapareció.'}
              </p>
            </motion.article>

            {/* Finding 03 — Threshold Gaming: two-bar comparison */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#8b5cf6' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.2 }}
              onClick={() => navigate('/contracts?procedure_type=ADJUDICACION_DIRECTA&sort_by=amount&sort_order=desc')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open direct-award contracts sorted by amount' : 'Ver contratos por adjudicación directa ordenados por monto'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/contracts?procedure_type=ADJUDICACION_DIRECTA&sort_by=amount&sort_order=desc') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 03 · THRESHOLD GAMING' : 'HALLAZGO 03 · JUEGO DE UMBRALES'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: '#8b5cf6' }}>
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
                        fontSize={9}
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
                        fontSize={9}
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
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'Contracts cluster statistically just below tender thresholds.' : 'Los contratos se agrupan estadísticamente justo debajo de los umbrales.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'Large contracts split into multiple awards just below the legal threshold that triggers public tender. The density spike is detectable only across all 3.1M contracts at once.'
                  : 'Contratos grandes divididos en múltiples adjudicaciones justo bajo el umbral legal. El pico de densidad solo es detectable con los 3.1M contratos a la vez.'}
              </p>
            </motion.article>

            {/* Finding 04 — Institutional Capture: dot-field animation */}
            <motion.article
              className="surface-card rounded-sm p-5 border-l-2 cursor-pointer group hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              style={{ borderLeftColor: '#a06820' }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.3 }}
              onClick={() => navigate('/aria?pattern=P6')}
              tabIndex={0}
              role="link"
              aria-label={lang === 'en' ? 'Open institutional capture pattern (ARIA P6) investigation queue' : 'Abrir cola de captura institucional (ARIA P6)'}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/aria?pattern=P6') }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  {lang === 'en' ? 'FINDING 04 · INSTITUTIONAL CAPTURE' : 'HALLAZGO 04 · CAPTURA INSTITUCIONAL'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                  {lang === 'en' ? 'investigate' : 'investigar'}
                  <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              </div>

              {/* Plain-English explanation of the pattern, before any number */}
              <p className="text-xs text-text-secondary leading-[1.55] mb-3">
                {lang === 'en'
                  ? <>One vendor controls <strong className="text-text-primary">80%+ of one institution's category budget for five-plus years</strong>. RUBLI calls this <span className="font-mono" style={{ color: 'var(--color-accent)' }}>P6 — capture</span>: a monopoly built inside a single agency, often invisible at the national level.</>
                  : <>Un proveedor controla <strong className="text-text-primary">80% o más del presupuesto de una categoría dentro de una institución durante cinco o más años</strong>. RUBLI lo llama <span className="font-mono" style={{ color: 'var(--color-accent)' }}>P6 — captura</span>: un monopolio construido dentro de una sola dependencia, frecuentemente invisible a nivel nacional.</>
                }
              </p>

              <div className="flex items-end gap-3 mb-4">
                <span className="font-mono font-bold text-[40px] tabular-nums leading-none" style={{ color: 'var(--color-accent)' }}>15,923</span>
                <span className="font-mono text-[11px] text-text-muted mb-1 leading-[1.35]">{lang === 'en' ? 'vendors fit\nthe P6 fingerprint' : 'proveedores ajustan\na la huella P6'}</span>
              </div>
              {/* Cleveland pair per institution: filled dot = top vendor share,
                  open dot = second vendor share. Gap reveals capture. */}
              <div className="mb-4">
                {(() => {
                  // Live top-5 from capture_results (sorted by capture score DESC).
                  // Fallback to static values if the API hasn't resolved yet.
                  const INST_DATA = captureLeadersData?.leaders ?? [
                    { label: 'ASIPONA', top: 76, second: 20, captured: true  },
                    { label: 'LOTERIA', top: 77, second:  2, captured: true  },
                    { label: 'SIAP',    top: 81, second: 16, captured: true  },
                    { label: 'SPF',     top: 70, second:  9, captured: true  },
                    { label: 'AFAC',    top: 81, second: 10, captured: true  },
                  ]
                  const SVG_W = 240
                  const PAD_L = 10
                  const PAD_R = 52  // gap label space
                  const TRACK_W = SVG_W - PAD_L - PAD_R
                  const xPos = (pct: number) => PAD_L + (pct / 100) * TRACK_W
                  const ROW_H = 22

                  return (
                    <>
                      {INST_DATA.map((inst, iIdx) => {
                        const gap = inst.top - inst.second
                        const dotColor = inst.captured ? '#a06820' : 'var(--color-text-primary)'
                        return (
                          <div key={inst.label} className="flex items-center gap-2 mb-[3px]">
                            <span
                              className="text-[8px] font-mono flex-shrink-0 text-right"
                              style={{
                                width: 46,
                                color: inst.captured ? '#a06820' : 'var(--color-text-muted)',
                                fontWeight: inst.captured ? 700 : 400,
                              }}
                            >
                              {inst.captured ? '▶ ' : ''}{inst.label}
                            </span>

                            <motion.svg
                              width={SVG_W}
                              height={ROW_H}
                              style={{ flexShrink: 0, overflow: 'visible' }}
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.45, delay: 0.1 + iIdx * 0.08 }}
                            >
                              {/* Guide line */}
                              <line
                                x1={PAD_L}
                                x2={SVG_W - PAD_R}
                                y1={ROW_H / 2}
                                y2={ROW_H / 2}
                                stroke="var(--color-border)"
                                strokeWidth={0.6}
                              />
                              {/* Connector between the two dots */}
                              <line
                                x1={xPos(inst.second)}
                                x2={xPos(inst.top)}
                                y1={ROW_H / 2}
                                y2={ROW_H / 2}
                                stroke={inst.captured ? '#a06820' : 'var(--color-text-muted)'}
                                strokeWidth={1.4}
                                strokeOpacity={inst.captured ? 0.85 : 0.45}
                              />
                              {/* Open circle = second vendor */}
                              <circle
                                cx={xPos(inst.second)}
                                cy={ROW_H / 2}
                                r={4}
                                fill="none"
                                stroke="var(--color-text-muted)"
                                strokeWidth={1.2}
                              />
                              {/* Filled circle = top vendor */}
                              <circle
                                cx={xPos(inst.top)}
                                cy={ROW_H / 2}
                                r={5}
                                fill={dotColor}
                                fillOpacity={inst.captured ? 1 : 0.7}
                              />
                              {/* Gap annotation */}
                              <text
                                x={SVG_W - PAD_R + 5}
                                y={ROW_H / 2 + 3.5}
                                fontSize={8}
                                fontFamily="var(--font-family-mono,monospace)"
                                fontWeight="700"
                                fill={inst.captured ? '#a06820' : 'var(--color-text-muted)'}
                              >
                                +{Number.isInteger(gap) ? gap : gap.toFixed(1)}pp
                              </text>
                            </motion.svg>
                          </div>
                        )
                      })}

                      <div className="text-[8px] font-mono text-text-muted mt-1.5 leading-[1.4]">
                        {lang === 'en'
                          ? '● top vendor share · ○ second vendor · gap = concentration advantage'
                          : '● cuota proveedor 1 · ○ proveedor 2 · brecha = ventaja de concentración'}
                      </div>
                    </>
                  )
                })()}
              </div>
              <h3 className="font-semibold text-[13px] text-text-primary leading-[1.3] mb-1.5">
                {lang === 'en' ? 'One vendor locks one institution — year after year, no competition.' : 'Un proveedor captura una institución — año tras año, sin competencia.'}
              </h3>
              <p className="text-xs text-text-secondary leading-[1.6]">
                {lang === 'en'
                  ? 'P6 capture differs from national monopoly: abnormal concentration in one agency with above-threshold risk. Detectable only through cross-institution comparison.'
                  : 'La captura P6 difiere del monopolio nacional: concentración anormal en una sola agencia con riesgo por encima del umbral. Solo detectable comparando entre instituciones.'}
              </p>
            </motion.article>

          </div>
        </section>

        {/* ─── PESOS AT RISK — estimated overpayment by pattern ─── */}
        <section className="mb-12" aria-labelledby="pesos-title">
          <div id="pesos-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? 'Pesos at risk — estimated exposure by corruption pattern' : 'Pesos en riesgo — exposición estimada por patrón'}
          </div>
          {/* U-007: surface the methodological caveat that previously only
              lived as a code comment. The aggregate scales high+critical
              contract counts by total spend, assuming each risk band's
              average ticket equals the population mean. */}
          <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted/70 mb-2">
            {lang === 'en'
              ? '(estimated · assumes uniform value distribution across risk bands)'
              : '(estimado · supone distribución uniforme de valor entre bandas de riesgo)'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Risk scores count contracts. This counts pesos. For each ARIA pattern we estimate the financial exposure using pattern-specific overpayment models — direct overcharges (P5), full ghost-network volume (P2), capture premiums, monopoly discounts lost. Estimates are illustrative; methodology in the footnote.'
              : 'Los puntajes cuentan contratos. Esto cuenta pesos. Para cada patrón ARIA estimamos la exposición financiera usando modelos específicos de sobrepago — sobrecargos directos (P5), volumen completo de redes fantasma (P2), premios de captura, descuentos monopólicos perdidos. Las estimaciones son ilustrativas; metodología en la nota.'}
          </p>
          <PlateFrame
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
        <section className="mb-12" aria-labelledby="categories-title">
          <div className="flex items-start justify-between mb-1">
            <div id="categories-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
              {lang === 'en' ? 'Where the money goes — top spending categories' : 'Dónde va el dinero — principales categorías de gasto'}
            </div>
            <button
              onClick={() => navigate('/sectors?view=categories')}
              className="text-[10px] font-mono uppercase tracking-[0.1em] text-accent hover:text-accent transition-colors inline-flex items-center gap-1 flex-shrink-0 ml-4"
            >
              {lang === 'en' ? 'All categories' : 'Todas'}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Cell width = total spend; cell color = sector palette tinted by risk score. The top 8 categories cover the majority of federal spend.'
              : 'Ancho de celda = gasto total; color de celda = paleta sectorial teñida por puntaje de riesgo. Las 8 categorías principales cubren la mayoría del gasto federal.'}
          </p>
          <PlateFrame
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
        <section className="mb-12" aria-labelledby="la-lente-title">
          <div id="la-lente-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
            {lang === 'en' ? '§ 2 · The Lens — narrowing 3.1M to 299' : '§ 2 · La Lente — de 3.1M a 299'}
          </div>
          <p className="text-xs text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Four filters in sequence — risk model, then ARIA patterns, then GT match, then manual triage. Each step narrows the population further; the last 299 are hand-investigable today.'
              : 'Cuatro filtros en cadena — modelo de riesgo, patrones ARIA, coincidencia con GT, y triaje manual. Cada paso reduce la población; los últimos 299 son investigables a mano hoy.'}
          </p>

          <PlateFrame
            lang={lang}
            folio="VIII"
            contextLabel={{ en: 'Executive briefing', es: 'Reporte ejecutivo' }}
            caption={lang === 'en'
              ? 'Cascade — from 3.1M COMPRANET records to 299 hand-investigable T1 vendors. Each filter step\'s retention shown in log-scale; 43 GT cases anchor the model below.'
              : 'Cascada — de 3.1M registros COMPRANET a 299 proveedores T1 investigables a mano. La retención de cada paso se muestra en escala logarítmica; 43 casos GT anclan el modelo abajo.'}
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
                    <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted opacity-75">
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
                          <a
                            href={r.href}
                            className="group grid items-baseline gap-x-4 py-2 transition-colors hover:bg-[color:var(--color-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            style={{ gridTemplateColumns: '136px minmax(0,1fr) 92px' }}
                            aria-label={`${formatNumber(r.count)} — ${r.label[lang]}`}
                          >
                            {/* Count — Playfair Italic 800 anchor */}
                            <span
                              className="tabular-nums leading-none text-right pr-1"
                              style={{
                                fontFamily: "'Playfair Display', Georgia, serif",
                                fontStyle: 'italic',
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
                              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted leading-[1.3] truncate">
                                {r.label[lang]}
                              </div>
                            </div>

                            {/* Percentage readout */}
                            <span className="font-mono tabular-nums text-[11px] text-text-secondary text-right group-hover:text-text-primary transition-colors">
                              {fmtPct(r.pct)}
                            </span>
                          </a>

                          {/* Filter-operation caption between this rung and next */}
                          {r.operation && (
                            <div className="grid gap-x-4 py-1.5" style={{ gridTemplateColumns: '136px minmax(0,1fr) 92px' }}>
                              <span /> {/* spacer for count column */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="text-[10.5px] leading-[1.4] truncate"
                                  style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    fontStyle: 'italic',
                                    color: 'var(--color-text-secondary)',
                                    opacity: 0.85,
                                  }}
                                >
                                  {r.operation[lang]}
                                </span>
                              </div>
                              {/* × drop readout, paired with the operation.
                                  Color tints toward the destination rung so the
                                  eye reads "this drop lands in critical territory". */}
                              {rungs[i + 1]?.drop != null && (
                                <span className="font-mono tabular-nums text-[9.5px] text-right" style={{ color: rungColors[i + 1], opacity: 0.8, letterSpacing: '0.06em' }}>
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
                  <motion.a
                    href="/cases"
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="group block mt-5 pt-3 transition-colors hover:bg-[color:var(--color-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    style={{ borderTop: '1px dashed rgba(160, 104, 32, 0.45)' }}
                    aria-label={lang === 'en'
                      ? `43 documented cases · ${formatNumber(GROUND_TRUTH_VENDOR_COUNT_FALLBACK)} GT vendors — training corpus`
                      : `43 casos documentados · ${formatNumber(GROUND_TRUTH_VENDOR_COUNT_FALLBACK)} proveedores GT — corpus de entrenamiento`}
                  >
                    <div className="grid items-baseline gap-x-4" style={{ gridTemplateColumns: '136px minmax(0,1fr) 92px' }}>
                      {/* Eyebrow + count, indented to align under count column */}
                      <div className="flex flex-col gap-1 items-end pr-1">
                        <span className="text-[8.5px] font-mono uppercase tracking-[0.18em]" style={{ color: '#a06820', opacity: 0.75 }}>
                          {lang === 'en' ? 'Anchor' : 'Ancla'}
                        </span>
                        <span
                          className="tabular-nums leading-none"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontStyle: 'italic',
                            fontWeight: 800,
                            fontSize: 22,
                            color: '#a06820',
                            opacity: 0.85,
                          }}
                        >
                          43
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: '#a06820', opacity: 0.75 }}>
                          {lang === 'en' ? 'Training corpus' : 'Corpus de entrenamiento'}
                        </div>
                        <div className="text-[11px] text-text-secondary group-hover:text-text-primary transition-colors leading-[1.4]">
                          {lang === 'en'
                            ? <>43 documented · <span className="tabular-nums">{formatNumber(gtVendors)}</span> GT vendors</>
                            : <>43 documentados · <span className="tabular-nums">{formatNumber(gtVendors)}</span> proveedores GT</>}
                        </div>
                        <div
                          className="text-[10px] leading-[1.4] mt-0.5"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontStyle: 'italic',
                            color: 'var(--color-text-muted)',
                            opacity: 0.85,
                          }}
                        >
                          {lang === 'en' ? '← informs every filter above' : '← informa todos los filtros anteriores'}
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-[9.5px] text-right uppercase tracking-[0.12em] text-text-muted self-start">
                        {lang === 'en' ? 'seed' : 'semilla'}
                      </span>
                    </div>
                  </motion.a>
                </div>
              )
            })()}

            {/* Methodology footer — supplementary stats inline */}
            <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-text-muted leading-[1.6]">
              {lang === 'en' ? (
                <>
                  Per-sector calibrated logistic regression · vendor-stratified validation · Test AUC <strong className="text-text-secondary">0.785</strong> · 72 active spending categories · 1,830 vendor memos (440 LLM-narrative) · model <strong className="text-text-secondary">v0.8.5</strong>. See the{' '}
                  <a href="/methodology" className="text-accent hover:underline">methodology</a> for scope and limits.
                </>
              ) : (
                <>
                  Regresión logística calibrada por sector · validación estratificada por proveedor · AUC <strong className="text-text-secondary">0.785</strong> · 72 categorías activas · 1,830 memos de proveedores (440 LLM-narrativos) · modelo <strong className="text-text-secondary">v0.8.5</strong>. Consulta la{' '}
                  <a href="/methodology" className="text-accent hover:underline">metodología</a> para alcance y límites.
                </>
              )}
            </div>
          </PlateFrame>
        </section>

        {/* ─── § 5 HISTORIAS EJEMPLARES — try-it dossiers ─── */}
        <section className="mb-12" aria-labelledby="historias-title">
          <div id="historias-title" className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {lang === 'en' ? '§ 5 · Example dossiers — open one' : '§ 5 · Historias ejemplares — abre una'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EXAMPLE_DOSSIERS.map((d) => {
              // First sentence of the lede only — the rest lives on the
              // full vendor dossier. This card's job is to invite a click,
              // not summarize the case.
              // Split on sentence-ending period (followed by whitespace or
              // end) OR em-dash — NOT decimal points inside amounts like
              // "$133.2B" (caught by the trailing-digit lookahead).
              const pullQuote = d.lede[lang].split(/\.(?=\s|$)|—/)[0].trim() + '.'
              return (
                <div
                  key={d.vendorId}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/vendors/${d.vendorId}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/vendors/${d.vendorId}`) }}
                  className="group surface-card p-5 rounded-sm flex flex-col cursor-pointer hover:border-border-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  aria-label={`${lang === 'en' ? 'Open dossier' : 'Abrir dossier'}: ${d.name}`}
                >
                  <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                    {d.kicker[lang]}
                  </div>

                  <div className="mb-4">
                    <EntityIdentityChip
                      type="vendor"
                      id={d.vendorId}
                      name={d.name}
                      riskScore={d.risk}
                      ariaTier={d.tier}
                      flags={d.flags}
                      size="md"
                      narrative
                    />
                  </div>

                  {/* Single editorial pull-quote — first sentence of the lede */}
                  <p
                    className="text-[14px] leading-[1.55] mb-5 text-pretty flex-1"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {pullQuote}
                  </p>

                  {/* Footer: stat (MXN + USD scale companion) + open affordance.
                      Two-line stack so USD reads as supporting scale, not a
                      competing number. */}
                  <div className="flex items-end justify-between gap-3 pt-3 border-t border-border/40 text-[11px] font-mono">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <span className="tabular-nums">{d.value[lang]}</span>
                        <span className="text-text-muted" aria-hidden="true">·</span>
                        <span className="tabular-nums text-text-muted">{d.contracts}</span>
                      </div>
                      <span className="text-[10px] tabular-nums text-text-muted opacity-80">
                        ≈{formatCompactUSD(d.mxnAmount)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-text-muted group-hover:text-accent transition-colors self-end pb-0.5">
                      {lang === 'en' ? 'Open' : 'Abrir'}
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── Amber divider ─── */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-40 mb-10" />

        {/* ─── Documented Cases Timeline ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 flex items-center gap-2">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {lang === 'en' ? 'Documented corruption cases · 2008–2025' : 'Casos documentados de corrupción · 2008–2025'}
          </div>
          <p className="text-sm text-text-secondary leading-[1.6] mb-4 text-pretty">
            {lang === 'en'
              ? 'Ten landmark cases — IMSS ghost companies, Segalmex, Odebrecht, COVID-19 emergency procurement — form the backbone of the model\'s ground truth. The model detects these patterns years before the scandal becomes public.'
              : 'Diez casos emblemáticos — empresas fantasma IMSS, Segalmex, Odebrecht, compras de emergencia COVID-19 — forman la base de verdad del modelo. El modelo detecta estos patrones años antes de que el escándalo se haga público.'}
          </p>
          <PlateFrame
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

        {/* ─── Recommendations by Audience ─── */}
        <section className="mb-12">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            {t('recommendations.sectionLabel')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {audiences.map((a, idx) => (
              <motion.div
                key={a.key}
                className="surface-card rounded-sm p-5 border-l-2 border-accent/40"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
              >
                <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-accent mb-3">
                  {t(`recommendations.${a.key}.audience`)}
                </div>
                <ul className="space-y-3">
                  {(['s1', 's2', 's3'] as const).map((s, sIdx) => (
                    <li key={s} className="text-xs text-text-secondary leading-[1.6] flex gap-2">
                      <span className="font-mono text-text-muted tabular-nums shrink-0">
                        {String(sIdx + 1).padStart(2, '0')}
                      </span>
                      <span>{t(`recommendations.${a.key}.${s}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Recent Critical Alerts — live news wire ─── */}
        {recentCritical.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden />
                {lang === 'en' ? 'Recent critical alerts' : 'Alertas críticas recientes'}
              </div>
              <button
                onClick={() => navigate('/contracts?risk_level=critical')}
                className="text-[11px] font-mono uppercase tracking-[0.12em] text-accent hover:text-accent transition-colors inline-flex items-center gap-1"
              >
                {lang === 'en' ? 'View all' : 'Ver todas'}
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-text-secondary leading-[1.6] mb-4 text-pretty">
              {lang === 'en'
                ? 'Five contracts most recently flagged at critical risk by the live model. Each is an investigation signal — not a verdict.'
                : 'Los cinco contratos marcados más recientemente en riesgo crítico por el modelo. Cada uno es una señal de investigación — no un veredicto.'}
            </p>
            <div className="surface-card rounded-sm overflow-hidden divide-y divide-border/50">
              {recentCritical.slice(0, 5).map((c) => {
                const sectorColor = c.sector_name
                  ? SECTOR_COLORS[c.sector_name.toLowerCase()] ?? '#64748b'
                  : '#64748b'
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/contracts/${c.id}`)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/contracts/${c.id}`)}
                    role="link"
                    tabIndex={0}
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-background-elevated transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 focus:bg-background-elevated"
                  >
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold tracking-[0.1em] flex-shrink-0 w-[72px] justify-center"
                      style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: 'var(--color-risk-critical)' }}
                    >
                      {lang === 'en' ? 'CRITICAL' : 'CRÍTICO'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" onClick={(e) => e.stopPropagation()}>
                        {c.vendor_id
                          ? <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name ?? ''} riskScore={c.risk_score ?? undefined} size="sm" />
                          : <span className="text-sm font-semibold text-text-primary">{c.vendor_name || (lang === 'en' ? 'Unknown vendor' : 'Proveedor desconocido')}</span>
                        }
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {c.title || c.institution_name || '—'}
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
                        <div className="text-[10px] font-mono text-text-muted mt-0.5">
                          {new Date(c.contract_date).toISOString().slice(0, 10)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ─── CTA ─── */}
        <section className="mb-12 print-hide">
          <div
            className="rounded-sm p-8 border border-accent/30"
            style={{ background: 'linear-gradient(135deg, rgba(160,104,32,0.06), rgba(160,104,32,0.02))' }}
          >
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-accent mb-2">
              {lang === 'en' ? 'Start Here' : 'Comienza aquí'}
            </div>
            <h3
              className="font-serif text-[28px] leading-[1.15] font-bold text-text-primary mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {lang === 'en' ? 'Investigate a vendor.' : 'Investigar un proveedor.'}
            </h3>
            <p className="text-sm text-text-secondary mb-6 max-w-[56ch] leading-[1.6]">
              {lang === 'en'
                ? 'Search by RFC, company name, or browse ARIA Tier 1 — 299 GT-anchored vendors at the top of the investigation queue.'
                : 'Busca por RFC, nombre de empresa, o explora ARIA Nivel 1 — 299 proveedores anclados en GT al tope de la cola de investigación.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/aria')}
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/80 text-text-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {lang === 'en' ? 'Open ARIA queue' : 'Abrir cola ARIA'}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => navigate('/explore?entity=vendor')}
                className="inline-flex items-center gap-1.5 bg-transparent hover:bg-accent/5 text-accent border border-accent/40 font-medium text-sm px-4 py-2 rounded-sm transition-colors"
              >
                {lang === 'en' ? 'Search a vendor' : 'Buscar un proveedor'}
              </button>
            </div>
          </div>
        </section>

        {/* ─── Credibility strip ─── */}
        <footer className="pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-mono text-text-muted mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3" aria-hidden="true" />
              AUC 0.785
            </span>
            <span>·</span>
            <span>{formatNumber(stats.totalContracts)} {lang === 'en' ? 'contracts' : 'contratos'}</span>
            <span>·</span>
            <span>{lang === 'en' ? 'OECD compliant' : 'Compatible OCDE'}</span>
            <span>·</span>
            <span>{lang === 'en' ? 'Open source' : 'Código abierto'}</span>
            <span>·</span>
            <span>RUBLI v0.8.5</span>
          </div>
          <p className="text-[10px] font-mono text-text-muted text-center max-w-[72ch] mx-auto leading-[1.5]">
            {lang === 'en'
              ? 'Risk scores are statistical indicators of similarity to documented corruption patterns. A high score does not constitute proof of wrongdoing. All data from COMPRANET 2002–2025 — public records, no FOIA required.'
              : 'Las puntuaciones de riesgo son indicadores estadísticos de similitud con patrones de corrupción documentados. Una puntuación alta no constituye prueba de irregularidad. Todos los datos provienen de COMPRANET 2002–2025 — registros públicos, sin requerir FOIA.'}
          </p>
        </footer>
        </div>{/* /folio-v1-P1b: end paper-grain content wrapper */}
      </div>
    </>
  )
}
