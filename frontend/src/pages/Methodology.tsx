import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { analysisApi } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { TwoWorldsExhibit } from '@/components/methodology/TwoWorldsExhibit'
import { BalanzaLedger, HatchBar } from '@/components/methodology/BalanzaLedger'
import { CalibrationRecord } from '@/components/methodology/CalibrationRecord'
import { DictamenMasthead, ClauseSection, AnnexFold, IndiceRail } from '@/components/methodology/DictamenChrome'
import {
  Shield,
  Brain,
  Target,
  AlertTriangle,
  BarChart3,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { RiskFactorTable } from '@/components/RiskExplainer'
import { CitationBlock } from '@/components/CitationBlock'
import { RiskScoreDisclaimer } from '@/components/RiskScoreDisclaimer'
import { PageFooter } from '@/components/layout/PageFooter'

// ============================================================================
// Static Data
// ============================================================================


const V33_WEIGHTS = [
  { nameKey: 'singleBidding', weight: 18 },
  { nameKey: 'nonOpenProcedure', weight: 18 },
  { nameKey: 'priceAnomaly', weight: 18 },
  { nameKey: 'vendorConcentration', weight: 12 },
  { nameKey: 'shortAdPeriod', weight: 12 },
  { nameKey: 'networkRisk', weight: 8 },
  { nameKey: 'yearEndTiming', weight: 7 },
  { nameKey: 'thresholdSplitting', weight: 7 },
] as const

// Static config — thresholds and labels only. Counts/pcts come from the
// live executive summary API inside the Methodology component so the
// distribution table always reflects the current scored corpus.
const RISK_LEVELS_BASE = [
  { level: 'Critical', threshold: '>= 0.60', meaningKey: 'Critical', color: RISK_COLORS.critical, riskKey: 'critical' as const, fallbackPct: '5.2%',  fallbackCount: '158,667'   },
  { level: 'High',     threshold: '>= 0.40', meaningKey: 'High',     color: RISK_COLORS.high,     riskKey: 'high'     as const, fallbackPct: '5.9%',  fallbackCount: '179,026'   },
  { level: 'Medium',   threshold: '>= 0.25', meaningKey: 'Medium',   color: RISK_COLORS.medium,   riskKey: 'medium'   as const, fallbackPct: '16.2%', fallbackCount: '494,310'   },
  { level: 'Low',      threshold: '< 0.25',  meaningKey: 'Low',      color: RISK_COLORS.low,      riskKey: 'low'      as const, fallbackPct: '72.8%', fallbackCount: '2,219,291' },
]

const CORRUPTION_CASES = [
  { name: 'IMSS Ghost Company Network', type: 'Ghost companies', contracts: '9,366', detection: '99.9%', highPlus: '99.0%', avgScore: '0.977' },
  { name: 'Segalmex Food Distribution', type: 'Procurement fraud', contracts: '6,326', detection: '99.6%', highPlus: '89.3%', avgScore: '0.664' },
  { name: 'COVID-19 Emergency Procurement', type: 'Embezzlement', contracts: '5,371', detection: '99.9%', highPlus: '84.9%', avgScore: '0.821' },
  { name: 'Edenred Voucher Monopoly', type: 'Monopoly', contracts: '2,939', detection: '100%', highPlus: '96.7%', avgScore: '0.884' },
  { name: 'Toka IT Monopoly', type: 'Monopoly', contracts: '1,954', detection: '100%', highPlus: '100%', avgScore: '0.964' },
  { name: 'Infrastructure Fraud Network', type: 'Overpricing', contracts: '191', detection: '100%', highPlus: '99.5%', avgScore: '0.962' },
  { name: 'SixSigma Tender Rigging', type: 'Tender rigging', contracts: '147', detection: '95.2%', highPlus: '87.8%', avgScore: '0.756' },
  { name: 'Cyber Robotic IT Overpricing', type: 'Overpricing', contracts: '139', detection: '100%', highPlus: '14.4%', avgScore: '0.249' },
  { name: 'PEMEX-Cotemar Irregularities', type: 'Procurement fraud', contracts: '51', detection: '100%', highPlus: '100%', avgScore: '1.000' },
  { name: 'IPN Cartel de la Limpieza', type: 'Bid rigging', contracts: '48', detection: '95.8%', highPlus: '64.6%', avgScore: '0.551' },
  { name: 'Odebrecht-PEMEX Bribery', type: 'Bribery', contracts: '35', detection: '97.1%', highPlus: '97.1%', avgScore: '0.915' },
  { name: 'La Estafa Maestra', type: 'Ghost companies', contracts: '10', detection: '90.0%', highPlus: '0%', avgScore: '0.179' },
  { name: 'Grupo Higa / Casa Blanca', type: 'Conflict of interest', contracts: '3', detection: '100%', highPlus: '33.3%', avgScore: '0.359' },
  { name: 'Oceanografia PEMEX Fraud', type: 'Procurement fraud', contracts: '2', detection: '50.0%', highPlus: '0%', avgScore: '0.152' },
  { name: 'PEMEX Emilio Lozoya', type: 'Bribery', contracts: '0*', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'ISSSTE Ambulance Leasing Fraud', type: 'Overpricing', contracts: '603', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'Decoaro Ghost Cleaning Company', type: 'Ghost companies', contracts: '46', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'CONAGUA Ghost Contractor Rotation', type: 'Ghost companies', contracts: '29', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'SEGOB-Mainbit IT Monopoly', type: 'Monopoly', contracts: '604', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'IMSS Overpriced Medicines (Ethomedical)', type: 'Overpricing', contracts: '--', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'Tren Maya Direct Award Irregularities', type: 'Procurement fraud', contracts: '--', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'SAT EFOS Art. 69-B Ghost Network', type: 'Ghost companies', contracts: '122', detection: '41.8%', highPlus: '27.9%', avgScore: '0.283' },
] as const

const DATA_STRUCTURES = [
  { structure: 'A', years: '2002-2010', qualityKey: 'A', rfc: '0.1%',  descKey: 'A' },
  { structure: 'B', years: '2010-2017', qualityKey: 'B', rfc: '15.7%', descKey: 'B' },
  { structure: 'C', years: '2018-2022', qualityKey: 'C', rfc: '30.3%', descKey: 'C' },
  { structure: 'D', years: '2023-2025', qualityKey: 'D', rfc: '47.4%', descKey: 'D' },
] as const

const REFERENCES = [
  { authors: 'IMF Working Paper 2022/094', title: 'Assessing Vulnerabilities to Corruption in Public Procurement', year: 2022 },
  { authors: 'OECD', title: 'Public Procurement Performance Report', year: 2023 },
  { authors: 'European Commission', title: 'ARACHNE Risk Scoring Methodology', year: 2023 },
  { authors: 'World Bank INT', title: 'Warning Signs of Fraud and Corruption in Public Procurement', year: 2019 },
  { authors: 'Gallego, J. et al.', title: 'Early Warning Model of Malfeasance in Public Procurement', year: 2022 },
  { authors: 'Mahalanobis, P.C.', title: 'On the Generalized Distance in Statistics', year: 1936 },
  { authors: 'Ledoit, O. & Wolf, M.', title: 'A Well-Conditioned Estimator for Large-Dimensional Covariance Matrices', year: 2004 },
  { authors: 'Elkan, C. & Noto, K.', title: 'Learning Classifiers from Only Positive and Unlabeled Data', year: 2008 },
] as const

const MODEL_COMPARISON = [
  { metric: 'AUC-ROC', v33: '0.584', v60: '0.785', improvement: '+34%' },
  { metric: 'Brier Score', v33: '0.411', v60: '0.114', improvement: '-72%' },
  { metric: 'Detection Rate (med+)', v33: '67.1%', v60: '100%', improvement: '+33pp' },
  { metric: 'High+ Detection', v33: '18.3%', v60: '67.4%', improvement: '+49pp' },
  { metric: 'Lift vs Random', v33: '1.22x', v60: '3.1x', improvement: '+1.9x' },
] as const


// El Dictamen — clause manifest for the left index rail.
const DICTAMEN_CLAUSES = [
  { id: 'overview',         numeral: 'I',   label: { en: 'The instrument',           es: 'El instrumento' } },
  { id: 'features',         numeral: 'II',  label: { en: 'The balance',              es: 'La balanza' } },
  { id: 'validation',       numeral: 'III', label: { en: 'The validation',           es: 'La prueba' } },
  { id: 'data-sources',     numeral: 'IV',  label: { en: 'Chain of custody',         es: 'La cadena de custodia' } },
  { id: 'limitations',      numeral: 'V',   label: { en: 'Limits of the expertise',  es: 'Los límites del peritaje' } },
  { id: 'confidence-tiers', numeral: 'VI',  label: { en: 'Evidentiary weight',       es: 'El valor probatorio' } },
  { id: 'methods',          numeral: 'A',   label: { en: 'Statistical methods',      es: 'Métodos estadísticos' } },
  { id: 'v33',              numeral: 'B',   label: { en: 'The previous model',       es: 'El modelo anterior' } },
  { id: 'references',       numeral: 'C',   label: { en: 'References',               es: 'Referencias' } },
]

// ============================================================================
// Helper Components
// ============================================================================


function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-accent">{children}</span>
}

// PullQuote — REMOVED 2026-06-13 (Day-7 W1 hero consolidation). It rendered only
// the duplicated 3-stat grid that the single Playfair anchor + BenchmarkRow now
// replace; with no remaining caller it was dead code (strict noUnusedLocals).

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 px-4 py-3 rounded-md bg-background-elevated/50 border border-border/50 font-mono text-xs text-text-secondary overflow-x-auto">
      {children}
    </div>
  )
}
function CopyCitationButton() {
  const { t } = useTranslation('methodology')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = REFERENCES.map(
      (ref, i) => `[${i + 1}] ${ref.authors} (${ref.year}). ${ref.title}.`
    ).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  return (
    <button
      onClick={() => void handleCopy()}
      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md bg-background-elevated/50 hover:bg-background-elevated border border-border text-text-muted hover:text-text-secondary transition-colors"
      title={t('copyCitation')}
    >
      {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
      {copied ? t('citationCopied') : t('copyCitation')}
    </button>
  )
}

// ============================================================================
// La Coda · § ADÓNDE IR  (Charter C3 exit ramp for the methodology essay)
// ============================================================================
//
// Methodology is Archetype C (narrative/tool). Per the charter, its coda links
// to Sectores / Patrones / La Cola. These are section-level surfaces, not
// concrete entity instances, so styled mono CTAs are the correct primitive here
// (an EntityIdentityChip would imply a specific vendor/sector row that this
// essay does not carry). Amber/mono/uppercase per the coda contract.

function MethodologyCoda({ lang }: { lang: 'en' | 'es' }) {
  const isEs = lang === 'es'

  const ramps: { to: string; label: string; sub: string; title: string }[] = [
    {
      to: '/sectors',
      label: isEs ? 'Sectores' : 'Sectors',
      sub: isEs
        ? 'El riesgo modelado por los 12 ramos federales'
        : 'Modelled risk across the 12 federal sectors',
      title: isEs
        ? 'Ver el riesgo por sector — el indicador de riesgo en contexto'
        : 'See risk by sector — the risk indicator in context',
    },
    {
      to: '/atlas?lens=patterns',
      label: isEs ? 'Patrones' : 'Patterns',
      sub: isEs
        ? 'Las 7 huellas de colusión que el modelo persigue'
        : 'The 7 collusion fingerprints the model chases',
      title: isEs
        ? 'Abrir El Atlas en la lente de Patrones'
        : 'Open The Atlas on the Patterns lens',
    },
    {
      to: '/aria',
      label: isEs ? 'Lista de Vigilancia (ARIA)' : 'Watchlist (ARIA)',
      sub: isEs
        ? 'Los proveedores priorizados para investigación'
        : 'Vendors prioritised for investigation',
      title: isEs
        ? 'Ir a la cola de investigación de ARIA'
        : 'Go to the ARIA investigation queue',
    },
  ]

  return (
    <section
      aria-label={isEs ? 'Adónde ir' : 'Where to go next'}
      className="mt-10 pt-5"
      style={{ borderTop: '1px solid var(--color-accent)' }}
    >
      <p
        className="font-mono mb-1.5 text-accent"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        § · {isEs ? 'ADÓNDE IR' : 'WHERE TO GO NEXT'}
      </p>
      <p
        className="text-xs text-text-muted mb-4"
        style={{ lineHeight: 1.55 }}
      >
        {isEs
          ? 'La metodología no es un destino. Lleva el indicador de riesgo a donde se vuelve accionable.'
          : 'The methodology is not a destination. Take the risk indicator to where it becomes actionable.'}
      </p>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {ramps.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            title={r.title}
            className="group flex flex-col gap-1 rounded-sm border border-accent/20 bg-accent/[0.04] px-3 py-2.5 hover:bg-accent/10 hover:border-accent/40 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.1em] text-accent text-[11px] font-bold">
              {r.label}
              <ArrowRight
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span className="text-[11px] text-text-muted leading-snug">{r.sub}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// A∞ · Procedencia  (ProvenanceFooter — local copy of the dossier pattern)
// ============================================================================
//
// WayfindingSpine / shared dossier chrome are not extracted on this branch, so
// this mirrors the VendorDossier ProvenanceFooter: an honesty movement (what
// this page can't tell you) above a demoted provenance line — model version
// v0.8.5, COMPRANET 2002–2025, the Sep 28 2025 frozen horizon, and the dateline.

function MethodologyProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const isEs = lang === 'es'
  return (
    <section
      aria-label={isEs ? 'Procedencia de los datos' : 'Data provenance'}
      className="mt-10 pt-5"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      {/* (a) Honesty movement — what this trust document can't tell you */}
      <p
        className="font-mono mb-2"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}
      >
        § {isEs ? 'Lo que esta metodología no puede decir' : "What this methodology can't tell you"}
      </p>
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13.5,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.55,
        }}
      >
        {isEs
          ? 'El modelo lee cómo se adjudicaron los contratos, no cómo se ejecutaron. Un indicador de riesgo alto señala anomalías estadísticas en la contratación, no prueba de un delito, que solo los tribunales determinan.'
          : 'The model reads how contracts were awarded — not how they were performed. A high risk indicator marks statistical anomalies in procurement, not proof of wrongdoing, which only courts establish.'}
      </p>

      {/* (b) Provenance movement — model, source, frozen horizon, dateline */}
      <div className="mt-4">
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 13.5,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.55,
          }}
        >
          {isEs
            ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5 (CAL-v8-202605020212) entrenado con 1,427 casos de corrupción documentados. La fuente federal se congeló el 28 de septiembre de 2025 tras la abolición de CompraNet; no existe reemplazo integral. Las señales del modelo son indicadores estadísticos, no determinaciones legales.'
            : 'COMPRANET data 2002–2025. v0.8.5 risk model (CAL-v8-202605020212) trained on 1,427 documented corruption cases. The federal source froze on 28 September 2025 after CompraNet was abolished; no comprehensive replacement exists. Model signals are statistical indicators, not legal determinations.'}
        </p>
        <p
          className="mt-3 font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          {isEs
            ? 'RUBLI · Metodología v0.8.5 · Horizonte de datos 28 sep 2025'
            : 'RUBLI · Methodology v0.8.5 · Data horizon Sep 28 2025'}
        </p>
      </div>
    </section>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export function Methodology() {
  const { t, i18n } = useTranslation('methodology')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data: summary } = useQuery({
    queryKey: ['executive-summary-methodology'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 10 * 60 * 1000,
  })

  const riskLevels = useMemo(() => {
    const risk = summary?.risk
    if (!risk) return RISK_LEVELS_BASE.map(r => ({ ...r, pct: r.fallbackPct, count: r.fallbackCount }))
    return [
      { ...RISK_LEVELS_BASE[0], pct: `${risk.critical_pct.toFixed(1)}%`, count: risk.critical_count.toLocaleString('en-US') },
      { ...RISK_LEVELS_BASE[1], pct: `${risk.high_pct.toFixed(1)}%`,     count: risk.high_count.toLocaleString('en-US')     },
      { ...RISK_LEVELS_BASE[2], pct: `${risk.medium_pct.toFixed(1)}%`,   count: risk.medium_count.toLocaleString('en-US')   },
      { ...RISK_LEVELS_BASE[3], pct: `${risk.low_pct.toFixed(1)}%`,      count: risk.low_count.toLocaleString('en-US')      },
    ]
  }, [summary])

  return (
    <div className="min-h-screen bg-background relative">
      {/* El Dictamen — paper-grain atmosphere (print:hidden) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 print:hidden"
        style={{ backgroundImage: 'url(\"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22140%22%20height=%22140%22%3E%3Cfilter%20id=%22dg%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.9%22%20numOctaves=%222%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23dg)%22/%3E%3C/svg%3E\")', opacity: 0.045, mixBlendMode: 'multiply' }}
      />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-[1]">
        {/* Breadcrumb up-link (Charter C0 spine) */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors mb-4"
          title={lang === 'es' ? 'Volver a la portada de RUBLI' : 'Back to the RUBLI home'}
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {lang === 'es' ? 'Metodología · RUBLI' : 'Methodology · RUBLI'}
        </Link>

        <DictamenMasthead />

        <div className="mt-8 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
          <IndiceRail clauses={DICTAMEN_CLAUSES} />
          <div className="space-y-12 min-w-0">
            {/* PARTE I — EL INSTRUMENTO */}
            <ClauseSection
              id="overview"
              numeral="I"
              kicker={{ en: '§ v0.8.5 · S(z) = σ(β₀ + βᵀz) / c · thresholds 0.60 / 0.40 / 0.25', es: '§ v0.8.5 · S(z) = σ(β₀ + βᵀz) / c · umbrales 0.60 / 0.40 / 0.25' }}
              title={{ en: 'The instrument', es: 'El instrumento' }}
              dek={{ en: 'A similarity score, not a verdict: what the number measures and where the four thresholds fall.', es: 'Una puntuación de similitud, no un veredicto: qué mide el número y dónde caen los cuatro umbrales.' }}
            >
            <div className="space-y-4">
              <p className="font-mono uppercase tracking-[0.15em] text-text-muted text-[10px]">
                § Modelo activo v0.8.5 · AUC 0.785 · HR 11.01%
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.overview.p1Start')}<strong className="text-text-primary">{t('body.overview.p1StatisticalIndicator')}</strong>{' '}
                <Mono>S(features)</Mono>{t('body.overview.p1End')}
              </p>

              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-2">
                  {t('body.overview.formulaLabel')}
                </p>
                <Formula>
                  {t('body.overview.formulaExpr')}
                </Formula>
                <p className="text-xs text-text-muted">
                  {t('body.overview.formulaDescStart')}<strong>{t('body.overview.formulaDescStrong')}</strong>{t('body.overview.formulaDescEnd')}
                </p>
              </div>

              {/* Risk level thresholds table */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted font-mono">
                    {t('body.overview.riskThresholdsLabel')}
                  </p>
                  <RiskScoreDisclaimer />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label="Risk level thresholds">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColLevel')}</th>
                        <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColThreshold')}</th>
                        <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColMeaning')}</th>
                        <th scope="col" className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColDistribution')}</th>
                        <th scope="col" className="text-right py-2 text-text-muted font-medium">{t('body.overview.tableColCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskLevels.map((r) => (
                        <tr key={r.level} className="border-b border-border/20">
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: r.color }}
                                aria-hidden="true"
                              />
                              <span className="font-medium text-text-primary">{t(`dataLabels.level${r.meaningKey}`, r.level)}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 font-mono text-text-secondary">
                            {r.threshold}
                          </td>
                          <td className="py-2 pr-3 text-text-muted">{t(`dataLabels.riskMeaning${r.meaningKey}`)}</td>
                          <td className="py-2 pr-3 text-right font-mono text-text-secondary">
                            {r.pct}
                          </td>
                          <td className="py-2 text-right font-mono text-text-muted">
                            {r.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-text-muted mt-1 font-mono">
                    {t('body.overview.tableFootnote')}
                  </p>
                </div>
              </div>

              <p className="text-xs text-text-muted">
                {t('body.overview.highRiskSummaryStart')}<strong className="text-text-secondary">{t('body.overview.highRiskSummaryValue')}</strong>{t('body.overview.highRiskSummaryEnd')}
              </p>
            </div>
            </ClauseSection>
            {/* PARTE II — LA BALANZA */}
            <ClauseSection
              id="features"
              numeral="II"
              kicker={{ en: '§ ElasticNet C=0.2243 · l1_ratio=0.7545 · Run CAL-v8-202605020212', es: '§ ElasticNet C=0.2243 · l1_ratio=0.7545 · Corrida CAL-v8-202605020212' }}
              title={{ en: 'The balance', es: 'La balanza' }}
              dek={{ en: 'Eighteen features entered the model. Twelve carry weight — for or against. Six were regularized to exactly zero.', es: 'Dieciocho características entraron al modelo. Doce cargan peso — a favor o en contra. Seis fueron reguladas a exactamente cero.' }}
            >
              <div className="space-y-6">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.features.p1')}
              </p>
                <BalanzaLedger />

                {/* Key findings — editorial notes */}
                <div id="findings" className="scroll-mt-24">
            <div className="space-y-4">

              {/* Finding 1: Vendor Concentration */}
              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-1">
                  {t('body.findings.finding1Label')}
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {t('body.findings.finding1Title')}
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {t('body.findings.finding1Body')}
                </p>
              </div>

              {/* Finding 2: Reversed factors */}
              <div className="p-3 rounded-md bg-risk-medium/5 border border-risk-medium/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-risk-medium mb-1">
                  {t('body.findings.finding2Label')}
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {t('body.findings.finding2Title')}
                </p>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">1.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">{t('body.findings.finding2Item1Strong')}</strong>{' '}
                      <Mono>{t('body.findings.finding2Item1Mono')}</Mono>{t('body.findings.finding2Item1End')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">2.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">{t('body.findings.finding2Item2Strong')}</strong>{' '}
                      <Mono>{t('body.findings.finding2Item2Mono')}</Mono>{t('body.findings.finding2Item2End')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">3.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">{t('body.findings.finding2Item3Strong')}</strong>{' '}
                      <Mono>{t('body.findings.finding2Item3Mono')}</Mono>{t('body.findings.finding2Item3End')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Finding 3: Co-bidding */}
              <div className="p-3 rounded-md bg-background-elevated/50 border border-border/50">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
                  {t('body.findings.finding3Label')}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">{t('body.findings.finding3BodyStrong')}</strong>{t('body.findings.finding3BodyEnd')}
                </p>
              </div>

              <div className="p-3 rounded-md border border-risk-high/20 bg-risk-high/5">
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">{t('body.findings.finding4Strong')}</strong>{t('body.findings.finding4End')}
                </p>
              </div>
            </div>
                </div>

                {/* Risk-factor evidence base — disclosure */}
                <AnnexFold
                  id="risk-evidence"
                  marker="§"
                  title={{ en: 'The evidence base for each factor', es: 'La base de evidencia de cada factor' }}
                  defaultOpen={false}
                >
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.riskEvidence.p1')}
              </p>
              <RiskFactorTable />
            </div>
                </AnnexFold>
              </div>
            </ClauseSection>
            {/* PARTE III — LA PRUEBA */}
            <ClauseSection
              id="validation"
              numeral="III"
              kicker={{ en: '§ 1,427 cases · 1,554 vendors · vendor-stratified hold-out', es: '§ 1,427 casos · 1,554 proveedores · retención estratificada por proveedor' }}
              title={{ en: 'The validation', es: 'La prueba' }}
              dek={{ en: 'How the model performs against 1,427 documented cases — and why its headline number went down on purpose.', es: 'Cómo se desempeña el modelo frente a 1,427 casos documentados — y por qué su cifra principal bajó a propósito.' }}
            >
              <div className="space-y-6">
            <div className="space-y-4">
              <p className="font-mono uppercase tracking-[0.15em] text-text-muted text-[10px]">
                {t('sectionKickers.validationKicker')}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.validation.p1Start')}<strong className="text-text-primary">{t('body.validation.p1Strong')}</strong>{t('body.validation.p1End')}
              </p>

              {/* Cases table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label={t('body.validation.tableAriaLabel')}>
                  <thead>
                    <tr className="border-b border-border/50">
                      <th scope="col" className="text-left py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColCase')}</th>
                      <th scope="col" className="text-left py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColType')}</th>
                      <th scope="col" className="text-right py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColContracts')}</th>
                      <th scope="col" className="text-right py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColDetected')}</th>
                      <th scope="col" className="text-right py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColHighPlus')}</th>
                      <th scope="col" className="text-right py-2 text-text-muted font-medium">{t('body.validation.tableColAvgScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CORRUPTION_CASES.map((c) => (
                      <tr key={c.name} className="border-b border-border/20">
                        <td className="py-2 pr-2 text-text-primary font-medium max-w-[200px]">
                          <span className="truncate block">{c.name}</span>
                        </td>
                        <td className="py-2 pr-2 text-text-muted">{t(`corruptionTypes.${c.type}`, c.type)}</td>
                        <td className="py-2 pr-2 text-right font-mono text-text-secondary">
                          {c.contracts}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-text-secondary">
                          {c.detection}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-text-secondary">
                          {c.highPlus}
                        </td>
                        <td className="py-2 text-right font-mono text-text-secondary">
                          {c.avgScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted">
                {t('body.validation.footnote')}
              </p>

              {/* Validation metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: t('body.validation.metricTestAuc'), value: '0.785' },
                  { label: t('body.validation.metricTrainAuc'), value: '0.797' },
                  { label: t('body.validation.metricOecdRate'), value: '11.01%' },
                  { label: t('body.validation.metricHighPlus'), value: '25.3%' },
                  { label: t('body.validation.metricMedPlus'), value: '88.7%' },
                ].map((m) => (
                  <div key={m.label} className="fern-card p-3 text-center">
                    <p className="pull-stat text-text-primary">
                      {m.value}
                    </p>
                    <p className="editorial-label mt-1">{m.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-text-secondary">
                {t('body.validation.technicalNote')}
              </p>
            </div>

                <CalibrationRecord />

                <TwoWorldsExhibit />

                {/* Sub-clause III·b — cross-model checks */}
                <div id="v52-layer" className="scroll-mt-24 space-y-3 pt-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] font-bold tracking-[0.18em]" style={{ color: '#a06820' }}>III·b</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
                      {lang === 'es' ? 'Contraste entre modelos' : 'Cross-model checks'}
                    </span>
                  </div>
                  <h3
                    className="text-text-primary"
                    style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: '22px', lineHeight: 1.1 }}
                  >
                    {lang === 'es' ? 'Tres segundas opiniones independientes' : 'Three independent second opinions'}
                  </h3>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.v52layer.p1Start')}<strong className="text-text-primary">{t('body.v52layer.p1Strong')}</strong>{t('body.v52layer.p1End')}
              </p>

              {/* Three pillars */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    titleKey: 'shapeTitle',
                    icon: Brain,
                    badgeKey: 'shapBadge',
                    color: 'text-accent',
                    bg: 'bg-accent/5 border-accent/15',
                    bodyKey: 'shapBody',
                    whereKey: 'shapWhere',
                  },
                  {
                    titleKey: 'pyodTitle',
                    icon: Target,
                    badgeKey: 'pyodBadge',
                    color: 'text-risk-high',
                    bg: 'bg-risk-high/5 border-risk-high/15',
                    bodyKey: 'pyodBody',
                    whereKey: 'pyodWhere',
                  },
                  {
                    titleKey: 'driftTitle',
                    icon: BarChart3,
                    badgeKey: 'driftBadge',
                    color: 'text-risk-medium',
                    bg: 'bg-risk-medium/5 border-risk-medium/15',
                    bodyKey: 'driftBody',
                    whereKey: 'driftWhere',
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.titleKey} className={`p-3 rounded-md border ${item.bg} space-y-2`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${item.color}`} aria-hidden="true" />
                          <p className={`text-xs font-semibold ${item.color}`}>{t(`body.v52layer.${item.titleKey}`)}</p>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">{t(`body.v52layer.${item.badgeKey}`)}</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{t(`body.v52layer.${item.bodyKey}`)}</p>
                      <p className="text-[10px] text-text-muted font-mono border-t border-border/30 pt-1.5">
                        {t('body.v52layer.whereToFind')} {t(`body.v52layer.${item.whereKey}`)}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Key numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { labelKey: 'statVendorsShap', value: '456K' },
                  { labelKey: 'statPyodScores', value: '9.33M' },
                  { labelKey: 'statDriftFeatures', value: '16' },
                  { labelKey: 'statDualConfirmed', value: '~130K' },
                ].map((m) => (
                  <div key={m.labelKey} className="fern-card p-3 text-center">
                    <p className="pull-stat text-accent">{m.value}</p>
                    <p className="editorial-label mt-1">{t(`body.v52layer.${m.labelKey}`)}</p>
                  </div>
                ))}
              </div>

              {/* AI Confirmed explanation */}
              <div className="p-3 rounded-md bg-background-elevated/40 border border-border/30 space-y-1.5">
                <p className="text-xs font-semibold text-text-primary">
                  {t('body.v52layer.aiConfirmedTitle')}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.v52layer.aiConfirmedStart')}<strong className="text-text-primary">{t('body.v52layer.aiConfirmedStrong')}</strong>{t('body.v52layer.aiConfirmedEnd')}
                </p>
              </div>

              <p className="text-xs text-text-muted">
                {t('body.v52layer.noteStart')}<code className="font-mono bg-border/20 px-1 py-0.5 rounded">{t('body.v52layer.noteCode')}</code>{t('body.v52layer.noteEnd')}
              </p>
            </div>
                </div>
              </div>
            </ClauseSection>
            {/* PARTE IV — LA CADENA DE CUSTODIA */}
            <ClauseSection
              id="data-sources"
              numeral="IV"
              kicker={{ en: '§ COMPRANET 2002–2025 · four structures · frozen 2025-09-28', es: '§ COMPRANET 2002–2025 · cuatro estructuras · congelado 2025-09-28' }}
              title={{ en: 'Chain of custody', es: 'La cadena de custodia' }}
              dek={{ en: 'Where the record comes from, what its four eras can and cannot support, and the day the source went dark.', es: 'De dónde viene el registro, qué soportan y qué no sus cuatro épocas, y el día en que la fuente se apagó.' }}
            >
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.dataSources.p1Start')}<strong className="text-text-primary">{t('body.dataSources.p1Strong')}</strong>{t('body.dataSources.p1End')}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label={t('body.dataSources.tableAriaLabel')}>
                  <thead>
                    <tr className="border-b border-border/50">
                      <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColStructure')}</th>
                      <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColYears')}</th>
                      <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColQuality')}</th>
                      <th scope="col" className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColRfc')}</th>
                      <th scope="col" className="text-left py-2 text-text-muted font-medium">{t('body.dataSources.tableColNotes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_STRUCTURES.map((ds) => (
                      <tr key={ds.structure} className="border-b border-border/20">
                        <td className="py-2 pr-3 font-mono text-accent font-semibold">
                          {ds.structure}
                        </td>
                        <td className="py-2 pr-3 text-text-secondary font-mono">
                          {ds.years}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant="default"
                            className={cn(
                              'text-xs px-1.5 py-0',
                              // Class lookup keyed on stable A/B/C/D structure code
                              // (i18n-safe — no longer depends on the displayed string).
                              ds.qualityKey === 'A' && 'bg-risk-critical/10 text-risk-critical border-risk-critical/20',
                              ds.qualityKey === 'B' && 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
                              ds.qualityKey === 'C' && 'bg-accent/10 text-accent border-accent/20',
                              ds.qualityKey === 'D' && 'bg-accent/10 text-accent border-accent/20',
                            )}
                          >
                            {t(`dataLabels.structure${ds.qualityKey}_quality`)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-text-secondary">
                          {ds.rfc}
                        </td>
                        <td className="py-2 text-text-muted">{t(`dataLabels.structure${ds.descKey}_desc`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Data coverage horizon — federal bulk feed froze Sep 2025 (CompraNet -> ComprasMX) */}
              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-1">
                  {t('body.dataSources.horizonLabel')}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.dataSources.horizonBodyStart')}<strong className="text-text-primary">{t('body.dataSources.horizonBodyStrong')}</strong>{t('body.dataSources.horizonBodyEnd')}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {t('body.dataSources.horizonNote')}
                </p>
              </div>

              {/* Amount validation */}
              <div className="p-3 rounded-md bg-risk-critical/5 border border-risk-critical/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-risk-critical mb-1">
                  {t('body.dataSources.amountValidationLabel')}
                </p>
                <div className="space-y-1 text-xs text-text-secondary">
                  <p>
                    <strong className="text-text-primary">{t('body.dataSources.rejectStrong')}</strong>{t('body.dataSources.rejectEnd')}
                  </p>
                  <p>
                    <strong className="text-text-primary">{t('body.dataSources.flagStrong')}</strong>{t('body.dataSources.flagEnd')}
                  </p>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  {t('body.dataSources.context')}
                </p>
              </div>
            </div>
            </ClauseSection>
            {/* PARTE V — LOS LÍMITES DEL PERITAJE */}
            <ClauseSection
              id="limitations"
              numeral="V"
              kicker={{ en: '§ declared limitations · impact-ranked', es: '§ limitaciones declaradas · clasificadas por impacto' }}
              title={{ en: 'The limits of the expertise', es: 'Los límites del peritaje' }}
              dek={{ en: 'What this model cannot see — declared, itemized, and ranked by impact.', es: 'Lo que este modelo no puede ver — declarado, desglosado y clasificado por impacto.' }}
            >
              <div className="space-y-6">
                <p
                  className="text-text-secondary"
                  style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: '23px', lineHeight: 1.4, borderLeft: '2px solid #a06820', paddingLeft: '16px' }}
                >
                  {lang === 'es' ? 'Una puntuación baja no certifica que un contrato esté limpio.' : 'A low score does not certify a contract is clean.'}
                </p>
            <div className="space-y-3">
              {(
                [
                  { titleKey: 'item1Title', textKey: 'item1Text' },
                  { titleKey: 'item2Title', textKey: 'item2Text' },
                  { titleKey: 'item3Title', textKey: 'item3Text' },
                  { titleKey: 'item4Title', textKey: 'item4Text' },
                  { titleKey: 'item5Title', textKey: 'item5Text' },
                  { titleKey: 'item6Title', textKey: 'item6Text' },
                ] as const
              ).map((item) => (
                <div key={item.titleKey} className="flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-risk-medium shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{t(`body.limitations.${item.titleKey}`)}</p>
                    <p className="text-xs text-text-muted leading-relaxed mt-0.5">{t(`body.limitations.${item.textKey}`)}</p>
                  </div>
                </div>
              ))}
            </div>

                <div id="limitations-detail" className="scroll-mt-24">
            <div className="space-y-6">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('limitations.intro')}
              </p>

              {/* Severity summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-risk-critical/5 border border-risk-critical/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-critical" aria-hidden="true" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-risk-critical">5</span>
                    <span className="text-xs text-text-muted ml-1.5">{t('limitations.highImpact')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-risk-high/5 border border-risk-high/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-high" aria-hidden="true" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-risk-high">5</span>
                    <span className="text-xs text-text-muted ml-1.5">{t('limitations.mediumImpact')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-risk-medium/5 border border-risk-medium/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-medium" aria-hidden="true" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-risk-medium">4</span>
                    <span className="text-xs text-text-muted ml-1.5">{t('limitations.lowImpact')}</span>
                  </div>
                </div>
              </div>

              {/* Summary table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs" aria-label={t('limitations.tableAria')}>
                  <thead className="border-b border-border">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-left text-text-muted font-medium">{t('limitations.colLimitation')}</th>
                      <th scope="col" className="px-3 py-2.5 text-left text-text-muted font-medium hidden md:table-cell">{t('limitations.colImpact')}</th>
                      <th scope="col" className="px-3 py-2.5 text-left text-text-muted font-medium hidden lg:table-cell">{t('limitations.colPath')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {/* 15 known limitations — content in methodology.json
                        under `limitationsTable.row{N}_{l|i|f}` so the whole
                        table translates with the language toggle. Stable
                        index keys; updates to the list need both EN+ES
                        JSON updates. */}
                    {Array.from({ length: 15 }, (_, idx) => idx + 1).map((n) => (
                      <tr key={n} className="hover:bg-accent/[0.03]">
                        <td className="px-3 py-2 text-text-primary">{t(`limitationsTable.row${n}_l`)}</td>
                        <td className="px-3 py-2 text-text-muted hidden md:table-cell">{t(`limitationsTable.row${n}_i`)}</td>
                        <td className="px-3 py-2 text-text-muted hidden lg:table-cell">{t(`limitationsTable.row${n}_f`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Interpretive guidance */}
              <div className="p-3 rounded-md bg-border/10 border border-border/40">
                <p className="text-xs text-text-muted leading-relaxed">
                  <span className="font-medium text-text-primary">{t('limitations.interpretationLabel')}</span>
                  {t('limitations.interpretationBody')}
                </p>
              </div>
            </div>
                </div>
              </div>
            </ClauseSection>
            {/* PARTE VI — EL VALOR PROBATORIO */}
            <ClauseSection
              id="confidence-tiers"
              numeral="VI"
              kicker={{ en: '§ three tiers of certainty · the language each licenses', es: '§ tres niveles de certeza · el lenguaje que cada uno autoriza' }}
              title={{ en: 'Evidentiary weight', es: 'El valor probatorio' }}
              dek={{ en: 'Three tiers of certainty, and the exact language each one licenses.', es: 'Tres niveles de certeza, y el lenguaje exacto que cada uno autoriza.' }}
            >
        <div className="fern-card">
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-accent">
                {t('tiers.kicker')}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {t('tiers.intro')}
            </p>
          </div>
          <div className="px-6 pb-6 border-t border-border/30">
            <div className="grid gap-4 sm:grid-cols-3 mt-4">

              {/* Tier I */}
              <div className="rounded-sm border border-risk-critical/25 bg-risk-critical/5 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-risk-critical">{t('tiers.tierILabel')}</span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    {t('tiers.tierITitle')}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('tiers.tierIBody')}
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">{t('tiers.sourcesLabel')}</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    <li>{t('tiers.tierISource1')}</li>
                    <li>{t('tiers.tierISource2')}</li>
                    <li>{t('tiers.tierISource3')}</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-risk-critical/15">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">{t('tiers.sayLabel')}</p>
                  <p className="text-xs text-risk-critical italic">{t('tiers.tierISay')}</p>
                </div>
              </div>

              {/* Tier II */}
              <div className="rounded-sm border border-risk-high/25 bg-risk-high/5 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-risk-high">{t('tiers.tierIILabel')}</span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    {t('tiers.tierIITitle')}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('tiers.tierIIBody')}
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">{t('tiers.examplesLabel')}</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    <li>{t('tiers.tierIIEx1')}</li>
                    <li>{t('tiers.tierIIEx2')}</li>
                    <li>{t('tiers.tierIIEx3')}</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-risk-high/15">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">{t('tiers.sayLabel')}</p>
                  <p className="text-xs text-risk-high italic">{t('tiers.tierIISay')}</p>
                </div>
              </div>

              {/* Tier III */}
              <div className="rounded-sm border border-border/40 bg-background-elevated/30 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-muted">{t('tiers.tierIIILabel')}</span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    {t('tiers.tierIIITitle')}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('tiers.tierIIIBodyStart')}
                  <strong className="text-text-primary">{t('tiers.tierIIIBodyStrong')}</strong>
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">{t('tiers.scaleLabel')}</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    <li>{t('tiers.tierIIIEx1')}</li>
                    <li>{t('tiers.tierIIIEx2')}</li>
                    <li>{t('tiers.tierIIIEx3')}</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">{t('tiers.sayLabel')}</p>
                  <p className="text-xs text-text-secondary italic">{t('tiers.tierIIISay')}</p>
                </div>
              </div>

            </div>

            <div className="mt-4 p-3 rounded-md bg-border/10 border border-border/30">
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="font-semibold text-text-secondary">{t('tiers.criticalRuleLabel')} </span>
                {t('tiers.criticalRuleBody')}
              </p>
            </div>
          </div>
        </div>
            </ClauseSection>
            {/* ANEXO A — MÉTODOS ESTADÍSTICOS */}
            <AnnexFold
              id="methods"
              marker="A"
              title={{ en: 'Statistical methods — the full math', es: 'Métodos estadísticos — las matemáticas completas' }}
              defaultOpen={false}
            >
            <div className="space-y-4">

              {/* Z-scores */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.zScoreTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.zScoreP1')}
                </p>
                <Formula>
                  {t('body.methods.zScoreFormula')}
                </Formula>
                <p className="text-xs text-text-muted">
                  {t('body.methods.zScoreNote')}
                </p>
              </div>

              {/* Mahalanobis */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.mahalanobisTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.mahalanobisP1')}
                </p>
                <Formula>
                  {t('body.methods.mahalanobisFormula')}
                </Formula>
                <p className="text-xs text-text-muted">
                  {t('body.methods.mahalanobisNote')}
                </p>
              </div>

              {/* Logistic Regression */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.logisticTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.logisticP1')}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('body.methods.logisticNote')}
                </p>
              </div>

              {/* PU Learning */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.puTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.puP1Start')}<Mono>S(x) = P(labeled=1|x) / c</Mono>
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('body.methods.puNote')}
                </p>
              </div>

              {/* Bootstrap CIs */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.bootstrapTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.bootstrapP1')}
                </p>
              </div>
            </div>
            </AnnexFold>
            {/* ANEXO B — EL MODELO ANTERIOR (v3.3) */}
            <AnnexFold
              id="v33"
              marker="B"
              title={{ en: 'The previous model (v3.3)', es: 'El modelo anterior (v3.3)' }}
              defaultOpen={false}
            >
              <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.v33section.p1Start')}<strong className="text-text-primary">{t('body.v33section.p1Strong')}</strong>{t('body.v33section.p1End')}<Mono>{t('body.v33section.p1Mono')}</Mono>{t('body.v33section.p1MonoEnd')}
              </p>

                {/* v3.3 weights — hatch-bar register (replaces the retired dot-matrix) */}
                <div className="space-y-1.5">
                  {[...V33_WEIGHTS].sort((a, b) => b.weight - a.weight).map((w) => (
                    <div key={w.nameKey} className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-text-secondary w-40 shrink-0 truncate">{t(`v33WeightNames.${w.nameKey}`)}</span>
                      <div className="flex-1 min-w-0"><HatchBar value={w.weight} max={20} color="#a06820" /></div>
                      <span className="font-mono text-[11px] tabular-nums text-text-muted w-9 text-right">{w.weight}%</span>
                    </div>
                  ))}
                </div>

              <p className="text-xs text-text-muted">
                {t('body.v33section.bonusFactors')}
              </p>

              {/* Comparison table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 font-mono">
                  {t('body.v33section.modelComparisonLabel')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label={t('body.v33section.tableAriaLabel')}>
                    <thead>
                      <tr className="border-b border-border/50">
                        <th scope="col" className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.v33section.tableColMetric')}</th>
                        <th scope="col" className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.v33section.tableColV33')}</th>
                        <th scope="col" className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.v33section.tableColV60')}</th>
                        <th scope="col" className="text-right py-2 text-text-muted font-medium">{t('body.v33section.tableColChange')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODEL_COMPARISON.map((row) => (
                        <tr key={row.metric} className="border-b border-border/20">
                          <td className="py-2 pr-3 text-text-primary font-medium">{row.metric}</td>
                          <td className="py-2 pr-3 text-right font-mono text-text-muted">
                            {row.v33}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-accent font-semibold">
                            {row.v60}
                          </td>
                          <td className="py-2 text-right font-mono text-text-muted">
                            {row.improvement}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </AnnexFold>
            {/* ANEXO C — REFERENCIAS */}
            <AnnexFold
              id="references"
              marker="C"
              title={{ en: 'References', es: 'Referencias' }}
              defaultOpen={false}
            >
            <div className="space-y-2">
              <div className="flex justify-end mb-2">
                <CopyCitationButton />
              </div>
              {REFERENCES.map((ref, i) => (
                <div key={i} className="flex gap-2 py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-text-muted font-mono w-4 shrink-0 text-right">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="text-xs text-text-secondary">
                      <span className="text-text-primary font-medium">{ref.authors}</span>
                      {' '}({ref.year}).{' '}
                      <em>{ref.title}</em>.
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-text-muted pt-2">
                {t('body.references.footer')}
              </p>
            </div>
            </AnnexFold>
          </div>
        </div>

        {/* La Coda · § ADÓNDE IR */}
        <MethodologyCoda lang={lang} />

        {/* A∞ · Procedencia */}
        <MethodologyProvenanceFooter lang={lang} />

        <CitationBlock context="RUBLI methodology — v0.8.5 risk model" className="mt-2" />
        <PageFooter />
      </div>
    </div>
  )
}

export default Methodology
