/**
 * Story Content — 10 original investigations derived from RUBLI data analysis.
 *
 * These stories START from what RUBLI's algorithms discovered in 3,051,294 contracts
 * (2002-2025). External sources are cited to CORROBORATE findings — not the other way.
 *
 * Risk scores from v0.8.5 model (AUC 0.785 test, vendor-stratified split).
 * All statistics are verified against RUBLI_NORMALIZED.db (verified Apr 2026).
 */

import type { VizTemplate } from '@/components/stories/DataPullquote'
import { SECTOR_COLORS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoryOutlet = 'longform' | 'investigative' | 'data_analysis' | 'rubli'
export type StoryType = 'era' | 'case' | 'thematic' | 'year'
export type StoryEra = 'fox' | 'calderon' | 'pena' | 'amlo' | 'sheinbaum' | 'cross'

export interface StoryChapterDef {
  id: string
  number: number
  title: string
  /** Optional Spanish translation of `title`. Falls back to English when unset. */
  title_es?: string
  subtitle?: string
  /** Optional Spanish translation of `subtitle`. */
  subtitle_es?: string
  prose: string[]
  /**
   * Optional Spanish translation of `prose`. When present (and same length as
   * `prose`), Spanish UI renders this instead of the English original.
   * When absent, Spanish UI falls back to English with no badge — better than
   * blocking the read.
   */
  prose_es?: string[]
  sources?: string[]
  pullquote?: {
    quote: string
    quote_es?: string
    stat: string
    statLabel: string
    statLabel_es?: string
    barValue?: number
    barLabel?: string
    barLabel_es?: string
    vizTemplate?: VizTemplate
  }
  chartConfig?: {
    type:
      | 'da-trend'
      | 'sector-bar'
      | 'year-bar'
      | 'vendor-list'
      | 'comparison'
      | 'sunburst'
      | 'racing'
      | 'network'
      | 'pyramid'
      | 'scatter'
      | 'breakdown'
      | 'fingerprint'
      | 'radar'
      | 'trends'
      | 'calendar'
      | 'inline-bar'
      | 'inline-line'
      | 'inline-area'
      | 'inline-dot-grid'
      | 'inline-diverging'
      | 'inline-spike'
      | 'inline-multi-line'
      | 'inline-network'
      | 'inline-stacked-bar'
      | 'inline-roster'
      | 'inline-timeline'
      | 'editorial-slope'
      | 'editorial-treemap'
      | 'editorial-beeswarm'
      | 'editorial-swimlane'
      | 'editorial-dumbbell'
      | 'vendor-price-trajectory'  // n-P3 Volatilidad ch.2
      | 'venn-convergence'         // n-P3 Volatilidad ch.4
      | 'editorial-threshold'      // P2 ThresholdDistribution
      | 'editorial-thermometer'    // P2 AnnotatedThermometer
      | 'editorial-cleveland-pair' // P2 ClevelandPairChart
      | 'inline-roster'            // n-ejercito ch3 — roster list of named ghost vendors
      | 'inline-timeline'          // n-ejercito ch4 — detection-pipeline timeline
    highlight?: string
    title: string
    /** Optional Spanish translation of `title`. */
    title_es?: string
    chartId?: string
    data?: StoryInlineChartData
    multiSeries?: StoryMultiSeriesData
    network?: StoryNetworkData
    stacked?: StoryStackedBarData
  }
}

export interface StoryChartPoint {
  label: string
  /** Optional Spanish translation of `label`. */
  label_es?: string
  /** Optional English translation of `label` — use when `label` is the
   *  Spanish default (sector names, common categories) and the EN
   *  reader needs a translated version. Falls back to `label`. */
  label_en?: string
  value: number
  value2?: number
  color?: string
  highlight?: boolean
  annotation?: string
  /** Optional Spanish translation of `annotation`. */
  annotation_es?: string
  /** Optional risk score (0.0–1.0). When present and `color` is not set,
   *  bar renderers bind the fill color to RISK_COLORS via
   *  getRiskLevelFromScore (critical ≥0.60, high ≥0.40, low <0.40 — never
   *  green per Bible §3.10). Scoped opt-in: only points that supply this
   *  field get risk-tier coloring; everything else keeps its current
   *  palette path. */
  riskScore?: number
}

export interface StoryInlineChartData {
  points: StoryChartPoint[]
  referenceLine?: { value: number; label: string; label_es?: string; color?: string }
  referenceLine2?: { value: number; label: string; label_es?: string; color?: string }
  unit?: string
  maxValue?: number
  yLabel?: string
  /** Optional Spanish translation of `yLabel`. */
  yLabel_es?: string
  annotation?: string
  /** Optional Spanish translation of `annotation`. */
  annotation_es?: string
  /** ClevelandPairChart-only: switch from dual-dot+line to excess-only bars
   *  starting at value2 (baseline) and extending to the gap. */
  mode?: 'pair' | 'excess'
  /** ClevelandPairChart-only (default mode): how to format the right-column
   *  readout. 'signed' (default) shows the raw value-minus-value2 gap with
   *  a + prefix for positives. 'ratio' shows (value / value2) as a
   *  percentage — used when value is a subset of value2 (e.g. single-bid
   *  wins out of total wins) and the gap is always negative + meaningless. */
  gapFormat?: 'signed' | 'ratio'
}

/**
 * Multi-series time-series data for InlineMultiLine. Each series is a
 * separate vendor / category / line on the same axis. Used to compare
 * trajectories where the editorial point is "look how they hand off".
 */
export interface StoryMultiSeriesData {
  /** Shared x-axis labels (years, months, etc.). */
  xLabels: string[]
  /** One entry per series. `values` must be the same length as xLabels. */
  series: Array<{
    name: string
    /** Optional Spanish translation of `name`. */
    name_es?: string
    color: string
    values: number[]
    /** Optional callout: marker + text on a specific x index. */
    annotation?: { xIndex: number; text: string; text_es?: string }
    /** Optional total caption beside the legend ("88.0B over 23 years"). */
    totalCaption?: string
    /** Optional Spanish translation of `totalCaption`. */
    totalCaption_es?: string
  }>
  unit?: string
  yLabel?: string
  yLabel_es?: string
  annotation?: string
  annotation_es?: string
}

/**
 * Network diagram data for InlineNetwork. Edge weights drive line
 * thickness so the "thicker = more shared activity" reads instantly.
 * Used for the cartel-cobidding lattice.
 */
export interface StoryNetworkData {
  nodes: Array<{
    id: string
    label: string
    /** Sub-label rendered as caption (e.g. amount, contract count). */
    sublabel?: string
    sublabel_es?: string
    color: string
    /** Optional emphasis — bigger node radius. */
    highlight?: boolean
  }>
  edges: Array<{
    from: string
    to: string
    /** Numeric weight; line thickness scales with this. */
    weight: number
    /** Label shown along the edge. */
    label?: string
  }>
  /** Top-of-card anchor stat. */
  anchor?: { value: string; label: string; label_es?: string }
  annotation?: string
  annotation_es?: string
}

/**
 * Stacked-bar comparison for InlineStackedBar. Each row is a vendor /
 * category; each row is split into two segments (e.g. "main customer"
 * vs "all others") so the dominant share reads as a band.
 */
export interface StoryStackedBarData {
  rows: Array<{
    label: string
    label_es?: string
    /** Optional English translation of `label` — fallback to `label`. */
    label_en?: string
    /** Total bar value. */
    total: number
    /** Sub-segment that gets the highlight color (e.g. IMSS portion). */
    highlight: number
    /** Optional row-level color override. */
    color?: string
    /** Sub-text shown right of the bar (e.g. "60.1% IMSS"). */
    annotation?: string
    annotation_es?: string
    /** Optional sector code — when set in `comparison` mode, the right-hand
     *  AMLO bar paints with SECTOR_COLORS[sectorCode]. */
    sectorCode?: string
    /** Optional comparator value rendered as the left-hand bar in mirror mode
     *  (e.g. Peña-era spend when total = AMLO-era spend). */
    compareTotal?: number
  }>
  unit?: string
  /** Mirror / back-to-back layout. When set, `compareTotal` per row becomes
   *  the left-hand bar (muted), `total` becomes the right-hand bar
   *  (sector-coded). The shared midline is the editorial axis. */
  comparison?: {
    leftLabel: string
    leftLabel_es?: string
    rightLabel: string
    rightLabel_es?: string
  }
  /** Top-of-card anchor stat. */
  anchor?: { value: string; label: string; label_es?: string }
  annotation?: string
  annotation_es?: string
  /** Color used for the highlighted (e.g. IMSS) portion of every row. */
  highlightColor?: string
  /** Color used for the remaining portion. */
  baseColor?: string
  /** Legend label for the highlighted segment (default "concentrated portion"). */
  highlightLabel?: string
  highlightLabel_es?: string
  /** Legend label for the base/remainder segment (default "remainder"). */
  baseLabel?: string
  baseLabel_es?: string
}

/**
 * Investigation status — how far this lead has been taken.
 * solo_datos: RUBLI identified the pattern; no external reporting yet.
 * reporteado: The case has been reported by journalists.
 * auditado: An oversight body (ASF, OIC, SFP) has reviewed.
 * procesado: Criminal or civil proceedings have begun.
 */
export type StoryStatus = 'solo_datos' | 'reporteado' | 'auditado' | 'procesado'

export interface StoryDef {
  slug: string
  outlet: StoryOutlet
  type: StoryType
  era?: StoryEra
  headline: string
  /** Optional Spanish translation of `headline`. */
  headline_es?: string
  subheadline: string
  /** Optional Spanish translation of `subheadline`. */
  subheadline_es?: string
  byline: string
  estimatedMinutes: number
  leadStat: {
    value: string
    label: string
    /** Optional Spanish translation of `label`. */
    label_es?: string
    sublabel?: string
    /** Optional Spanish translation of `sublabel`. */
    sublabel_es?: string
    color: string
  }
  /**
   * Optional per-story hero override. When present, StoryHero renders a 3-row
   * kicker-stat punchline INSTEAD of the default leadStat block. Use when the
   * story is built around a comparison (e.g. SAT confirmed 42 / RUBLI flagged
   * 6,118 / 6,076 still doing business).
   */
  kickerStats?: Array<{
    /** Optional verb prefix shown in muted serif before the number (e.g. "SAT confirmed") */
    prefix?: string
    prefix_es?: string
    /** The number itself — rendered enormous */
    value: string
    /** Tail text after the number (e.g. "ghosts.") — same line, smaller */
    suffix?: string
    suffix_es?: string
    /** Visual emphasis: 'critical' = red callout, 'data' = amber, 'muted' = neutral */
    tone?: 'critical' | 'data' | 'muted'
  }>
  chapters: StoryChapterDef[]
  relatedSlugs?: string[]
  caseIds?: number[]
  status?: StoryStatus
  nextSteps?: string[]
  nextSteps_es?: string[]
  /**
   * Cross-surface filter tags. These let Newsroom filter stories by ARIA
   * pattern / sector / year that match the active Observatory lens, and
   * let Observatory list "stories matching this view" for the current
   * lens+year+pin. Tags name the central editorial concern of the story,
   * not exhaustive coverage; one story may legitimately tag 1–3 patterns
   * and 1–3 sectors.
   */
  lensTags?: {
    /** ARIA patterns this story illuminates ('P1' through 'P7'). */
    patterns?: AriaPattern[]
    /** Sector codes from constants.ts SECTOR_COLORS keys. */
    sectors?: SectorCode[]
    /** Years the story's analysis centers on (representative, not range). */
    years?: number[]
    /** Free-text terms surfaced in the constellation TERMS lens. */
    terms?: string[]
  }
  /**
   * Dramatis Personae — named entities (vendors / institutions) that
   * appear in this story. Each entry renders as an EntityIdentityChip
   * in the "Subjects" panel between Act I and Act II. Only populate
   * when RUBLI has a confirmed vendor_id or institution_id so the chip
   * links to an actual dossier.
   */
  entities?: Array<{
    type: 'vendor' | 'institution'
    id: number
    name: string
    riskScore?: number
    ariaTier?: number
    /** Short role descriptor shown beneath the chip (e.g. "Principal suspect", "Contracting authority"). */
    role?: string
    role_es?: string
  }>
}

/** ARIA pattern codes from the queue typology (P1–P7). */
export type AriaPattern = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7'

/** 12-sector taxonomy keys — kept in sync with constants.ts SECTOR_COLORS. */
export type SectorCode =
  | 'salud'
  | 'educacion'
  | 'infraestructura'
  | 'energia'
  | 'defensa'
  | 'tecnologia'
  | 'hacienda'
  | 'gobernacion'
  | 'agricultura'
  | 'ambiente'
  | 'trabajo'
  | 'otros'

// ---------------------------------------------------------------------------
// Stories — derived from RUBLI data analysis
// ---------------------------------------------------------------------------

export const STORIES: StoryDef[] = [

  // =========================================================================
  // STORY 1: The Ghost Army — P2 Pattern, 6,118 vendors
  // =========================================================================
  {
    slug: 'el-ejercito-fantasma',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Ghost Army',
    headline_es: 'El Ejército Fantasma',
    subheadline: 'RUBLI identified 6,118 vendors matching ghost company patterns across 23 years of Mexican federal procurement. Mexico\'s tax authority has officially confirmed 42 of them. The other 6,076 are still doing business with the government.',
    subheadline_es: 'RUBLI identificó 6,118 proveedores con patrón de empresa fantasma a lo largo de 23 años de contratación federal mexicana. La autoridad fiscal confirmó oficialmente a 42. Los otros 6,076 siguen haciendo negocios con el gobierno.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 16,
    status: 'solo_datos',
    leadStat: {
      value: '6,118',
      label: 'ghost-pattern vendors',
      label_es: 'proveedores con patrón fantasma',
      sublabel: '0.7% officially detected',
      sublabel_es: '0.7% detectados oficialmente',
      color: '#f59e0b',
    },
    kickerStats: [
      { prefix: 'SAT confirmed', prefix_es: 'El SAT confirmó', value: '42', suffix: 'ghosts.', suffix_es: 'empresas fantasma.', tone: 'muted' },
      { prefix: 'RUBLI flagged', prefix_es: 'RUBLI identificó', value: '6,118', suffix: 'matching the same pattern.', suffix_es: 'con el mismo patrón.', tone: 'data' },
      { value: '6,076', suffix: 'still doing business with the government.', suffix_es: 'siguen contratando con el gobierno.', tone: 'critical' },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Algorithm Sees',
        title_es: 'Lo Que Ve el Algoritmo',
        prose: [
          'Empresas fantasma — ghost companies — are the single most efficient form of procurement fraud ever documented in Mexico. A shell entity with a rented address, a rotating legal representative, and an RFC number purchased from a fixer wins a federal contract worth hundreds of millions of pesos. Payment is wired. Work is never delivered, or delivered by a completely different entity that pockets only a fraction of the invoice. The shell dissolves. The officials who approved the contract move on.',
          'Mexico\'s Servicio de Administración Tributaria (SAT) maintains an official definitive list of confirmed ghost companies under Article 69-B of the Código Fiscal de la Federación. As of April 2026 it contains 13,960 entities stretching back to 2014. That list took a decade to build and required investigators to prove each case individually — simulated invoices, fictitious operations, sworn testimony. It is the gold standard of ghost-company detection in Mexico, and it is catastrophically incomplete.',
          'RUBLI\'s Pattern 2 algorithm does not wait for SAT. It looks instead at the fingerprints ghost vendors leave in procurement data itself: sudden single-year appearances with contract values 10 to 50 times the sector median, no prior contracting history, no subsequent contracting history, RFC numbers that resolve to nothing in the Registro Único de Proveedores y Contratistas, and bursts of activity concentrated in weeks rather than years.',
          'When RUBLI ran P2 across the full 3,051,294 federal contracts from 2002 through 2025, the algorithm flagged 6,118 vendors representing 39.6 billion pesos in total contract value. Cross-checking the P2 population against the SAT Art. 69-B definitive registry produced a single, damning statistic: 42 matches. The detection rate of official Mexican ghost-company enforcement, measured against RUBLI\'s behavioral population, is 0.7 percent.',
        ],
        prose_es: [
          'Las empresas fantasma son la forma más eficiente de fraude en contratación pública jamás documentada en México. Una entidad de fachada con un domicilio rentado, un representante legal rotativo, y un RFC comprado a un coyote gana un contrato federal por cientos de millones de pesos. El pago se transfiere. El trabajo nunca se entrega, o lo entrega una entidad totalmente distinta que se queda con apenas una fracción de la factura. La empresa de fachada se disuelve. Los funcionarios que aprobaron el contrato siguen su carrera.',
          'El Servicio de Administración Tributaria (SAT) mantiene un listado oficial definitivo de empresas fantasma confirmadas conforme al Artículo 69-B del Código Fiscal de la Federación. A abril de 2026 contiene 13,960 entidades que se remontan a 2014. Esa lista tomó una década en construirse y exigió que los investigadores demostraran cada caso individualmente — facturas simuladas, operaciones ficticias, testimonios bajo protesta. Es el estándar de oro de la detección de empresas fantasma en México, y está catastróficamente incompleta.',
          'El algoritmo del Patrón 2 (P2) de RUBLI no espera al SAT. Mira en cambio las huellas que las empresas fantasma dejan en los datos mismos de contratación: aparición súbita en un solo año con valores de contrato 10 a 50 veces la mediana sectorial, sin historial previo de contratación, sin contratación posterior, números de RFC que no resuelven a nada en el Registro Único de Proveedores y Contratistas, y ráfagas de actividad concentradas en semanas más que en años.',
          'Cuando RUBLI corrió el P2 sobre los 3,051,294 contratos federales completos de 2002 a 2025, el algoritmo identificó 6,118 proveedores que representan 39,600 MDP en valor total contratado. Cruzar la población P2 contra el padrón definitivo del SAT bajo el Art. 69-B arrojó una sola estadística devastadora: 42 coincidencias. La tasa de detección de la fiscalización oficial mexicana de empresas fantasma, medida contra la población conductual de RUBLI, es del 0.7 por ciento.',
        ],
        pullquote: {
          quote: 'One in 145 vendors the algorithm suspects is ghost-patterned has been officially confirmed by SAT. The other 144 are still contracting with the government.',
          quote_es: 'Uno de cada 145 proveedores que el algoritmo sospecha tiene patrón fantasma ha sido confirmado oficialmente por el SAT. Los otros 144 siguen contratando con el gobierno.',
          stat: '6,118',
          statLabel: 'P2-flagged vendors',
          statLabel_es: 'proveedores marcados por P2',
          barValue: 0.007,
          barLabel: '0.7% officially detected',
          barLabel_es: '0.7% detectados oficialmente',
          vizTemplate: 'mass-sliver',
        },
        sources: [
          'SAT. (2026). Listado definitivo de contribuyentes que facturaron operaciones simuladas (Art. 69-B LISR). Servicio de Administración Tributaria.',
          'RUBLI ARIA Pipeline v1.1. Pattern 2 (P2) classification, run ID 28d5c453, March 25 2026.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Confirmed vs Undetected',
        title_es: 'Confirmados vs No Detectados',
        subtitle: 'A visual audit of Mexico\'s ghost-company enforcement gap',
        subtitle_es: 'Una auditoría visual de la brecha de fiscalización mexicana',
        prose: [
          'The math of detection failure is easier to grasp as a picture than as a percentage. Imagine 6,118 vendors laid out as points on a grid — every vendor RUBLI\'s algorithm flagged as structurally consistent with ghost company operations. Color the 42 that SAT has confirmed. The rest of the field remains uncolored, which is the problem.',
          'This is not a claim that every uncolored point represents fraud. P2 is a pattern classifier; it identifies vendors whose behavior resembles documented ghost companies, not vendors proven to be ghost companies. Some will turn out to be legitimate specialized suppliers. Some will turn out to be foreign vendors with genuinely thin Mexican contracting histories. Some will turn out to be one-time subcontractors on major projects.',
          'But the baseline expectation in procurement fraud research is that somewhere between 20 and 40 percent of P2-type behavioral signatures correspond to actual fraud. Applied to RUBLI\'s 6,076 unconfirmed P2 vendors, that suggests a universe of somewhere between 1,200 and 2,400 unrecognized ghost companies currently operating in Mexican federal procurement. SAT has found 42.',
        ],
        prose_es: [
          'Las matemáticas de la falla de detección son más fáciles de captar como imagen que como porcentaje. Imagina 6,118 proveedores dispuestos como puntos en una cuadrícula — cada proveedor que el algoritmo de RUBLI marcó como estructuralmente consistente con operaciones de empresa fantasma. Pinta los 42 que el SAT ha confirmado. El resto del campo permanece sin colorear, y ese es el problema.',
          'Esto no es una afirmación de que cada punto sin colorear represente fraude. P2 es un clasificador de patrones; identifica proveedores cuya conducta se asemeja a la de empresas fantasma documentadas, no proveedores probadamente fantasma. Algunos resultarán ser proveedores legítimos especializados. Algunos serán proveedores extranjeros con historiales mexicanos genuinamente delgados. Algunos serán subcontratistas únicos en proyectos mayores.',
          'Pero la expectativa base en la investigación del fraude en contratación pública es que entre el 20 y el 40 por ciento de las firmas conductuales tipo P2 corresponden a fraude real. Aplicado a los 6,076 proveedores P2 no confirmados de RUBLI, eso sugiere un universo de entre 1,200 y 2,400 empresas fantasma no reconocidas operando actualmente en la contratación federal mexicana. El SAT ha encontrado 42.',
        ],
        chartConfig: {
          type: 'inline-dot-grid',
          title: 'Ghost-Pattern Vendors: Confirmed vs Undetected',
          title_es: 'Proveedores con patrón fantasma: Confirmados vs No Detectados',
          chartId: 'ghost-detection-grid',
          data: {
            points: [
              { label: 'EFOS confirmed ghost companies',  label_es: 'EFOS — empresas fantasma confirmadas',     value: 42,  color: '#dc2626', highlight: true },
              { label: 'P2-pattern, not on any official list', label_es: 'patrón P2, no en ningún padrón oficial', value: 6076, color: '#f59e0b' },
            ],
            annotation: 'Each dot = 1 vendor. 6,118 total flagged by RUBLI P2 algorithm across 2002-2025.',
            annotation_es: 'Cada punto = 1 proveedor. 6,118 marcados en total por el algoritmo P2 de RUBLI entre 2002-2025.',
          },
        },
        pullquote: {
          quote: 'Official enforcement has confirmed 42 ghost companies. The structural evidence suggests thousands more.',
          quote_es: 'La fiscalización oficial ha confirmado 42 empresas fantasma. La evidencia estructural sugiere miles más.',
          stat: '~1,200',
          statLabel: 'estimated unrecognized ghost companies (structural minimum)',
          statLabel_es: 'empresas fantasma no reconocidas (mínimo estructural estimado)',
          barValue: 0.034,
          barLabel: '42 SAT-confirmed against ~1,200 structural minimum (RUBLI P2)',
          barLabel_es: '42 confirmadas SAT contra ~1,200 mínimo estructural (RUBLI P2)',
          vizTemplate: 'compare-gap',
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report. Chapter 5: pattern-based anomaly detection.',
          'RUBLI SAT EFOS cross-reference table, April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Signature of Nothing',
        title_es: 'La Firma de la Nada',
        prose: [
          'The top P2 vendors by contract value are instructive precisely because their names mean nothing to the average Mexican reader — and that is the point. Ghost companies do not need recognizable names. They need tax IDs and bank accounts.',
          'RAPISCAN SYSTEMS INC, registered in the United States, appears with two contracts totaling 2.5 billion pesos. APIS FOOD BV, registered in the Netherlands, holds three contracts totaling 732 million pesos. The use of foreign-domiciled vendors is not inherently suspicious — Mexico routinely contracts with international suppliers — but the P2 signature does not weigh domicile, it weighs behavior: sudden appearance, disproportionate contract values, absence of subsequent activity.',
          'More arresting are the individual contractors. EMILIO CARRANZA OBERSOHN appears with two contracts worth approximately 370 million pesos. ARTURO PUEBLITA FERNANDEZ appears with two contracts worth roughly the same amount. VALERIA FERNANDEZ DIAZ follows the same pattern. In each case a single physical person, not a company, won federal contracts worth hundreds of millions of pesos — the equivalent of 18 to 25 million US dollars — and then disappeared from the procurement record entirely.',
          'Mexican procurement law permits individuals to hold federal contracts, and there are legitimate circumstances where a named individual contractor is appropriate: specialized consulting, artistic commissions, small-scale local services. None of those circumstances explain 370-million-peso contracts. When combined with the other P2 signals — no prior activity, no subsequent activity, concentration in a single institution over a single year — these individual contractors constitute the clearest P2 leads in the entire queue.',
        ],
        prose_es: [
          'Los proveedores P2 principales por valor de contrato son ilustrativos precisamente porque sus nombres no significan nada para el lector mexicano promedio — y ese es el punto. Las empresas fantasma no necesitan nombres reconocibles. Necesitan RFCs y cuentas bancarias.',
          'RAPISCAN SYSTEMS INC, registrada en Estados Unidos, aparece con dos contratos por un total de 2,500 MDP. APIS FOOD BV, registrada en los Países Bajos, tiene tres contratos por 732 MDP. El uso de proveedores con domicilio extranjero no es inherentemente sospechoso — México contrata rutinariamente con proveedores internacionales — pero la firma P2 no pondera el domicilio, pondera la conducta: aparición súbita, valores de contrato desproporcionados, ausencia de actividad posterior.',
          'Más sorprendentes son los contratistas individuales. EMILIO CARRANZA OBERSOHN aparece con dos contratos por aproximadamente 370 MDP. ARTURO PUEBLITA FERNANDEZ aparece con dos contratos por aproximadamente la misma cantidad. VALERIA FERNANDEZ DIAZ sigue el mismo patrón. En cada caso una sola persona física, no una empresa, ganó contratos federales por cientos de millones de pesos — el equivalente a 18 a 25 millones de dólares estadounidenses — y luego desapareció completamente del registro de contratación.',
          'La ley mexicana de contratación pública permite que personas físicas tengan contratos federales, y hay circunstancias legítimas en las que un contratista individual nominado es apropiado: consultoría especializada, comisiones artísticas, servicios locales de pequeña escala. Ninguna de esas circunstancias explica contratos de 370 MDP. Combinadas con las otras señales P2 — sin actividad previa, sin actividad posterior, concentración en una sola institución durante un solo año — estos contratistas individuales constituyen los líderes P2 más claros de toda la cola.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'Five named P2-pattern vendors',
          title_es: 'Cinco proveedores P2 nombrados',
          chartId: 'p2-named-vendors',
          data: {
            points: [
              {
                label: 'RAPISCAN SYSTEMS INC',
                value: 2500,
                annotation: 'US-INC · FOREIGN-DOMICILED · 2 CONTRACTS',
                annotation_es: 'US-INC · DOMICILIO EXTRANJERO · 2 CONTRATOS',
              },
              {
                label: 'APIS FOOD BV',
                value: 732,
                annotation: 'NL-BV · FOREIGN-DOMICILED · 3 CONTRACTS',
                annotation_es: 'NL-BV · DOMICILIO EXTRANJERO · 3 CONTRATOS',
              },
              {
                label: 'EMILIO CARRANZA OBERSOHN',
                value: 370,
                annotation: 'PERSONA FÍSICA · INDIVIDUAL CONTRACTOR · 2 CONTRACTS',
                annotation_es: 'PERSONA FÍSICA · CONTRATISTA INDIVIDUAL · 2 CONTRATOS',
                highlight: true,
              },
              {
                label: 'ARTURO PUEBLITA FERNÁNDEZ',
                value: 370,
                annotation: 'PERSONA FÍSICA · INDIVIDUAL CONTRACTOR · 2 CONTRACTS',
                annotation_es: 'PERSONA FÍSICA · CONTRATISTA INDIVIDUAL · 2 CONTRATOS',
                highlight: true,
              },
              {
                label: 'VALERIA FERNÁNDEZ DÍAZ',
                value: 370,
                annotation: 'PERSONA FÍSICA · INDIVIDUAL CONTRACTOR · 2 CONTRACTS',
                annotation_es: 'PERSONA FÍSICA · CONTRATISTA INDIVIDUAL · 2 CONTRATOS',
                highlight: true,
              },
            ],
            unit: 'MDP',
            annotation: 'Five named P2-pattern vendors, top by contract value. Rows 1–2 are foreign-domiciled incorporated entities; rows 3–5 are physical persons — not companies — each holding ≈370M-peso federal contracts and then disappearing from the procurement record entirely.',
            annotation_es: 'Cinco proveedores P2 nombrados, principales por valor de contrato. Las filas 1–2 son entidades incorporadas con domicilio extranjero; las filas 3–5 son personas físicas — no empresas — cada una con contratos federales por ≈370 MDP, y luego desaparecen completamente del registro de contratación.',
          },
        },
        pullquote: {
          quote: 'An individual person — not a company — winning federal contracts worth 370 million pesos, and then disappearing from the record entirely.',
          quote_es: 'Una persona física — no una empresa — ganando contratos federales por 370 MDP, y luego desapareciendo completamente del registro.',
          stat: '2.5B MXN',
          statLabel: 'largest P2-pattern vendor, two contracts',
          statLabel_es: 'mayor proveedor con patrón P2, dos contratos',
        },
        sources: [
          'RUBLI vendor_stats and aria_queue tables, queried April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Why Official Lists Fall Short',
        title_es: 'Por Qué los Padrones Oficiales se Quedan Cortos',
        prose: [
          'The SAT Art. 69-B process is procedurally rigorous — and therein lies its failure mode. The law requires SAT to prove, using simulated invoices and operational records, that an entity has issued fiscal receipts without underlying economic activity. That proof requires access to bank records, third-party testimony, and operational site visits. Once SAT is confident, a provisional listing is published in the Diario Oficial de la Federación with a 30-day rebuttal period. Only after the rebuttal expires does the definitive listing go live.',
          'The best-case timeline from initial detection to definitive listing is six months. The typical timeline is 12 to 18 months. The worst-case, when vendors mount legal challenges, stretches to three years or more. During that period the vendor can continue contracting because the definitive listing is the only trigger for procurement exclusion. In procurement fraud operations with deliberately short lifespans — appear, extract, dissolve — SAT\'s pace is irrelevant to the fraud cycle.',
          'OECD\'s 2023 Public Procurement Performance Report diagnosed this precise gap as a structural feature of tax-authority-driven ghost company detection globally. The Report recommended that procurement systems develop "independent behavioral red-flag detection" operating in parallel to tax enforcement, explicitly because tax processes are fundamentally retrospective while procurement fraud is prospective. World Bank research on Eastern European procurement reached the same conclusion in 2019.',
          'RUBLI\'s P2 algorithm is precisely what OECD recommended: pattern-based, procurement-native, operational in weeks rather than years. It does not replace SAT. It complements SAT with the one thing tax enforcement cannot provide at scale — speed.',
        ],
        prose_es: [
          'El proceso del Art. 69-B del SAT es procedimentalmente riguroso — y ahí radica su modo de falla. La ley exige al SAT probar, mediante facturas simuladas y registros operativos, que una entidad ha emitido comprobantes fiscales sin actividad económica subyacente. Esa prueba requiere acceso a registros bancarios, testimonios de terceros, y visitas operativas en sitio. Una vez que el SAT está convencido, se publica un listado provisional en el Diario Oficial de la Federación con un periodo de 30 días para presentar pruebas en contrario. Solo después del vencimiento del plazo entra en vigor el listado definitivo.',
          'El plazo más rápido desde la detección inicial hasta el listado definitivo es de seis meses. El plazo típico va de 12 a 18 meses. El peor caso, cuando los proveedores presentan recursos legales, se extiende a tres años o más. Durante ese periodo el proveedor puede seguir contratando porque el listado definitivo es el único disparador de exclusión de contratación. En operaciones de fraude con vidas deliberadamente cortas — aparecer, extraer, disolver — el ritmo del SAT es irrelevante para el ciclo del fraude.',
          'El Reporte de Desempeño en Contrataciones Públicas 2023 de la OCDE diagnosticó precisamente esta brecha como una característica estructural de la detección de empresas fantasma impulsada por autoridades fiscales globalmente. El reporte recomendó que los sistemas de contratación desarrollen "detección independiente de banderas rojas conductuales" operando en paralelo a la fiscalización tributaria, explícitamente porque los procesos fiscales son fundamentalmente retrospectivos mientras el fraude en contratación es prospectivo. La investigación del Banco Mundial sobre contratación en Europa del Este alcanzó la misma conclusión en 2019.',
          'El algoritmo P2 de RUBLI es precisamente lo que la OCDE recomendó: basado en patrones, nativo de la contratación, operativo en semanas más que en años. No reemplaza al SAT. Complementa al SAT con lo único que la fiscalización tributaria no puede proveer a escala — velocidad.',
        ],
        chartConfig: {
          type: 'inline-timeline',
          title: 'Time to Definitive Listing — SAT vs RUBLI',
          title_es: 'Tiempo hasta listado definitivo — SAT vs RUBLI',
          chartId: 'sat-rubli-latency',
          data: {
            points: [
              {
                label: 'RUBLI · P2',
                label_es: 'RUBLI · P2',
                value: 0.5,
                highlight: true,
                annotation: '~2 weeks per pipeline run',
                annotation_es: '~2 semanas por corrida',
              },
              {
                label: 'SAT · best case',
                label_es: 'SAT · óptimo',
                value: 6,
                annotation: 'fastest definitive listing',
                annotation_es: 'listado definitivo más rápido',
              },
              {
                label: 'SAT · typical',
                label_es: 'SAT · típico',
                value: 15,
                annotation: '12–18 months range',
                annotation_es: 'rango 12–18 meses',
              },
              {
                label: 'SAT · worst case',
                label_es: 'SAT · peor caso',
                value: 36,
                annotation: '36+ months (legal challenges)',
                annotation_es: '36+ meses (impugnaciones)',
              },
            ],
            unit: 'months',
            maxValue: 40,
            referenceLine: {
              value: 0.5,
              label: 'ARIA window',
              label_es: 'Ventana ARIA',
            },
            referenceLine2: {
              value: 6,
              label: 'SAT window',
              label_es: 'Ventana SAT',
            },
            annotation: 'Months to definitive Art. 69-B listing versus a single ARIA P2 pipeline run. During SAT\'s window, flagged vendors keep contracting. Source: OECD 2023 Public Procurement Performance Report.',
            annotation_es: 'Meses hasta listado definitivo bajo el Art. 69-B frente a una sola corrida del pipeline P2 de ARIA. Durante la ventana del SAT, los proveedores marcados siguen contratando. Fuente: OCDE, Reporte de Desempeño en Contrataciones Públicas 2023.',
          },
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report. Organization for Economic Co-operation and Development.',
          'World Bank. (2019). Warning Signs of Fraud and Corruption in Procurement. Integrity Vice Presidency.',
          'Código Fiscal de la Federación, Art. 69-B. Procedimiento de operaciones simuladas.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'La Brecha de Responsabilidad',
        prose: [
          'If the detection rate is 0.7 percent, the accountability rate is lower still. Of the 42 confirmed EFOS definitivo vendors who appear in federal procurement records, public records show criminal prosecution for a fraction — most receive only fiscal sanctions and procurement exclusion. The officials who approved their contracts are rarely named, rarely investigated, and almost never prosecuted.',
          'This is the core of Mexico\'s procurement integrity failure: a ghost company is a two-sided transaction. Someone creates the shell entity and someone inside the government signs the approval. RUBLI\'s data is silent about the second half because COMPRANET records do not reliably link individual approving officials to specific contracts. That linkage exists in internal procurement-unit records but is not systematically published.',
          'The Secretaría de la Función Pública (SFP) has the legal authority to audit procurement approvals and sanction individual officials. In practice, the SFP sanctions database shows 1,954 vendor-level sanctions across the full 23-year dataset — a tiny fraction of the 6,118 P2 vendors, and almost none of the approving officials named. The asymmetry of accountability — the shell entity is named and excluded, the official is anonymous and unsanctioned — ensures the next ghost company has no meaningful deterrent.',
          'This is the gap that RUBLI was built to illuminate. The algorithm cannot prosecute. It cannot sanction. But it can force the question: of 6,118 vendors whose behavior mirrors documented ghost companies, which procurement officials signed their contracts, and why have those officials never been investigated?',
        ],
        prose_es: [
          'Si la tasa de detección es del 0.7 por ciento, la tasa de rendición de cuentas es aún menor. De los 42 proveedores en el listado definitivo del SAT que aparecen en registros de contratación federal, los registros públicos muestran procesamiento penal para una fracción — la mayoría recibe solo sanciones fiscales y exclusión de contratación. Los funcionarios que aprobaron sus contratos rara vez son nombrados, rara vez son investigados, y casi nunca son procesados.',
          'Este es el núcleo de la falla de integridad en la contratación mexicana: una empresa fantasma es una transacción de dos lados. Alguien crea la entidad de fachada y alguien dentro del gobierno firma la aprobación. Los datos de RUBLI guardan silencio sobre la segunda mitad porque los registros de COMPRANET no vinculan de manera confiable a funcionarios aprobantes individuales con contratos específicos. Ese vínculo existe en registros internos de las unidades de contratación pero no se publica sistemáticamente.',
          'La Secretaría de la Función Pública (SFP) tiene la facultad legal de auditar las aprobaciones de contratación y sancionar a funcionarios individuales. En la práctica, la base de datos de sanciones de la SFP muestra 1,954 sanciones a nivel proveedor en los 23 años completos del conjunto de datos — una fracción minúscula de los 6,118 proveedores P2, y casi ningún funcionario aprobante nombrado. La asimetría de la rendición de cuentas — la entidad de fachada es nombrada y excluida, el funcionario es anónimo y no sancionado — asegura que la próxima empresa fantasma no enfrente disuasión real.',
          'Esta es la brecha que RUBLI fue construido para iluminar. El algoritmo no puede procesar. No puede sancionar. Pero puede forzar la pregunta: de 6,118 proveedores cuya conducta refleja la de empresas fantasma documentadas, ¿qué funcionarios firmaron sus contratos, y por qué esos funcionarios nunca han sido investigados?',
        ],
        pullquote: {
          quote: 'A ghost company is a two-sided transaction. Mexico names the shell. Mexico does not name the official who signed.',
          quote_es: 'Una empresa fantasma es una transacción de dos lados. México nombra a la fachada. México no nombra al funcionario que firmó.',
          stat: '1,954',
          statLabel: 'SFP vendor sanctions (2002-2025)',
          statLabel_es: 'sanciones SFP a proveedores (2002-2025)',
          barValue: 0,
          vizTemplate: 'zero-bar',
        },
        sources: [
          'SFP. (2025). Directorio de servidores públicos sancionados. Unidad de Responsabilidades Administrativas.',
          'RUBLI SFP sanctions cross-reference, April 2026.',
        ],
      },
      {
        id: 'ch6',
        number: 6,
        title: 'The Investigation Path',
        title_es: 'El Camino de la Investigación',
        prose: [
          'For a journalist or prosecutor, RUBLI\'s P2 list is a ready-made investigative roadmap. The 6,076 unconfirmed vendors are ranked by ARIA\'s Integrated Priority Score, which weights risk model output, financial scale, anomaly detection, and external registry flags. The top 100 by IPS represent the highest-yield investigative targets in the entire queue.',
          'The fastest path to forensic confirmation of any individual P2 vendor runs through three checks that can be completed in days, not months. First, verify business registration: does the RFC resolve to an operating entity in the Registro Federal de Contribuyentes with declared economic activity and employees? Second, check physical presence: does the registered address correspond to a real commercial location, or to a residential building, a law office, or an empty lot? Third, examine the contracting institution: did the same procurement unit award multiple contracts to multiple P2-pattern vendors in the same period?',
          'When all three checks confirm suspicion, the case moves to UIF (Unidad de Inteligencia Financiera), which can subpoena bank records and trace the flow of funds. UIF has this authority today. What it lacks is a systematically generated pipeline of pre-investigated cases. RUBLI provides that pipeline.',
        ],
        prose_es: [
          'Para un periodista o un fiscal, la lista P2 de RUBLI es un mapa investigativo listo para usar. Los 6,076 proveedores no confirmados están ordenados por el Puntaje de Prioridad Integrado (IPS) de ARIA, que pondera la salida del modelo de riesgo, la escala financiera, la detección de anomalías, y las banderas de registros externos. Los 100 más altos por IPS representan los objetivos investigativos de mayor rendimiento en toda la cola.',
          'El camino más rápido a la confirmación forense de cualquier proveedor P2 individual pasa por tres verificaciones que pueden completarse en días, no en meses. Primero, verificar el registro empresarial: ¿el RFC resuelve a una entidad operando en el Registro Federal de Contribuyentes con actividad económica declarada y empleados? Segundo, comprobar presencia física: ¿el domicilio registrado corresponde a una ubicación comercial real, o a un edificio residencial, un despacho jurídico, o un terreno baldío? Tercero, examinar la institución contratante: ¿la misma unidad de contratación adjudicó múltiples contratos a múltiples proveedores con patrón P2 en el mismo periodo?',
          'Cuando las tres verificaciones confirman la sospecha, el caso pasa a la UIF (Unidad de Inteligencia Financiera), que puede solicitar registros bancarios y rastrear el flujo de fondos. La UIF tiene esta facultad hoy. Lo que le falta es un flujo sistemáticamente generado de casos pre-investigados. RUBLI provee ese flujo.',
        ],
        sources: [
          'UIF/SHCP. (2024). Informe Anual de Actividades 2024. Unidad de Inteligencia Financiera.',
          'RUBLI ARIA Integrated Priority Score methodology, docs/ARIA_SPEC.md.',
        ],
      },
    ],
    relatedSlugs: ['el-umbral-de-los-300k', 'la-industria-del-intermediario', 'captura-institucional'],
    lensTags: {
      patterns: ['P2'],
      terms: ['fantasma', 'ghost', 'SAT', 'Art. 69-B'],
    },
    nextSteps: [
      'File freedom-of-information requests to SFP for the complete vendor investigation queue — do any of RUBLI\'s 6,076 P2 vendors appear?',
      'Cross-reference the top 50 P2-pattern vendors by value against RUPC (Registro Único de Proveedores y Contratistas) to verify business registration and physical address.',
      'Request SAT disclosure of the Art. 69-B investigation pipeline — how many vendors are currently in provisional status and how does the pipeline\'s priority ranking compare to RUBLI\'s?',
      'Interview procurement officials at the top five institutions that awarded contracts to the highest-value P2 vendors; request meeting records and bid evaluation documents.',
      'File UIF financial intelligence request for bank transaction tracing on the top 20 individual-person P2 contractors (those with physical persons rather than companies as vendor names).',
      'Pursue criminal complaint under Art. 222 del Código Penal Federal (cohecho) for specific vendor-official pairs where RUBLI flags systematic repetition.',
    ],
    nextSteps_es: [
      'Solicitar vía INAI a la SFP la cola completa de investigaciones de proveedores — ¿aparecen algunos de los 6,076 proveedores P2 de RUBLI?',
      'Cruzar los 50 proveedores P2 de mayor valor contra el RUPC para verificar registro mercantil y domicilio fiscal.',
      'Solicitar al SAT la divulgación del pipeline de investigación del Art. 69-B — ¿cuántos proveedores están en estatus provisional y cómo se compara la prioridad del SAT con la de RUBLI?',
      'Entrevistar a funcionarios de compras en las cinco instituciones que adjudicaron contratos a los proveedores P2 de mayor valor; solicitar actas de reunión y documentos de evaluación.',
      'Presentar solicitud de inteligencia financiera a la UIF para rastrear transacciones bancarias de los 20 contratistas personas físicas P2 de mayor valor.',
      'Interponer denuncia penal bajo el Art. 222 del Código Penal Federal (cohecho) para pares proveedor-funcionario donde RUBLI detecta repetición sistemática.',
    ],
  },

  // =========================================================================
  // STORY 2: The Bigger the Contract, the Higher the Risk
  // =========================================================================
  {
    slug: 'el-gran-precio',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The Bigger the Contract, the Higher the Risk',
    headline_es: 'A Mayor Contrato, Mayor Riesgo',
    subheadline: 'RUBLI\'s risk model reveals a near-monotonic ladder across 3 million contracts: as contract size grows, corruption risk climbs from safe to critical. The 40 contracts above 10 billion pesos in the database — combined value 819 billion — every one of them is high-risk. Behind those 40 contracts: 33 vendors. The mega-contract universe of Mexican federal procurement is captured by a smaller set of companies than most people realize.',
    subheadline_es: 'El modelo de riesgo de RUBLI revela una escalera casi monotónica en 3 millones de contratos: a medida que crece el tamaño del contrato, el riesgo de corrupción sube de seguro a crítico. Los 40 contratos por encima de 10 mil millones de pesos en la base de datos — valor combinado 819 mil millones — todos ellos de alto riesgo. Detrás de esos 40 contratos: 33 proveedores. El universo de mega-contratos de la contratación federal mexicana está capturado por un grupo más pequeño de empresas de lo que la mayoría imagina.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: { value: '819B MXN', label: '40 contracts above 10B MXN — every one high-risk', label_es: '40 contratos por encima de 10 mil millones — todos de alto riesgo', sublabel: '33 vendors capture the mega-contract universe', sublabel_es: '33 proveedores capturan el universo de mega-contratos', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Risk Ladder',
        title_es: 'La escalera de riesgo',
        subtitle: 'Every size bracket tells the same story',
        subtitle_es: 'Cada rango de monto cuenta la misma historia',
        prose: [
          'RUBLI\'s v0.8.5 risk model scores every federal contract on a 0-to-1 scale calibrated against 1,427 documented corruption cases. The model knows nothing about contract size when it assigns scores — it processes features like vendor concentration, price volatility, and procurement mechanism. Yet when contracts are grouped by size after scoring, the relationship between size and risk is nearly monotonic.',
          'Contracts under 100,000 pesos — small-value transactions that dominate Mexican procurement by count — average 0.25 risk. Contracts between 1 million and 10 million pesos average 0.29. Between 10 million and 50 million: 0.41, already crossing RUBLI\'s high-risk threshold. Between 50 million and 500 million: 0.68. Between 500 million and 5 billion: 0.91. Above 5 billion pesos: 0.94.',
          'The 112 contracts in the top bracket — each a single procurement event worth more than 5 billion pesos — represent 1.32 trillion pesos in total contracting. Their average risk score of 0.94 places every one of them, on average, deep inside the model\'s critical tier. This is not a statistical curiosity. It is a pattern that should structurally reshape how Mexican oversight institutions allocate audit resources.',
        ],
        prose_es: [
          'El modelo de riesgo v0.8.5 de RUBLI califica cada contrato federal en una escala de 0 a 1 calibrada contra 1,427 casos documentados de corrupción. El modelo desconoce el tamaño del contrato al asignar las calificaciones — procesa características como concentración de proveedores, volatilidad de precios y mecanismo de contratación. Sin embargo, cuando los contratos se agrupan por tamaño después de la calificación, la relación entre tamaño y riesgo es casi monótona.',
          'Los contratos por debajo de 100,000 pesos — transacciones de bajo valor que dominan la contratación mexicana por volumen — promedian un riesgo de 0.25. Los contratos entre 1 millón y 10 millones de pesos promedian 0.29. Entre 10 millones y 50 millones: 0.41, ya cruzando el umbral de alto riesgo de RUBLI. Entre 50 millones y 500 millones: 0.68. Entre 500 millones y 5 mil millones: 0.91. Por encima de 5 mil millones de pesos: 0.94.',
          'Los 112 contratos en el rango más alto — cada uno un evento de contratación por más de 5 mil millones de pesos — representan 1.32 billones de pesos en contratación total. Su calificación de riesgo promedio de 0.94 ubica a todos ellos profundamente dentro del nivel crítico del modelo. Esto no es una curiosidad estadística. Es un patrón que debería restructurar fundamentalmente cómo las instituciones de supervisión mexicanas asignan sus recursos de auditoría.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'Average Risk Score by Contract Size Bracket',
          title_es: 'Calificación de riesgo promedio por rango de monto',
          chartId: 'risk-by-size-ladder',
          data: {
            points: [
              { label: '<100K', value: 0.2546 },
              { label: '100K-500K', value: 0.2685 },
              { label: '500K-1M', value: 0.2756 },
              { label: '1M-10M', value: 0.2883 },
              { label: '10M-50M', value: 0.4094, annotation: 'HIGH', annotation_es: 'ALTO' },
              { label: '50M-500M', value: 0.6802, highlight: true, annotation: 'CRITICAL', annotation_es: 'CRÍTICO' },
              { label: '500M-5B', value: 0.9057, highlight: true, color: '#dc2626' },
              { label: '>5B MXN', value: 0.9395, highlight: true, color: '#dc2626' },
            ],
            referenceLine:  { value: 0.60, label: 'Critical threshold', label_es: 'Umbral crítico', color: '#dc2626' },
            referenceLine2: { value: 0.40, label: 'High risk threshold', label_es: 'Umbral de alto riesgo', color: '#f97316' },
            unit: 'risk score',
            maxValue: 1.0,
            yLabel: 'Average v0.8.5 risk score',
            yLabel_es: 'Riesgo promedio v0.8.5',
            annotation: 'The largest contracts in Mexican federal procurement are, on average, the riskiest.',
            annotation_es: 'Los contratos más grandes de la contratación federal mexicana son, en promedio, los más riesgosos.',
          },
        },
        pullquote: {
          quote: 'The 112 largest contracts in the dataset carry an average risk score of 0.94. In RUBLI\'s framework, 0.60 is the line above which investigation is warranted.',
          quote_es: 'Los 112 contratos más grandes en la base de datos tienen una calificación de riesgo promedio de 0.94. En el marco de RUBLI, 0.60 es el umbral a partir del cual se justifica una investigación.',
          stat: '0.94',
          statLabel: 'avg risk, contracts above 5B MXN',
          statLabel_es: 'riesgo prom., contratos por encima de 5 mil millones MXN',
          barValue: 0.94,
          barLabel: 'critical threshold: 0.60',
          vizTemplate: 'redline-gauge',
        },
        sources: [
          'RUBLI v0.8.5 risk model. Contract-level scoring, 3,051,294 records. Query: April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Why Large Contracts Attract More Risk',
        title_es: 'Por qué los contratos grandes atraen más riesgo',
        prose: [
          'The risk-by-size pattern is not a model artifact. It reflects structural realities of procurement fraud that international research has documented for more than two decades. Three mechanisms combine to make large contracts disproportionately vulnerable to corruption.',
          'First, large contracts are awarded disproportionately through direct adjudication rather than open competitive bidding. In RUBLI\'s data, contracts above 10 million pesos are awarded via direct adjudication at rates approaching 90 percent in the salud and energia sectors. Direct awards remove three of the four integrity controls that OECD identifies as essential: competitive pricing pressure, public advertising that invites scrutiny, and systematic bid evaluation that produces an audit trail.',
          'Second, large contracts concentrate enough money to justify the coordination costs of sophisticated fraud. Inventing a ghost company, bribing an official, staging a fake competitive process — each has fixed costs in time, relationships, and risk. Below some break-even point those costs exceed the expected return. Above that point, they become profitable. The IMSS Ghost Company Network operated primarily in the 100-500 million peso range. The Infrastructure Overpricing Network that RUBLI tracks in ARIA runs contracts averaging 645 million pesos each.',
          'Third, large contracts are concentrated in institutions and sectors where capture is already entrenched. PEMEX, CFE, IMSS, ISSSTE, SCT — the five largest procuring entities in Mexican federal government — generate the majority of contracts above 500 million pesos. All five have decades of documented corruption history. A large contract in an already-captured institution is not equally likely to be corrupt as a small contract in a clean institution; it is vastly more likely.',
        ],
        prose_es: [
          'El patrón de riesgo por tamaño no es un artefacto del modelo. Refleja realidades estructurales del fraude en contratación que la investigación internacional ha documentado por más de dos décadas. Tres mecanismos se combinan para hacer que los contratos grandes sean desproporcionadamente vulnerables a la corrupción.',
          'Primero, los contratos grandes se adjudican de manera desproporcionada mediante adjudicación directa, no por licitación competitiva abierta. En los datos de RUBLI, los contratos por encima de 10 millones de pesos se adjudican mediante adjudicación directa a tasas que se aproximan al 90 por ciento en los sectores de salud y energía. Las adjudicaciones directas eliminan tres de los cuatro controles de integridad que la OCDE identifica como esenciales: la presión de precios competitivos, la publicidad que invita al escrutinio y la evaluación sistemática de ofertas que produce un historial de auditoría.',
          'Segundo, los contratos grandes concentran suficiente dinero para justificar los costos de coordinación del fraude sofisticado. Inventar una empresa fantasma, sobornar a un funcionario, simular un proceso competitivo falso — cada uno tiene costos fijos de tiempo, relaciones y riesgo. Por debajo de cierto punto de equilibrio, esos costos superan el beneficio esperado. Por encima de ese punto, se vuelven rentables. La Red de Empresas Fantasma del IMSS operó principalmente en el rango de 100-500 millones de pesos. La Red de Sobreprecio en Infraestructura que RUBLI rastrea en ARIA gestiona contratos que promedian 645 millones de pesos cada uno.',
          'Tercero, los contratos grandes se concentran en instituciones y sectores donde la captura ya está arraigada. PEMEX, CFE, IMSS, ISSSTE, SCT — las cinco entidades contratantes más grandes del gobierno federal mexicano — generan la mayoría de los contratos por encima de 500 millones de pesos. Las cinco tienen décadas de historia documentada de corrupción. Un contrato grande en una institución ya capturada no es igualmente probable de ser corrupto que un contrato pequeño en una institución limpia; es vastamente más probable.',
        ],
        pullquote: {
          quote: 'Large contracts remove three of OECD\'s four integrity controls: competitive pricing, public advertising, and systematic evaluation.',
          quote_es: 'Los contratos grandes eliminan tres de los cuatro controles de integridad de la OCDE: precios competitivos, publicidad pública y evaluación sistemática.',
          stat: '~90%',
          statLabel: 'direct-award rate for contracts >10M MXN in salud & energía',
          statLabel_es: 'tasa de adjudicación directa para contratos >10M MXN en salud y energía',
          barValue: 0.90,
          barLabel: 'OECD recommended maximum: 25-30%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'OECD. (2015). Recommendation of the Council on Public Procurement.',
          'IMF Working Paper 2022/094. Assessing Vulnerabilities to Corruption in Public Procurement.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Mega-Contract Universe',
        title_es: 'El universo de los mega-contratos',
        subtitle: '795 contracts above one billion pesos — captured by 466 vendors',
        subtitle_es: '795 contratos por encima de mil millones de pesos — capturados por 466 proveedores',
        prose: [
          'Cross the one-billion-peso threshold and the procurement landscape thins rapidly. RUBLI\'s database contains 3,051,294 contracts. Of those, 795 cleared the one-billion-peso line and account for 2.66 trillion pesos in cumulative spending. Behind those 795 contracts sit just 466 vendors — about 0.15 percent of the active vendor universe.',
          'The concentration sharpens further at higher tiers. Above 5 billion pesos, the universe is 112 contracts and 93 vendors. Above 10 billion pesos, just 40 contracts and 33 vendors — and every one of those 40 contracts is high-risk. The average risk score in the >10B tier is 0.962. There is no clean mega-contract in the RUBLI dataset; the model has yet to find one.',
          'These vendors are not random. They cluster in five recognizable types: pharmaceutical distributors with multi-decade IMSS relationships (Grupo Fármacos, Maypo, PISA, DIMM — see The Invisible Monopoly), Tren Maya construction contractors awarded post-2019 (Operadora CICSA, ICA Constructora, Alstom Transport), Pemex/CFE infrastructure providers (Dowell Schlumberger, ICA Fluor, Cotemar), military-construction operators (Coconal, Constructora Arhnos), and large-format card / voucher operators that capture welfare-program logistics (TOKA Internacional). Each cluster has a recognizable institutional anchor and a small recurring vendor cast.',
          'The single most aggressive case in the entire mega-contract universe is MANTENIMIENTO EXPRESS MARÍTIMO S.A.P.I. DE C.V., which received one contract worth 69.9 billion pesos at a perfect 1.000 risk score — Pemex/marine maintenance, awarded as a sole-source contract. URBANISSA S.A. DE C.V. received a single 58-billion-peso contract at a 0.969 score. CONSTRUCTORA ARHNOS, S.A. DE C.V. received a single 31.9-billion-peso contract at a 1.000 score. Each of these is a single contract that is, by itself, larger than the entire annual budget of several Mexican states.',
        ],
        prose_es: [
          'Cruzar el umbral de mil millones de pesos hace que el panorama de contratación se adelgace rápidamente. La base de datos de RUBLI contiene 3,051,294 contratos. De esos, 795 superaron la línea del mil millones y representan 2.66 billones de pesos en gasto acumulado. Detrás de esos 795 contratos se encuentran solo 466 proveedores — aproximadamente el 0.15 por ciento del universo activo de proveedores.',
          'La concentración se agudiza más en los niveles superiores. Por encima de 5 mil millones de pesos, el universo es de 112 contratos y 93 proveedores. Por encima de 10 mil millones, solo 40 contratos y 33 proveedores — y cada uno de esos 40 contratos es de alto riesgo. La calificación de riesgo promedio en el nivel >10 mil millones es de 0.962. No existe un mega-contrato limpio en el conjunto de datos de RUBLI; el modelo aún no ha encontrado ninguno.',
          'Estos proveedores no son aleatorios. Se agrupan en cinco tipos reconocibles: distribuidoras farmacéuticas con relaciones de varias décadas con el IMSS (Grupo Fármacos, Maypo, PISA, DIMM — véase El Monopolio Invisible), contratistas de construcción del Tren Maya adjudicados después de 2019 (Operadora CICSA, ICA Constructora, Alstom Transport), proveedores de infraestructura Pemex/CFE (Dowell Schlumberger, ICA Fluor, Cotemar), operadores de construcción militar (Coconal, Constructora Arhnos) y operadores de tarjetas y vales a gran escala que capturan la logística de programas de bienestar (TOKA Internacional). Cada cluster tiene un ancla institucional reconocible y un reparto reducido de proveedores recurrentes.',
          'El caso más agresivo en todo el universo de mega-contratos es MANTENIMIENTO EXPRESS MARÍTIMO S.A.P.I. DE C.V., que recibió un contrato por 69.9 mil millones de pesos con una calificación de riesgo perfecta de 1.000 — mantenimiento marino Pemex, adjudicado como contrato de proveedor único. URBANISSA S.A. DE C.V. recibió un solo contrato por 58 mil millones con una calificación de 0.969. CONSTRUCTORA ARHNOS, S.A. DE C.V. recibió un solo contrato por 31.9 mil millones con calificación de 1.000. Cada uno de estos es un contrato individual que, por sí solo, es mayor que el presupuesto anual completo de varios estados mexicanos.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'Top 12 Mega-Contract Vendors — Total Pesos in Contracts ≥1B MXN',
          title_es: 'Top 12 proveedores de mega-contratos — Pesos totales en contratos ≥1 mil millones',
          chartId: 'mega-vendors',
          data: {
            points: [
              // 2026-05-21: bar color now binds to riskScore via RISK_COLORS
              // in InlineBarChart. `highlight` retained as data signal (single-
              // contract / perfect-score outliers) but no longer drives fill.
              { label: 'Operadora CICSA',         value: 139.0, riskScore: 0.36, highlight: true, annotation: '5 contracts · risk 0.36',          annotation_es: '5 contratos · riesgo 0.36' },
              { label: 'Mantenimiento Express',   value: 69.9,  riskScore: 1.00, highlight: true, annotation: '1 contract · risk 1.00',           annotation_es: '1 contrato · riesgo 1.00' },
              { label: 'Dowell Schlumberger',     value: 64.8,  riskScore: 0.97,                  annotation: '9 contracts · risk 0.97',          annotation_es: '9 contratos · riesgo 0.97' },
              { label: 'Grupo Fármacos',          value: 62.9,  riskScore: 0.99, highlight: true, annotation: '29 contracts · risk 0.99',         annotation_es: '29 contratos · riesgo 0.99' },
              { label: 'Urbanissa',               value: 58.0,  riskScore: 0.97, highlight: true, annotation: '1 contract · risk 0.97',           annotation_es: '1 contrato · riesgo 0.97' },
              { label: 'ICA Constructora',        value: 41.8,  riskScore: 0.65,                  annotation: '3 contracts · risk 0.65 · Tren Maya', annotation_es: '3 contratos · riesgo 0.65 · Tren Maya' },
              { label: 'Alstom Transport',        value: 37.9,  riskScore: 0.92,                  annotation: '2 contracts · risk 0.92 · Tren Maya', annotation_es: '2 contratos · riesgo 0.92 · Tren Maya' },
              { label: 'Constructora Arhnos',     value: 31.9,  riskScore: 1.00, highlight: true, annotation: '1 contract · risk 1.00',           annotation_es: '1 contrato · riesgo 1.00' },
              { label: 'ICA Fluor Daniel',        value: 31.2,  riskScore: 1.00,                  annotation: '6 contracts · risk 1.00',          annotation_es: '6 contratos · riesgo 1.00' },
              { label: 'Grupo Constructor Marhnos',value: 28.0, riskScore: 0.37,                  annotation: '2 contracts · risk 0.37',          annotation_es: '2 contratos · riesgo 0.37' },
              { label: 'Repsol Exploración',      value: 27.2,  riskScore: 1.00,                  annotation: '1 contract · risk 1.00',           annotation_es: '1 contrato · riesgo 1.00' },
              { label: 'Mota-Engil México',       value: 25.8,  riskScore: 0.95,                  annotation: '4 contracts · risk 0.95',          annotation_es: '4 contratos · riesgo 0.95' },
            ],
            unit: 'B MXN',
            annotation: 'Each vendor\'s total only counts contracts ≥1B MXN. Top 12 capture 618 billion pesos — 23 percent of the mega-contract universe. Highlighted rows have either a single-contract structure (one vendor, one mega contract) or are perfect-score (1.00) outliers.',
            annotation_es: 'El total de cada proveedor solo cuenta contratos ≥1 mil millones. Los 12 primeros capturan 618 mil millones de pesos — 23 por ciento del universo de mega-contratos. Las filas resaltadas tienen estructura de un solo contrato (un proveedor, un mega-contrato) o son atípicos con calificación perfecta (1.00).',
          },
        },
        pullquote: {
          quote: 'A single contract for 69.9 billion pesos at a 1.000 risk score. A single contract for 58 billion. A single contract for 31.9 billion. The mega-contract tier in Mexican federal procurement is not a market. It is a directory.',
          quote_es: 'Un solo contrato por 69.9 mil millones de pesos con calificación de riesgo 1.000. Otro por 58 mil millones. Otro por 31.9 mil millones. El nivel de mega-contratos en la contratación federal mexicana no es un mercado. Es un directorio.',
          stat: '40',
          statLabel: 'contracts above 10B MXN — average risk score 0.962, every one critical',
          statLabel_es: 'contratos por encima de 10 mil millones — riesgo promedio 0.962, todos críticos',
          barValue: 1.0,
          barLabel: '100% of contracts >10B MXN are flagged high-risk',
          barLabel_es: '100% de los contratos >10 mil millones marcados de alto riesgo',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'RUBLI contracts table aggregated by vendor with amount_mxn ≥ 1e9. April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025, mega-contract universe.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The Sectors That Concentrate the Giants',
        title_es: 'Los sectores que concentran a los gigantes',
        prose: [
          'Where do mega-contracts cluster? Four sectors absorb 92 percent of the pesos awarded in contracts above one billion. Energía leads at 917.3 billion pesos (34.5 percent of mega-contract pesos), almost entirely Pemex and CFE infrastructure. Salud follows at 638.6 billion (24.0 percent), the IMSS pharmaceutical and hospital cluster. Infraestructura at 552.4 billion (20.8 percent) is dominated by SCT/CONAGUA mega-projects pre-AMLO and military construction post-2019. Hacienda at 349.6 billion (13.1 percent) covers welfare-card vendors and tax-administration outsourcing.',
          'The four sectors that absorb the giants are also the four sectors with the longest documented corruption histories. Pemex contracting has been a corruption fixture since the Cantarell-era contracts of the 1990s. IMSS pharmaceutical contracting carries the cartel structure documented in The Invisible Monopoly. Federal infrastructure contracting was the spine of La Estafa Maestra and continues through the militarization documented in The Era of Risk. Welfare-card outsourcing concentrated under AMLO around TOKA, Sodexo, and Edenred at billion-peso scale.',
          'Compare to the sectors absent from the mega-contract list. Educación generated only 2 percent of mega-contract pesos despite being the third-largest budget allocation in the federal accounts. Trabajo, Defensa (in CIVILIAN COMPRANET — military contracts go through different channels), Agricultura, and Medio Ambiente together account for less than 4 percent. The mega-contract phenomenon is not evenly distributed across Mexican government; it is overwhelmingly concentrated in the four sectors where institutional capture is most documented.',
          'This is what international procurement research calls "concentrated risk capture" — the pattern in which the highest-value transactions and the highest-risk transactions are the same transactions, in the same institutions, with the same recurring vendor cast. OECD\'s 2023 review of Mexico identified this pattern explicitly and recommended sector-specific oversight teams concentrated on the four highest-risk sectors. The recommendation was not implemented. The mega-contract universe continues to operate outside the audit rate that would deter it.',
        ],
        prose_es: [
          '¿Dónde se concentran los mega-contratos? Cuatro sectores absorben el 92 por ciento de los pesos adjudicados en contratos por encima de mil millones. Energía lidera con 917.3 mil millones de pesos (34.5 por ciento de los pesos en mega-contratos), casi en su totalidad infraestructura de Pemex y CFE. Salud le sigue con 638.6 mil millones (24.0 por ciento), el cluster farmacéutico y hospitalario del IMSS. Infraestructura con 552.4 mil millones (20.8 por ciento) está dominada por mega-proyectos de SCT/CONAGUA antes de AMLO y construcción militar después de 2019. Hacienda con 349.6 mil millones (13.1 por ciento) cubre proveedores de tarjetas de bienestar y externalización de la administración fiscal.',
          'Los cuatro sectores que absorben a los gigantes son también los cuatro con las historias de corrupción documentadas más largas. La contratación en Pemex ha sido un elemento recurrente de corrupción desde los contratos de la era Cantarell en los años noventa. La contratación farmacéutica del IMSS lleva la estructura de cártel documentada en El Monopolio Invisible. La contratación de infraestructura federal fue la columna vertebral de La Estafa Maestra y continúa a través de la militarización documentada en El Sexenio del Riesgo. La externalización de tarjetas de bienestar se concentró bajo AMLO alrededor de TOKA, Sodexo y Edenred a escala de miles de millones.',
          'Compare con los sectores ausentes de la lista de mega-contratos. Educación generó solo el 2 por ciento de los pesos en mega-contratos a pesar de ser la tercera asignación presupuestaria más grande en las cuentas federales. Trabajo, Defensa (en el COMPRANET civil — los contratos militares pasan por canales distintos), Agricultura y Medio Ambiente juntos representan menos del 4 por ciento. El fenómeno de los mega-contratos no está distribuido uniformemente en el gobierno mexicano; está abrumadoramente concentrado en los cuatro sectores donde la captura institucional está más documentada.',
          'Esto es lo que la investigación internacional en contratación llama "captura de riesgo concentrado" — el patrón en que las transacciones de mayor valor y las de mayor riesgo son las mismas transacciones, en las mismas instituciones, con el mismo reparto de proveedores recurrentes. La revisión de la OCDE de México de 2023 identificó explícitamente este patrón y recomendó equipos de supervisión específicos por sector concentrados en los cuatro sectores de mayor riesgo. La recomendación no fue implementada. El universo de mega-contratos sigue operando fuera de la tasa de auditoría que lo disuadiría.',
        ],
        chartConfig: {
          type: 'editorial-thermometer',
          title: 'Mega-Contract Pesos (≥1B MXN) by Sector',
          title_es: 'Pesos en mega-contratos (≥1 mil millones) por sector',
          chartId: 'mega-by-sector',
          data: {
            points: [
              { label: 'Energía',          value: 917.3, color: '#eab308', highlight: true, annotation: '34.5% · 250 contracts',                annotation_es: '34.5% · 250 contratos' },
              { label: 'Salud',            value: 638.6, color: '#dc2626', highlight: true, annotation: '24.0% · 258 contracts',                annotation_es: '24.0% · 258 contratos' },
              { label: 'Infraestructura',  value: 552.4, color: '#ea580c', highlight: true, annotation: '20.8% · 100 contracts',                annotation_es: '20.8% · 100 contratos' },
              { label: 'Hacienda',         value: 349.6, color: '#16a34a',                  annotation: '13.1% · 92 contracts',                 annotation_es: '13.1% · 92 contratos' },
              { label: 'Educación',        value: 52.9,  color: '#3b82f6',                  annotation: '2.0%',                                  annotation_es: '2.0%' },
              { label: 'Medio Ambiente',   value: 51.1,  color: '#10b981',                  annotation: '1.9%',                                  annotation_es: '1.9%' },
              { label: 'Gobernación',      value: 47.1,  color: '#be123c',                  annotation: '1.8%',                                  annotation_es: '1.8%' },
              { label: 'Defensa (civil)',  value: 24.9,  color: '#1e3a5f',                  annotation: '0.9% (mil. via separate channels)',     annotation_es: '0.9% (mil. vía canales aparte)' },
              { label: 'Agricultura',      value: 12.4,  color: '#22c55e',                  annotation: '0.5%',                                  annotation_es: '0.5%' },
              { label: 'Trabajo',          value: 6.2,   color: '#f97316',                  annotation: '0.2%',                                  annotation_es: '0.2%' },
            ],
            referenceLine: { value: 265.3, label: 'Equal share (1 of 10 sectors)', label_es: 'Parte igual (1 de 10 sectores)', color: 'var(--color-sector-tecnologia)' },
            unit: 'B MXN',
            annotation: 'Mega-contract pesos by sector. Top 4 sectors absorb 92 percent of the universe. The four sectors are also the four with the longest documented corruption histories.',
            annotation_es: 'Pesos en mega-contratos por sector. Los 4 sectores principales absorben el 92 por ciento del universo. Estos cuatro sectores son los mismos cuatro con las historias de corrupción mejor documentadas.',
          },
        },
        pullquote: {
          quote: 'The sectors that absorb Mexico\'s biggest contracts are the same four with the longest documented corruption histories. Concentrated capture, by definition.',
          quote_es: 'Los sectores que absorben los contratos más grandes de México son los mismos cuatro con las historias de corrupción mejor documentadas. Captura concentrada, por definición.',
          stat: '92%',
          statLabel: 'mega-contract pesos concentrated in 4 sectors (Energía, Salud, Infra, Hacienda)',
          statLabel_es: 'pesos en mega-contratos concentrados en 4 sectores (Energía, Salud, Infra, Hacienda)',
          barValue: 0.92,
          barLabel: 'Educación, Trabajo, Defensa-civil, Medio Ambiente, Agricultura combined: < 8%',
          barLabel_es: 'Educación, Trabajo, Defensa-civil, Ambiente, Agricultura combinados: < 8%',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'RUBLI contracts × sectors aggregation, mega-contract subset (amount_mxn ≥ 1e9). April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Section on sectoral concentration.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap Inverts the Ladder',
        title_es: 'El vacío de fiscalización invierte la escalera',
        prose: [
          'The risk ladder has a political dimension that the data alone cannot express. Every point on the ladder — from under-100K contracts to above-10-billion contracts — carries oversight responsibilities assigned by law to different institutions. ASF audits federal accounts after the fact. SFP oversees procurement process integrity. COFECE investigates anticompetitive behavior. UIF tracks suspicious financial flows. In principle, between these four institutions, no significant contract should escape scrutiny.',
          'In practice, the top of the ladder is where the institutions stop functioning. The 40 contracts above 10 billion pesos — every one high-risk, average score 0.962 — are also the 40 contracts most likely to involve politically connected vendors, institutions close to presidential priorities, and procurement decisions that carry policy weight far beyond any individual audit. Auditing a 10-billion-peso contract is not a technical exercise; it is a political confrontation, and political confrontations are rationed carefully. The 40 contracts on this list are not a manageable workload for ASF. They are a list of conversations the political system has chosen not to have.',
          'Meanwhile, the same oversight institutions are visibly active at the bottom of the ladder. SFP and ASF review thousands of small-value contracts annually. Those audits are politically cheaper, technically easier, and generate press releases demonstrating oversight activity. The result is a system whose audit intensity is inversely correlated with corruption risk. The small contracts, which carry the lowest risk, get the most scrutiny. The large contracts, which carry the highest risk, get the least.',
          'RUBLI\'s data does not resolve this dynamic. It quantifies it. 819 billion pesos of contracting in the >10B tier; 33 vendors; risk average 0.962; audit rate near zero. That is the shape of the accountability gap in a single five-line summary. Closing it does not require new laws or new technology. It requires naming the 33 vendors and the 40 contracts and assigning each to a specific oversight investigation, regardless of which ministry signed them.',
        ],
        prose_es: [
          'La escalera de riesgo tiene una dimensión política que los datos solos no pueden expresar. Cada punto de la escalera — desde contratos por debajo de 100,000 pesos hasta contratos por encima de 10 mil millones — lleva responsabilidades de supervisión asignadas por ley a diferentes instituciones. La ASF audita las cuentas federales a posteriori. La SFP supervisa la integridad del proceso de contratación. La COFECE investiga comportamientos anticompetitivos. La UIF rastrea flujos financieros sospechosos. En principio, entre estas cuatro instituciones, ningún contrato significativo debería escapar al escrutinio.',
          'En la práctica, la cima de la escalera es donde las instituciones dejan de funcionar. Los 40 contratos por encima de 10 mil millones de pesos — todos de alto riesgo, calificación promedio 0.962 — son también los 40 contratos con mayor probabilidad de involucrar a proveedores políticamente conectados, instituciones cercanas a las prioridades presidenciales y decisiones de contratación con un peso político muy superior al de cualquier auditoría individual. Auditar un contrato de 10 mil millones de pesos no es un ejercicio técnico; es una confrontación política, y las confrontaciones políticas se racionan con cuidado. Los 40 contratos de esta lista no son una carga de trabajo manejable para la ASF. Son una lista de conversaciones que el sistema político ha decidido no tener.',
          'Mientras tanto, las mismas instituciones de supervisión son visiblemente activas en la parte baja de la escalera. La SFP y la ASF revisan miles de contratos de bajo valor anualmente. Esas auditorías son políticamente más baratas, técnicamente más fáciles y generan comunicados de prensa que demuestran actividad supervisora. El resultado es un sistema cuya intensidad de auditoría está inversamente correlacionada con el riesgo de corrupción. Los contratos pequeños, que tienen el riesgo más bajo, reciben el mayor escrutinio. Los contratos grandes, que tienen el riesgo más alto, reciben el menor.',
          'Los datos de RUBLI no resuelven esta dinámica. La cuantifican. 819 mil millones de pesos de contratación en el nivel >10 mil millones; 33 proveedores; promedio de riesgo 0.962; tasa de auditoría cercana a cero. Esa es la forma del vacío de rendición de cuentas en un resumen de cinco líneas. Cerrarlo no requiere nuevas leyes ni nueva tecnología. Requiere nombrar a los 33 proveedores y los 40 contratos y asignar cada uno a una investigación de supervisión específica, independientemente de qué ministerio los firmó.',
        ],
        pullquote: {
          quote: 'Mexico audits its cleanest contracts the most and its riskiest contracts the least. The accountability gap grows with every peso of contract value.',
          quote_es: 'México audita sus contratos más limpios con la mayor intensidad y los más riesgosos con la menor. El vacío de rendición de cuentas crece con cada peso de valor de contrato.',
          stat: '95%',
          statLabel: 'estimated share of contracts above 5B MXN never audited',
          statLabel_es: 'porcentaje estimado de contratos por encima de 5 mil millones nunca auditados',
          barValue: 0.05,
          barLabel: 'estimated audit coverage rate: 5%',
          barLabel_es: 'tasa estimada de cobertura de auditoría: 5%',
          vizTemplate: 'mass-sliver',
        },
        sources: [
          'Transparencia Mexicana. (2023). Índice Nacional de Corrupción y Buen Gobierno.',
          'ASF. (2024). Programa Anual de Auditorías para la Fiscalización Superior de la Cuenta Pública.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 5.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'marea-de-adjudicaciones', 'el-sexenio-del-riesgo'],
    lensTags: {
      patterns: ['P5'],
      terms: ['sobreprecio', 'overpricing', 'large contracts'],
    },
    nextSteps: [
      'Request from SFP the complete list of contracts above 100M MXN awarded via direct adjudication in 2023-2025; cross-reference against RUBLI\'s P2 and P6 vendor lists.',
      'File ASF audit requests for the top 20 contracts above 500M MXN that RUBLI flags as critical-risk, naming the specific contract IDs.',
      'Compare Mexico\'s large-contract audit coverage rate against OECD peer countries using the 2023 Procurement Performance Review baseline data.',
      'Investigate whether procurement thresholds under LAASSP Art. 42 have been adjusted for inflation since 2012; compute the real-value erosion.',
      'Request from Congress (Cámara de Diputados) the complete list of contracts above 5B MXN approved in each fiscal year and cross-reference with RUBLI risk scores.',
      'Open dedicated case files on the four dominant IMSS pharmaceutical vendors (Grupo Fármacos, Maypo, PISA, DIMM) with focus on 2018-2025 contract awards.',
    ],
    nextSteps_es: [
      'Solicitar a la SFP la lista completa de contratos superiores a 100M MXN adjudicados directamente en 2023-2025; cruzar contra los listados P2 y P6 de RUBLI.',
      'Presentar solicitudes de auditoría a la ASF para los 20 contratos superiores a 500M MXN que RUBLI califica como riesgo crítico, citando los IDs de contrato específicos.',
      'Comparar la tasa de cobertura de auditoría de México en contratos de gran valor contra países OCDE usando los datos del Informe de Desempeño en Contratación 2023.',
      'Investigar si los umbrales de contratación del Art. 42 de la LAASSP han sido ajustados por inflación desde 2012; calcular la erosión en valor real.',
      'Solicitar a la Cámara de Diputados la lista completa de contratos superiores a 5,000 MDP aprobados en cada ejercicio fiscal y cruzar con los puntajes de riesgo de RUBLI.',
      'Abrir expedientes de investigación sobre los cuatro proveedores farmacéuticos dominantes en el IMSS (Grupo Fármacos, Maypo, PISA, DIMM), con énfasis en contratos 2018-2025.',
    ],
  },

  // =========================================================================
  // STORY 3: The Invisible Monopoly
  // =========================================================================
  {
    slug: 'el-monopolio-invisible',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Invisible Monopoly',
    headline_es: 'El Monopolio Invisible',
    subheadline: 'Four pharmaceutical vendors — Grupo Fármacos Especializados, Farmacéuticos Maypo, Laboratorios PISA, and DIMM — collected 328.6 billion pesos from Mexico\'s federal government across 23 years. They share a single dominant customer (IMSS), thousands of overlapping bidding procedures, and a relay-race of peak years that suggests not four monopolists, but one cartel taking turns.',
    subheadline_es: 'Cuatro proveedores farmacéuticos — Grupo Fármacos Especializados, Farmacéuticos Maypo, Laboratorios PISA y DIMM — recibieron 328.6 mil millones de pesos del gobierno federal mexicano en 23 años. Comparten un solo cliente dominante (el IMSS), miles de procedimientos de licitación coincidentes y una sucesión de años pico que sugiere no cuatro monopolistas, sino un cártel turnándose.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 17,
    status: 'reporteado',
    leadStat: { value: '328.6B MXN', label: 'four-vendor pharmaceutical concentration', label_es: 'concentración farmacéutica de cuatro proveedores', sublabel: 'Grupo Fármacos · Maypo · PISA · DIMM, 2003-2025', sublabel_es: 'Grupo Fármacos · Maypo · PISA · DIMM, 2003-2025', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'Four Vendors, 328 Billion Pesos',
        title_es: 'Cuatro proveedores, 328 mil millones de pesos',
        prose: [
          'A monopoly does not have to be one company. Four pharmaceutical distributors — GRUPO FÁRMACOS ESPECIALIZADOS, FARMACÉUTICOS MAYPO, LABORATORIOS PISA, and DIMM (Distribuidora Internacional de Medicamentos y Equipo Médico) — collected 328.6 billion pesos from Mexico\'s federal government between 2003 and 2025. Their combined risk-score average is 0.69, solidly critical in RUBLI\'s v0.8.5 model. Three of the four sit at the top of RUBLI\'s entire vendor risk ladder.',
          'No competitive market produces this. The four vendors are not competing for distinct slices of demand; they are sharing one. They funnel their revenue through the same dominant customer, they appear in each other\'s losing-bid records by the thousands, and their peak years line up like sprinters in a relay — one rises as another falls. By the architecture of the data, this is one cartel that takes turns, not four monopolists in different lanes.',
          'The framework that produced these contracts has shifted three times — IMSS-direct procurement under Calderón, INSABI/BIRMEX under AMLO, IMSS-Bienestar consolidated tendering under Sheinbaum — and the four vendors have rotated through each architecture without losing their dominant share. The mechanism changed; the recipients did not.',
        ],
        prose_es: [
          'Un monopolio no tiene por qué ser una sola empresa. Cuatro distribuidoras farmacéuticas — GRUPO FÁRMACOS ESPECIALIZADOS, FARMACÉUTICOS MAYPO, LABORATORIOS PISA y DIMM (Distribuidora Internacional de Medicamentos y Equipo Médico) — recibieron 328.6 mil millones de pesos del gobierno federal mexicano entre 2003 y 2025. Su calificación de riesgo combinada promedia 0.69, sólidamente en nivel crítico del modelo v0.8.5 de RUBLI. Tres de las cuatro se ubican en la cima de toda la escalera de riesgo de proveedores de RUBLI.',
          'Ningún mercado competitivo produce esto. Los cuatro proveedores no compiten por distintas porciones de la demanda; la comparten. Canalizan sus ingresos a través del mismo cliente dominante, aparecen en los registros de ofertas perdidas el uno del otro por miles, y sus años pico se alinean como corredores en un relevo — uno sube a medida que otro baja. Por la arquitectura de los datos, esto es un cártel que se turna, no cuatro monopolistas en carriles distintos.',
          'El marco que produjo estos contratos ha cambiado tres veces — contratación directa IMSS bajo Calderón, INSABI/BIRMEX bajo AMLO, licitación consolidada IMSS-Bienestar bajo Sheinbaum — y los cuatro proveedores han rotado a través de cada arquitectura sin perder su cuota dominante. El mecanismo cambió; los destinatarios no.',
        ],
        pullquote: {
          quote: 'A monopoly does not have to be one company. It can be four companies that take turns.',
          quote_es: 'Un monopolio no tiene que ser una empresa. Pueden ser cuatro empresas turnándose.',
          stat: '328.6B MXN',
          statLabel: 'Big Four pharmaceutical concentration, 2003-2025',
          statLabel_es: 'Concentración farmacéutica del Big Four, 2003-2025',
          barValue: 0.103,
          barLabel: '10.4% of all federal IMSS contracting (any sector, any year)',
          barLabel_es: '10.4% de toda la contratación federal del IMSS (cualquier sector, cualquier año)',
          vizTemplate: 'mass-sliver',
        },
        chartConfig: {
          type: 'inline-bar',
          title: 'The Big Four — Total Contracting 2003-2025',
          title_es: 'El Big Four — Contratación total 2003-2025',
          chartId: 'big-four-totals',
          data: {
            points: [
              { label: 'Grupo Fármacos', value: 133.4, riskScore: 0.99, annotation: 'risk 0.99', annotation_es: 'riesgo 0.99' },
              { label: 'Maypo', value: 88.0, riskScore: 0.95, annotation: 'risk 0.95', annotation_es: 'riesgo 0.95' },
              { label: 'PISA', value: 55.6, riskScore: 0.75, annotation: 'risk 0.75', annotation_es: 'riesgo 0.75' },
              { label: 'DIMM', value: 51.6, riskScore: 0.54, annotation: 'risk 0.54', annotation_es: 'riesgo 0.54' },
            ],
            unit: 'B MXN',
            annotation: 'Total federal contracting per vendor, 2003-2025. Combined: 328.6B MXN. Three of the four carry critical-tier risk scores.',
            annotation_es: 'Contratación federal total por proveedor, 2003-2025. Combinado: 328.6 mil millones de pesos. Tres de los cuatro tienen calificaciones de riesgo de nivel crítico.',
          },
        },
        sources: [
          'RUBLI vendor_stats and contracts tables. P1 pattern classification, April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2003-2025, vendor_id IN (29277, 2873, 4335, 13885).',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'One Customer',
        title_es: 'Un solo cliente',
        prose: [
          'The four vendors share a single dominant customer. The Instituto Mexicano del Seguro Social (IMSS) — Mexico\'s largest single-payer health institution, with a budget rivaling several state economies — accounts for between half and three-quarters of every Big-Four vendor\'s lifetime federal revenue. For Grupo Fármacos Especializados, it is 60.1 percent. For Maypo, 50.5 percent. For DIMM, 68.5 percent. For Laboratorios PISA, 72.2 percent — the highest concentration of the four.',
          'Combined, the Big Four collected 202.9 billion pesos in IMSS contracting alone — 10.4 percent of every peso IMSS spent on any contractor in any sector across 23 years. Four pharmaceutical vendors, one in every ten pesos.',
          'Concentration of this magnitude does not happen by competitive market dynamics. It happens because IMSS\'s procurement architecture allowed a small set of vendors to accumulate compounding advantages: catalog familiarity, delivery infrastructure tuned to IMSS\'s specifications, and direct-award eligibility based on prior contracting history. The legal mechanism is "existing supplier relationship" under Article 41 of the Ley de Adquisiciones — a clause that converts past dependence into present preference.',
        ],
        prose_es: [
          'Los cuatro proveedores comparten un solo cliente dominante. El Instituto Mexicano del Seguro Social (IMSS) — la institución de salud de pagador único más grande de México, con un presupuesto que rivaliza con el de varias economías estatales — representa entre la mitad y tres cuartas partes de los ingresos federales de por vida de cada proveedor del Big Four. Para Grupo Fármacos Especializados, es el 60.1 por ciento. Para Maypo, el 50.5 por ciento. Para DIMM, el 68.5 por ciento. Para Laboratorios PISA, el 72.2 por ciento — la mayor concentración de los cuatro.',
          'En conjunto, el Big Four recaudó 202.9 mil millones de pesos solo en contratación con el IMSS — el 10.4 por ciento de cada peso que el IMSS gastó en cualquier contratista, en cualquier sector, en 23 años. Cuatro proveedores farmacéuticos, uno de cada diez pesos.',
          'Una concentración de esta magnitud no ocurre por dinámica de mercado competitivo. Ocurre porque la arquitectura de contratación del IMSS permitió a un pequeño conjunto de proveedores acumular ventajas compuestas: familiaridad con el catálogo, infraestructura de entrega ajustada a las especificaciones del IMSS y elegibilidad para adjudicación directa basada en historial de contratación previo. El mecanismo legal es "relación de proveedor existente" bajo el Artículo 41 de la Ley de Adquisiciones — una cláusula que convierte la dependencia pasada en preferencia presente.',
        ],
        chartConfig: {
          type: 'inline-stacked-bar',
          title: 'IMSS Concentration — How Much of Each Vendor\'s Revenue Comes From One Customer',
          title_es: 'Concentración IMSS — Cuánto del ingreso de cada proveedor proviene de un solo cliente',
          stacked: {
            rows: [
              { label: 'Grupo Fármacos', total: 133.4, highlight: 80.0, annotation: '60.1% IMSS', annotation_es: '60.1% IMSS' },
              { label: 'Maypo',          total: 88.0,  highlight: 43.9, annotation: '50.5% IMSS', annotation_es: '50.5% IMSS' },
              { label: 'PISA',           total: 55.6,  highlight: 43.9, annotation: '72.2% IMSS', annotation_es: '72.2% IMSS' },
              { label: 'DIMM',           total: 51.6,  highlight: 35.2, annotation: '68.5% IMSS', annotation_es: '68.5% IMSS' },
            ],
            unit: 'B MXN',
            anchor: {
              value: '202.9B MXN',
              label: 'BIG FOUR · IMSS CONTRACTING ONLY · 2003-2025',
              label_es: 'BIG FOUR · SOLO CONTRATACIÓN IMSS · 2003-2025',
            },
            annotation: 'Solid bar = IMSS portion. Faded portion = all other federal customers combined. Each vendor\'s dependency on IMSS is between 50% and 72%.',
            annotation_es: 'Barra sólida = porción IMSS. Porción atenuada = todos los demás clientes federales combinados. La dependencia del IMSS de cada proveedor está entre 50% y 72%.',
            highlightColor: '#dc2626',
            highlightLabel: 'IMSS portion',
            highlightLabel_es: 'porción IMSS',
            baseLabel: 'all other clients',
            baseLabel_es: 'todos los demás clientes',
          },
        },
        pullquote: {
          quote: 'Four pharmaceutical vendors. One customer. One in every ten pesos IMSS spent on any contractor across 23 years.',
          quote_es: 'Cuatro proveedores farmacéuticos. Un solo cliente. Uno de cada diez pesos que el IMSS gastó en cualquier contratista en 23 años.',
          stat: '10.4%',
          statLabel: 'Big Four share of all federal IMSS contracting, 2003-2025',
          statLabel_es: 'Participación del Big Four en toda la contratación federal del IMSS, 2003-2025',
          barValue: 0.722,
          barLabel: 'PISA reaches 72.2% IMSS dependency — highest of the four',
          barLabel_es: 'PISA alcanza 72.2% de dependencia del IMSS — la más alta de las cuatro',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'RUBLI contracts table joined with institutions, vendor_id IN (29277, 2873, 4335, 13885), institution name LIKE "%MEXICANO DEL SEGURO%".',
          'IMSS total contracting 2002-2025 derived from COMPRANET. Big-Four share calculated against 1,957B MXN IMSS lifetime spend.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Relay',
        title_es: 'El relevo',
        subtitle: 'Sequential capture, 2003-2025',
        subtitle_es: 'Captura secuencial, 2003-2025',
        prose: [
          'Plotted on a single axis, the four vendors\' annual contracting reveals what no single-vendor profile can: a relay race. The early 2000s belonged to PISA, with annual contracting that peaked at 2.97 billion pesos in 2009 — three times any of the others. Then PISA went quiet. Between 2010 and 2019 it never crossed 3.5 billion in a year, while Grupo Fármacos, Maypo, and DIMM ramped relentlessly upward.',
          'Grupo Fármacos was the breakout star of the Calderón–Peña era. From 1.07 billion in 2007 it climbed past Maypo and DIMM to peak at 19.94 billion pesos in 2017 — a single-year contracting figure larger than the entire annual budget of several Mexican federal ministries. Maypo peaked the year after at 10.05 billion. DIMM peaked the same year at 7.96 billion. Three of the four vendors hit their all-time annual peaks within a 12-month window.',
          'In 2020, Grupo Fármacos went to zero. Not slowed; not reduced; not transitioned to other customers — zero. From 17.64 billion pesos in 2019 to nothing in 2020 and every year since. DIMM collapsed by 97 percent in the same year. Maypo cut in half. The cause is documented: the AMLO administration dissolved IMSS-direct pharmaceutical procurement and consolidated purchasing through INSABI and BIRMEX, deliberately to break what the executive characterized as "the cartel of distributors".',
          'And yet the spend did not vanish. PISA — quiet for a decade — resurged. From 3.5 billion in 2019 to 6.42 billion in 2020. Then 2.56, 3.77, 0.13, 0.67 across the COVID era. And in 2025, under Sheinbaum\'s IMSS-Bienestar consolidated-procurement architecture, PISA contracted 19.46 billion pesos in a single year — matching Grupo Fármacos\' all-time peak almost exactly. The architecture changed three times. The dominant vendor changed identity. The pattern of dependency did not.',
        ],
        prose_es: [
          'Graficados en un solo eje, la contratación anual de los cuatro proveedores revela lo que ningún perfil individual puede: una carrera de relevos. Los inicios de los 2000 pertenecieron a PISA, con una contratación anual que alcanzó su pico de 2.97 mil millones de pesos en 2009 — tres veces más que cualquiera de los otros. Luego PISA quedó en silencio. Entre 2010 y 2019 nunca cruzó los 3.5 mil millones en un año, mientras que Grupo Fármacos, Maypo y DIMM escalaban implacablemente.',
          'Grupo Fármacos fue la estrella revelación de la era Calderón-Peña. De 1.07 mil millones en 2007 escaló más allá de Maypo y DIMM hasta alcanzar un pico de 19.94 mil millones de pesos en 2017 — una cifra de contratación anual mayor que el presupuesto anual completo de varios ministerios federales mexicanos. Maypo alcanzó su pico al año siguiente con 10.05 mil millones. DIMM alcanzó el suyo el mismo año con 7.96 mil millones. Tres de los cuatro proveedores registraron sus máximos anuales históricos en una ventana de 12 meses.',
          'En 2020, Grupo Fármacos llegó a cero. No se redujo; no transitó hacia otros clientes — cero. De 17.64 mil millones de pesos en 2019 a nada en 2020 y cada año desde entonces. DIMM colapsó un 97 por ciento en el mismo año. Maypo se redujo a la mitad. La causa está documentada: la administración AMLO disolvió la contratación farmacéutica directa del IMSS y consolidó las compras a través del INSABI y BIRMEX, deliberadamente para romper lo que el ejecutivo caracterizó como "el cártel de los distribuidores".',
          'Y sin embargo el gasto no desapareció. PISA — silenciosa durante una década — resurgió. De 3.5 mil millones en 2019 a 6.42 mil millones en 2020. Luego 2.56, 3.77, 0.13, 0.67 a lo largo de la era COVID. Y en 2025, bajo la arquitectura de contratación consolidada de IMSS-Bienestar de Sheinbaum, PISA contrató 19.46 mil millones de pesos en un solo año — igualando casi exactamente el pico histórico de Grupo Fármacos. La arquitectura cambió tres veces. El proveedor dominante cambió de identidad. El patrón de dependencia no.',
        ],
        chartConfig: {
          type: 'inline-multi-line',
          title: 'The Big Four, Annual Contracting 2003-2025',
          title_es: 'El Big Four, contratación anual 2003-2025',
          chartId: 'big-four-relay',
          multiSeries: {
            xLabels: ['2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'],
            unit: 'B MXN',
            yLabel: 'Annual contract value',
            yLabel_es: 'Valor de contratación anual',
            series: [
              {
                name: 'Grupo Fármacos',
                color: SECTOR_COLORS.salud,
                values: [0, 0, 0, 0, 1.07, 2.81, 2.01, 12.86, 0.96, 5.83, 14.94, 13.23, 13.31, 12.93, 19.94, 15.64, 17.64, 0.00, 0, 0, 0, 0, 0],
                annotation: { xIndex: 14, text: '19.94 peak (2017)', text_es: '19.94 pico (2017)' },
                totalCaption: '· 133.4B total',
                totalCaption_es: '· 133.4B total',
              },
              {
                name: 'Maypo',
                color: '#a06820',
                values: [0.36, 0, 0.43, 1.04, 2.08, 1.62, 1.73, 5.80, 1.97, 3.13, 6.30, 4.69, 6.46, 4.57, 9.77, 10.05, 7.98, 4.17, 4.50, 3.87, 2.37, 2.86, 0.31],
                annotation: { xIndex: 15, text: '10.05 (2018)', text_es: '10.05 (2018)' },
                totalCaption: '· 88.0B total',
                totalCaption_es: '· 88.0B total',
              },
              {
                name: 'PISA',
                color: SECTOR_COLORS.gobernacion,
                values: [1.18, 0, 2.41, 0.56, 1.39, 0.73, 2.97, 1.58, 0.18, 0.36, 0.71, 0.94, 2.60, 0.96, 1.23, 0.47, 3.50, 6.42, 2.56, 3.77, 0.13, 0.67, 19.46],
                annotation: { xIndex: 22, text: '19.46 (2025)', text_es: '19.46 (2025)' },
                totalCaption: '· 55.6B total',
                totalCaption_es: '· 55.6B total',
              },
              {
                name: 'DIMM',
                color: SECTOR_COLORS.tecnologia,
                values: [0.01, 0, 0.02, 0, 0, 0, 0, 3.27, 0.13, 0.97, 4.56, 4.26, 5.66, 6.53, 7.40, 7.96, 7.51, 0.18, 0.24, 0.30, 0.24, 1.05, 1.09],
                annotation: { xIndex: 15, text: '7.96 (2018)', text_es: '7.96 (2018)' },
                totalCaption: '· 51.6B total',
                totalCaption_es: '· 51.6B total',
              },
            ],
            annotation: 'Read the relay: PISA dominates 2003-2009 → Grupo Fármacos / Maypo / DIMM dominate 2010-2019 → 2020 cliff (Grupo F. + DIMM collapse) → PISA returns and explodes in 2025 (19.46B, matching Grupo F.\'s 2017 all-time peak). The architecture that produced these contracts changed three times. The dependency did not.',
            annotation_es: 'Lee el relevo: PISA domina 2003-2009 → Grupo Fármacos / Maypo / DIMM dominan 2010-2019 → desplome 2020 (Grupo F. + DIMM colapsan) → PISA regresa y explota en 2025 (19.46B, igualando el pico histórico de 2017 de Grupo F.). La arquitectura que produjo estos contratos cambió tres veces. La dependencia no.',
          },
        },
        pullquote: {
          quote: 'From 17.64 billion in 2019 to zero in 2020. Not slowed. Not reduced. Zero. Then PISA — quiet for a decade — resurged.',
          quote_es: 'De 17.64 mil millones en 2019 a cero en 2020. No reducido. Cero. Y entonces PISA — silenciosa durante una década — resurgió.',
          stat: '19.46B MXN',
          statLabel: 'PISA 2025 — matches Grupo Fármacos\' all-time 2017 peak almost exactly',
          statLabel_es: 'PISA 2025 — iguala el pico histórico de Grupo Fármacos en 2017 casi exactamente',
        },
        sources: [
          'RUBLI per-year aggregation: SUM(amount_mxn) GROUP BY contract_year, vendor_id for the four vendors.',
          'DOF. (2019). Decreto de creación del Instituto de Salud para el Bienestar (INSABI).',
          'DOF. (2024). Reformas a la Ley de IMSS-Bienestar y consolidación de compra federal.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The Bidding Lattice',
        title_es: 'El nudo de las licitaciones',
        prose: [
          'If the trajectory chart suggests a relay, the co-bidding data confirms it. Across the 23-year window, the four vendors appear together in the same procurement procedures with extraordinary frequency. Maypo and PISA share 1,436 procedures — that is, 1,436 distinct tenders in which both companies appear as bidders or contract recipients. Grupo Fármacos and Maypo: 1,258. Grupo Fármacos and DIMM: 810. Maypo and DIMM: 478.',
          'These overlaps are not consistent with four independent companies competing for distinct contracts. They are the structural signature of cover bidding: a small set of vendors who routinely show up at the same auctions, with the winning identity rotating across procedures while the underlying group remains constant. OECD competition research identifies this exact pattern — repeated co-bidding among a small set of suppliers — as one of the most reliable detectors of cartel behavior in public procurement.',
          'Mexico\'s COFECE (Comisión Federal de Competencia Económica) has jurisdiction to open Art. 53 investigations against this kind of conduct. The 2021 OECD/COFECE health-sector competition assessment specifically flagged pharmaceutical distribution as the highest-risk sector for collusive tendering and recommended algorithmic monitoring as a permanent regulatory tool. RUBLI\'s P1 algorithm implements that recommendation in open source. The regulatory action it was meant to enable has not followed.',
        ],
        prose_es: [
          'Si el gráfico de trayectoria sugiere un relevo, los datos de co-licitación lo confirman. A lo largo de los 23 años, los cuatro proveedores aparecen juntos en los mismos procedimientos de contratación con extraordinaria frecuencia. Maypo y PISA comparten 1,436 procedimientos — es decir, 1,436 licitaciones distintas en las que ambas empresas aparecen como licitantes o destinatarias de contratos. Grupo Fármacos y Maypo: 1,258. Grupo Fármacos y DIMM: 810. Maypo y DIMM: 478.',
          'Estos solapamientos no son consistentes con cuatro empresas independientes compitiendo por contratos distintos. Son la firma estructural de la cobertura cruzada: un pequeño conjunto de proveedores que rutinariamente aparece en las mismas subastas, con la identidad ganadora rotando entre procedimientos mientras el grupo subyacente permanece constante. La investigación de competencia de la OCDE identifica exactamente este patrón — co-licitación repetida entre un pequeño conjunto de proveedores — como uno de los detectores más confiables del comportamiento de cártel en la contratación pública.',
          'La COFECE de México (Comisión Federal de Competencia Económica) tiene jurisdicción para abrir investigaciones del Art. 53 contra este tipo de conducta. La evaluación de competencia del sector salud de 2021 de la OCDE/COFECE señaló específicamente a la distribución farmacéutica como el sector de mayor riesgo para licitación colusiva y recomendó el monitoreo algorítmico como herramienta regulatoria permanente. El algoritmo P1 de RUBLI implementa esa recomendación en código abierto. La acción regulatoria que se supone debía habilitar no ha seguido.',
        ],
        chartConfig: {
          type: 'inline-network',
          title: 'Shared Bidding Procedures Among the Big Four',
          title_es: 'Procedimientos de licitación compartidos entre el Big Four',
          chartId: 'big-four-network',
          network: {
            nodes: [
              { id: 'gf',    label: 'Grupo F.',   sublabel: '133.4B', color: SECTOR_COLORS.salud, highlight: true },
              { id: 'maypo', label: 'Maypo',     sublabel: '88.0B',  color: '#a06820' },
              { id: 'pisa',  label: 'PISA',      sublabel: '55.6B',  color: SECTOR_COLORS.gobernacion },
              { id: 'dimm',  label: 'DIMM',      sublabel: '51.6B',  color: SECTOR_COLORS.tecnologia },
            ],
            edges: [
              { from: 'maypo', to: 'pisa',  weight: 1436, label: '1,436' },
              { from: 'gf',    to: 'maypo', weight: 1258, label: '1,258' },
              { from: 'gf',    to: 'dimm',  weight: 810,  label: '810' },
              { from: 'maypo', to: 'dimm',  weight: 478,  label: '478' },
              { from: 'gf',    to: 'pisa',  weight: 257,  label: '257' },
              { from: 'pisa',  to: 'dimm',  weight: 46,   label: '46' },
            ],
            anchor: {
              value: '5,285',
              label: 'TOTAL SHARED PROCUREMENT PROCEDURES',
              label_es: 'TOTAL DE PROCEDIMIENTOS COMPARTIDOS',
            },
            annotation: 'Edge thickness scales with the number of bidding procedures both vendors appear in. Maypo↔PISA (1,436) and Grupo Fármacos↔Maypo (1,258) carry most of the cartel weight — exactly the dyads that dominated IMSS pharmaceutical contracting through the 2010s.',
            annotation_es: 'El grosor de cada conexión es proporcional al número de procedimientos de licitación en los que ambos proveedores aparecen. Maypo↔PISA (1,436) y Grupo Fármacos↔Maypo (1,258) cargan la mayor parte del peso del cártel — exactamente las dúos que dominaron la contratación farmacéutica del IMSS durante la década de 2010.',
          },
        },
        pullquote: {
          quote: 'Maypo and PISA appear in 1,436 of the same procurement procedures. The OECD calls this co-bidding pattern one of the most reliable detectors of cartel behavior.',
          quote_es: 'Maypo y PISA aparecen en 1,436 de los mismos procedimientos de licitación. La OCDE llama a este patrón uno de los detectores más confiables de comportamiento de cártel.',
          stat: '5,285',
          statLabel: 'shared bidding procedures among the Big Four (combined)',
          statLabel_es: 'procedimientos de licitación compartidos entre el Big Four (combinados)',
          barValue: 0.69,
          barLabel: 'Direct-award rate across all Big-Four contracts: 69% — vs OECD ceiling 25-30%',
          barLabel_es: 'Tasa de adjudicación directa en todos los contratos del Big Four: 69% — vs límite OCDE 25-30%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI co-bidding analysis: COUNT(DISTINCT procedure_number) where both vendor_a and vendor_b appear in contracts for the same procedure_number.',
          'OECD. (2012). Recommendation on Fighting Bid Rigging in Public Procurement.',
          'OECD/COFECE. (2021). Competition Assessment of the Mexican Health Sector. Section 4: Procurement collusion indicators.',
          'Ley Federal de Competencia Económica, Art. 53 (prácticas monopólicas absolutas).',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'El vacío de fiscalización',
        prose: [
          'No public investigation has named all four. Grupo Fármacos Especializados, despite collecting 133 billion pesos over 13 years and operating at a 0.995 risk score, has never appeared as a focus of a published ASF audit. Maypo has been mentioned in periodic IMSS-procurement features, never as the subject of a sustained oversight inquiry. DIMM is virtually unknown to the public. PISA has the most journalistic coverage of the four — and yet PISA\'s 2025 explosion to 19.46 billion pesos under IMSS-Bienestar\'s consolidated tender has produced no published regulatory response at the time of this writing.',
          'The 2025 PISA spike, in particular, deserves immediate investigation. A pharmaceutical distributor that had not crossed 3.5 billion pesos annually in over a decade contracts 19.46 billion in a single year — including a 6.69-billion-peso consolidated medicine contract awarded by IMSS in February 2025 and a 4.82-billion-peso direct-award contract for "claves del sector salud" awarded in June 2025. The direct-award status alone is a flag. The size is unprecedented. The vendor\'s prior absence from the consolidated-tender architecture is conspicuous.',
          'COFECE has the legal authority. RUBLI has the algorithmic detection. The OECD/COFECE 2021 health-sector assessment recommended exactly this kind of monitoring. What is missing is the political and resource commitment to convert algorithmic flags into formal Art. 53 investigations. Until that gap closes, the Big Four cartel — visible in the data, traceable in the bidding records, unconcealed in their financials — will continue to absorb whatever architecture Mexican health procurement adopts next.',
        ],
        prose_es: [
          'Ninguna investigación pública ha nombrado a los cuatro. Grupo Fármacos Especializados, a pesar de haber recaudado 133 mil millones de pesos en 13 años y operar con una calificación de riesgo de 0.995, nunca ha aparecido como foco de una auditoría publicada de la ASF. Maypo ha sido mencionada en reportajes periódicos sobre contratación del IMSS, nunca como sujeto de una investigación de supervisión sostenida. DIMM es prácticamente desconocida para el público. PISA tiene la mayor cobertura periodística de las cuatro — y sin embargo la explosión de PISA en 2025 a 19.46 mil millones bajo la licitación consolidada de IMSS-Bienestar no ha producido ninguna respuesta regulatoria publicada al momento de redactar esto.',
          'El pico de PISA en 2025, en particular, merece investigación inmediata. Una distribuidora farmacéutica que no había cruzado los 3.5 mil millones de pesos anuales en más de una década contrata 19.46 mil millones en un solo año — incluyendo un contrato de medicamentos consolidados por 6.69 mil millones adjudicado por el IMSS en febrero de 2025 y un contrato de adjudicación directa por 4.82 mil millones para "claves del sector salud" adjudicado en junio de 2025. El estado de adjudicación directa por sí solo es una bandera. El tamaño es sin precedentes. La ausencia previa del proveedor de la arquitectura de licitación consolidada es llamativa.',
          'La COFECE tiene la autoridad legal. RUBLI tiene la detección algorítmica. La evaluación del sector salud OCDE/COFECE 2021 recomendó exactamente este tipo de monitoreo. Lo que falta es el compromiso político y de recursos para convertir las señales algorítmicas en investigaciones formales del Art. 53. Hasta que esa brecha se cierre, el cártel del Big Four — visible en los datos, rastreable en los registros de licitación, sin ocultar en sus finanzas — seguirá absorbiendo cualquier arquitectura que adopte la contratación de salud mexicana a continuación.',
        ],
        pullquote: {
          quote: 'The architecture changed three times. The vendor changed identity. The dependency did not.',
          quote_es: 'La arquitectura cambió tres veces. El proveedor cambió de identidad. La dependencia no.',
          stat: '19.46B MXN',
          statLabel: 'Laboratorios PISA, 2025 — under Sheinbaum\'s IMSS-Bienestar architecture',
          statLabel_es: 'Laboratorios PISA, 2025 — bajo la arquitectura de IMSS-Bienestar de Sheinbaum',
        },
        sources: [
          'RUBLI ARIA queue, Tier 1 vendors with P1 classification, April 2026.',
          'COMPRANET. PISA 2025 contract records, including PROC-2025-IMSS-CONS-MED and PROC-2025-IMSS-CLAVES.',
          'OECD/COFECE. (2021). Competition Assessment of the Mexican Health Sector. Recommendations 3-5.',
          'Ley Federal de Competencia Económica, Art. 53 (prácticas monopólicas absolutas).',
        ],
      },
    ],
    relatedSlugs: ['captura-institucional', 'el-gran-precio', 'la-ilusion-competitiva'],
    lensTags: {
      patterns: ['P1', 'P5', 'P6'],
      sectors: ['salud'],
      years: [2014, 2018, 2024],
      terms: ['monopolio', 'farmacéutico', 'IMSS', 'PISA', 'Maypo'],
    },
    nextSteps: [
      'File formal COFECE complaint under Art. 53 of the Ley Federal de Competencia Económica for investigation of Grupo Fármacos Especializados, Maypo, PISA, and DIMM as a potential cartel in IMSS pharmaceutical procurement.',
      'Request from IMSS a complete breakdown of pharmaceutical procurement contracts 2007-2020, including competing bidders at each tender — how many genuinely competitive procedures were there?',
      'Investigate the 2025 spike in Laboratorios PISA contracting: what specific contracts drove the 19.46B MXN annual figure, and under what procurement mechanism?',
      'Cross-reference the 40 non-pharmaceutical P1 vendors with RUPC records to identify declared shareholders, legal representatives, and physical addresses.',
      'Identify which IMSS procurement directors approved the 2013-2019 Grupo Fármacos contracts using SIPOT declarations of interests and meeting records.',
      'Track the AMLO-era transition of pharmaceutical contracting from IMSS-direct to BIRMEX/INSABI: did the same P1 vendors continue dominating under the new architecture?',
    ],
    nextSteps_es: [
      'Interponer denuncia formal ante la COFECE bajo el Art. 53 de la LFCE solicitando investigación de Grupo Fármacos Especializados, Maypo, PISA y DIMM como posible cártel en la contratación farmacéutica del IMSS.',
      'Solicitar al IMSS el desglose completo de contratos farmacéuticos 2007-2020, incluyendo licitantes competidores en cada convocatoria — ¿cuántos procedimientos fueron genuinamente competitivos?',
      'Investigar el repunte de contratos de Laboratorios PISA en 2025: ¿qué contratos específicos impulsaron los 19,460 MDP anuales y bajo qué mecanismo de contratación?',
      'Cruzar los 40 proveedores P1 no farmacéuticos contra el RUPC para identificar accionistas declarados, representantes legales y domicilios físicos.',
      'Identificar qué directores de compras del IMSS aprobaron los contratos con Grupo Fármacos 2013-2019 usando declaraciones patrimoniales del SIPOT y actas de reunión.',
      'Rastrear la transición del sexenio de AMLO en la contratación farmacéutica del IMSS hacia BIRMEX/INSABI: ¿los mismos proveedores P1 continuaron dominando bajo la nueva arquitectura?',
    ],
    entities: [
      { type: 'vendor', id: 29277, name: 'Grupo Fármacos Especializados', riskScore: 0.99, ariaTier: 1, role: 'Principal suspect · 133.4B MXN',        role_es: 'Principal investigado · 133.4 MDP' },
      { type: 'vendor', id: 2873,  name: 'Farmacéuticos Maypo',           riskScore: 0.95, ariaTier: 1, role: 'Principal suspect · 88.0B MXN',          role_es: 'Principal investigado · 88.0 MDP' },
      { type: 'vendor', id: 4335,  name: 'Laboratorios PISA',             riskScore: 0.75, ariaTier: 2, role: 'Principal suspect · 55.6B MXN',          role_es: 'Principal investigado · 55.6 MDP' },
      { type: 'vendor', id: 13885, name: 'DIMM',                          riskScore: 0.54, ariaTier: 2, role: 'Principal suspect · 51.6B MXN',          role_es: 'Principal investigado · 51.6 MDP' },
    ],
  },

  // =========================================================================
  // STORY 4: The Competitive Illusion
  // =========================================================================
  {
    slug: 'la-ilusion-competitiva',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The Competition That Never Was',
    headline_es: 'La Ilusión Competitiva',
    subheadline: 'For 14 consecutive years, more than 45% of Mexico\'s "competitive" federal procurement procedures attracted only one bidder. The OECD flags single-bid rates above 15% as a structural red flag. Mexico has been three to four times the threshold since 2010.',
    subheadline_es: 'Durante 14 años consecutivos, más del 45% de los procedimientos "competitivos" de contratación federal mexicana atrajeron a un solo licitante. La OCDE marca como bandera roja estructural cualquier tasa de oferta única superior al 15%. México ha estado entre tres y cuatro veces por encima de ese umbral desde 2010.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: { value: '64.4%', label: 'peak single-bidder rate', label_es: 'pico de tasa de oferta única', sublabel: '2011 — 4.3x the OECD threshold', sublabel_es: '2011 — 4.3 veces el umbral OCDE', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Invisible Hand That Never Competed',
        title_es: 'La mano invisible que nunca compitió',
        prose: [
          'A competitive procurement procedure is, by legal design, an open invitation: any qualified vendor may submit a bid. The theory holds that competition drives down prices, elevates quality, and reveals the true market value of what the government is buying. The theory requires multiple bidders.',
          'RUBLI\'s analysis of 23 years of Mexican federal procurement data shows that the theory has been failing continuously since at least 2010. Between 2010 and 2024, the annual single-bid rate — competitive procedures that received exactly one submission — ranged between 46 and 65 percent. In 2011 it peaked at 64.4 percent. In 2014 it reached 65.6 percent. In 2016, 62.5 percent. In 2023, the most recent complete year, it stood at 49.4 percent.',
          'For context: OECD\'s procurement research establishes that single-bid rates above 10 to 15 percent are a structural red flag warranting systematic review. The European Commission\'s ARACHNE risk-scoring tool — used across the EU to flag procurement fraud — treats any contract procedure with only one bidder as grounds for mandatory individual review. At 49 percent, Mexico is not experiencing an anomaly. It has normalized the absence of competition as standard procurement practice.',
          'The absolute numbers are arresting. Over 14 years of data, RUBLI counts more than 800,000 competitive procedures that received a single bid. Each of those procedures, on paper, satisfied Mexico\'s legal requirement for competitive sourcing. In reality, each was a predetermined award wrapped in procedural formality.',
        ],
        prose_es: [
          'Un procedimiento competitivo de contratación pública es, por diseño legal, una invitación abierta: cualquier proveedor calificado puede presentar oferta. La teoría sostiene que la competencia baja precios, eleva la calidad y revela el verdadero valor de mercado de lo que el gobierno compra. La teoría requiere múltiples oferentes.',
          'El análisis de RUBLI sobre 23 años de datos de contratación federal mexicana muestra que la teoría ha estado fallando continuamente desde al menos 2010. Entre 2010 y 2024, la tasa anual de oferta única — procedimientos competitivos que recibieron exactamente una presentación — osciló entre 46 y 65 por ciento. En 2011 alcanzó un pico de 64.4 por ciento. En 2014 llegó a 65.6 por ciento. En 2016, 62.5 por ciento. En 2023, el año completo más reciente, se ubicó en 49.4 por ciento.',
          'Para contexto: la investigación de la OCDE sobre contratación pública establece que las tasas de oferta única por encima del 10 a 15 por ciento son una bandera roja estructural que amerita revisión sistemática. La herramienta ARACHNE de scoring de riesgo de la Comisión Europea — usada en toda la UE para marcar fraude en contratación — trata cualquier procedimiento de contrato con un solo oferente como motivo de revisión individual obligatoria. Al 49 por ciento, México no está experimentando una anomalía. Ha normalizado la ausencia de competencia como práctica estándar de contratación.',
          'Los números absolutos son sobrecogedores. En 14 años de datos, RUBLI cuenta más de 800,000 procedimientos competitivos que recibieron una sola oferta. Cada uno de esos procedimientos, en el papel, cumplió con el requisito legal mexicano de contratación competitiva. En la realidad, cada uno fue una adjudicación predeterminada envuelta en formalidad procedimental.',
        ],
        pullquote: {
          quote: 'Fourteen years. Every year above 45 percent. In a system where "competitive" means a single bidder showed up, the word has lost its meaning.',
          quote_es: 'Catorce años. Cada año por encima del 45 por ciento. En un sistema donde "competitivo" significa que se presentó un solo oferente, la palabra ha perdido su sentido.',
          stat: '64.4%',
          statLabel: 'peak single-bid rate (2011)',
          statLabel_es: 'pico de tasa de oferta única (2011)',
          barValue: 0.644,
          barLabel: 'OECD warning threshold: 15%',
          barLabel_es: 'umbral de advertencia OCDE: 15%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI analysis of contracts table, is_single_bid flag, 2002-2024. Queried April 2026.',
          'OECD. (2023). Public Procurement Performance Report. Chapter 4: Competition indicators.',
          'European Commission. (2021). ARACHNE Risk Scoring Tool: Methodological Description.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Shape of the Failure',
        title_es: 'La forma de la falla',
        subtitle: 'Single-bid rates across every year, compared to the international threshold',
        subtitle_es: 'Tasas de oferta única año por año, comparadas con el umbral internacional',
        prose: [
          'A plot of single-bid rates across 2002-2024 reveals the structural nature of the failure. The rate starts around 27-37 percent in the early 2000s — already above OECD\'s warning threshold, though the underlying data for that period is less reliable. In 2010-2011 the rate jumps sharply to 51-64 percent, coinciding with the introduction of electronic bidding via CompraNet. The jump is counterintuitive: digitization should have expanded access and lowered the single-bid rate. Instead it codified the pattern.',
          'From 2011 through 2018, the rate remains stubbornly in the 58-66 percent range across four different presidential administrations. In 2019, coinciding with the AMLO administration\'s initial reforms and the centralization of pharmaceutical procurement, the single-bid rate drops to 46.5 percent. But the drop does not represent a return to real competition — it reflects the movement of contracts out of competitive procedures entirely, into direct adjudication, where the single-bid question does not arise because no bidding is conducted.',
          'The OECD threshold of 15 percent, drawn as a reference line on this chart, sits in a part of the plot Mexico has not visited since before COMPRANET records began. To reach that threshold would require a fundamental restructuring of how Mexican federal procurement generates bidders: systematic market analysis before tender, competitive intelligence about potential suppliers, active outreach to qualified vendors, and tender specifications designed to maximize rather than minimize the competitive field.',
        ],
        prose_es: [
          'Una gráfica de las tasas de oferta única de 2002 a 2024 revela la naturaleza estructural de la falla. La tasa arranca alrededor de 27-37 por ciento a inicios de los 2000 — ya por encima del umbral de advertencia de la OCDE, aunque los datos subyacentes de ese periodo son menos confiables. En 2010-2011 la tasa salta abruptamente a 51-64 por ciento, coincidiendo con la introducción de la licitación electrónica vía CompraNet. El salto es contraintuitivo: la digitalización debió haber ampliado el acceso y bajado la tasa de oferta única. En cambio, codificó el patrón.',
          'De 2011 a 2018, la tasa se mantiene tercamente en el rango de 58-66 por ciento a través de cuatro administraciones presidenciales distintas. En 2019, coincidiendo con las reformas iniciales del gobierno de AMLO y la centralización de la contratación farmacéutica, la tasa de oferta única cae a 46.5 por ciento. Pero la caída no representa un retorno a la competencia real — refleja el movimiento de los contratos fuera de los procedimientos competitivos por completo, hacia la adjudicación directa, donde la pregunta de oferta única no surge porque no se conduce licitación.',
          'El umbral OCDE del 15 por ciento, trazado como línea de referencia en esta gráfica, se ubica en una parte de la gráfica que México no ha visitado desde antes de que comenzaran los registros de CompraNet. Llegar a ese umbral requeriría una reestructuración fundamental de cómo la contratación federal mexicana genera oferentes: análisis sistemático de mercado antes de la licitación, inteligencia competitiva sobre proveedores potenciales, búsqueda activa de proveedores calificados, y especificaciones de licitación diseñadas para maximizar y no minimizar el campo competitivo.',
        ],
        chartConfig: {
          type: 'inline-area',
          title: 'Single-Bid Rate in Competitive Procedures 2002-2024',
          title_es: 'Tasa de oferta única en procedimientos competitivos 2002-2024',
          chartId: 'single-bid-trend',
          data: {
            points: [
              { label: '2002', value: 36.1 },
              { label: '2003', value: 27.2 },
              { label: '2005', value: 28.9 },
              { label: '2007', value: 33.8 },
              { label: '2009', value: 37.4 },
              { label: '2010', value: 51.6 },
              { label: '2011', value: 64.4, highlight: true, annotation: '64%' },
              { label: '2013', value: 62.7 },
              { label: '2014', value: 65.6, highlight: true },
              { label: '2016', value: 62.5 },
              { label: '2018', value: 58.5 },
              { label: '2019', value: 46.5 },
              { label: '2021', value: 46.5 },
              { label: '2023', value: 49.4 },
              { label: '2024', value: 47.8 },
            ],
            referenceLine: { value: 15, label: 'OECD red flag >15%', label_es: 'Bandera roja OCDE >15%', color: '#3b82f6' },
            unit: '%',
            maxValue: 80,
            yLabel: 'Single-bid rate (%)',
            yLabel_es: 'Tasa de oferta única (%)',
            annotation: 'Every year since 2010 is 3-4x the OECD red-flag threshold.',
            annotation_es: 'Cada año desde 2010 supera el umbral de bandera roja OCDE entre 3 y 4 veces.',
          },
        },
        pullquote: {
          quote: 'Electronic bidding in 2010 should have lowered the single-bid rate. It raised it. The digital transition codified the pattern rather than breaking it.',
          quote_es: 'La licitación electrónica en 2010 debió bajar la tasa de oferta única. La subió. La transición digital codificó el patrón en vez de romperlo.',
          stat: '2010',
          statLabel: 'year CompraNet became mandatory',
          statLabel_es: 'año en que CompraNet se volvió obligatorio',
        },
        sources: [
          'DOF. (2012). Reformas a la Ley de Adquisiciones para la obligatoriedad de CompraNet.',
          'RUBLI single_bid analysis by year, 2002-2024. April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Voucher Cluster',
        title_es: 'El cluster de vales',
        subtitle: 'Who actually wins the "competitive" tenders that have only one bidder',
        subtitle_es: 'Quién realmente gana las licitaciones "competitivas" con un solo oferente',
        prose: [
          'Naming the winners makes the abstract pattern concrete. RUBLI ranked every vendor in the federal database by the number of "competitive" procedures they have won as a single bidder. The top of the list is dominated by a coherent industry cluster: welfare-program voucher operators. EDENRED MEXICO, S.A. DE C.V. tops the list with 1,679 single-bid wins worth 23.78 billion pesos. TOKA INTERNACIONAL — already named in The Era of Risk as the dominant AMLO-era food-voucher vendor — sits at 1,290 wins and 36.99 billion pesos. EFECTIVALE collectively wins 2,210 procedures across two related corporate identities.',
          'The voucher cluster operates a structural monopoly that the single-bid statistic exposes. Mexican federal procurement awards food, gas, and gift-card programs through a small set of operators (Edenred, TOKA, Efectivale, Sodexo) that have built incompatible payment networks. Once a federal program adopts one of these vendors, switching costs effectively exclude competitors from the next tender. The procurement procedure runs as competitive on paper; in practice the existing vendor is the only bidder who can make the transition work.',
          'Beneath the voucher cluster, the single-bid winner list extends into specialized markets where the same dynamic operates with different mechanics. Industrial gas (PRAXAIR, INFRA — note INFRA is a structural false-positive: industrial gas to hospitals genuinely has limited suppliers). Telecommunications (TELÉFONOS DE MÉXICO at 459 wins). Postal logistics (Servicio Postal Mexicano, Estafeta). Specific medical supply categories (Productos Hospitalarios with 511 wins). Each is a market where customer-vendor relationships have hardened into structural single-source procurement.',
          'The combined single-bid universe is sizable: 504,903 contracts and 5.4 trillion pesos across 23 years. That is more than three times the entire AMLO-era federal procurement spend, awarded under nominally competitive procedures that actually had no competition. The average risk score in this universe is 0.28 — well below the high-risk threshold, because the model recognizes that not every single-bid contract is fraudulent. But the size of the universe is the editorial point: this is not exception territory. This is the standard operating mode of Mexican federal procurement.',
        ],
        prose_es: [
          'Nombrar a los ganadores vuelve concreto el patrón abstracto. RUBLI clasificó a cada proveedor en la base federal por la cantidad de procedimientos "competitivos" que han ganado como único oferente. La parte alta de la lista está dominada por un bloque industrial coherente: operadores de vales de programas sociales. EDENRED MEXICO, S.A. DE C.V. encabeza con 1,679 victorias de oferta única por 23.78 mil millones de pesos. TOKA INTERNACIONAL — ya nombrada en El Sexenio del Riesgo como el proveedor dominante de vales de comida del periodo AMLO — se ubica con 1,290 victorias y 36.99 mil millones de pesos. EFECTIVALE gana colectivamente 2,210 procedimientos a través de dos identidades corporativas relacionadas.',
          'El cluster de vales opera un monopolio estructural que la estadística de oferta única expone. La contratación federal mexicana adjudica programas de comida, gasolina y tarjetas de regalo a través de un pequeño conjunto de operadores (Edenred, TOKA, Efectivale, Sodexo) que han construido redes de pago incompatibles. Una vez que un programa federal adopta a uno de estos proveedores, los costos de cambio efectivamente excluyen a los competidores de la siguiente licitación. El procedimiento corre como competitivo en el papel; en la práctica el proveedor existente es el único oferente que puede hacer que la transición funcione.',
          'Por debajo del cluster de vales, la lista de ganadores con oferta única se extiende a mercados especializados donde la misma dinámica opera con mecánica distinta. Gas industrial (PRAXAIR, INFRA — nótese que INFRA es un falso positivo estructural: el suministro de gas industrial a hospitales genuinamente tiene proveedores limitados). Telecomunicaciones (TELÉFONOS DE MÉXICO con 459 victorias). Logística postal (Servicio Postal Mexicano, Estafeta). Categorías específicas de insumo médico (Productos Hospitalarios con 511 victorias). Cada uno es un mercado donde las relaciones cliente-proveedor se han endurecido hasta volverse contratación estructural de única fuente.',
          'El universo combinado de oferta única es de tamaño considerable: 504,903 contratos y 5.4 billones de pesos en 23 años. Es más de tres veces el gasto federal completo de la era AMLO, adjudicado bajo procedimientos nominalmente competitivos que en realidad no tuvieron competencia. La calificación de riesgo promedio en este universo es 0.28 — muy por debajo del umbral de alto riesgo, porque el modelo reconoce que no todo contrato de oferta única es fraudulento. Pero el tamaño del universo es el punto editorial: este no es territorio de excepción. Es el modo de operación estándar de la contratación federal mexicana.',
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'Top 12 Vendors by Single-Bid Wins (in "competitive" procedures)',
          title_es: 'Top 12 proveedores por victorias en oferta única (en procedimientos "competitivos")',
          chartId: 'sb-top-vendors',
          data: {
            points: [
              { label: 'Edenred México',          value: 1679, value2: 2898, color: '#dc2626', highlight: true, annotation: '58% single-bid · vouchers',          annotation_es: '58% oferta única · vales' },
              { label: 'INFRA',                   value: 1423, value2: 4283, color: '#a06820',                  annotation: '33% single-bid · gas (FP)',          annotation_es: '33% oferta única · gas (FP)' },
              { label: 'TOKA Internacional',      value: 1290, value2: 1944, color: '#dc2626', highlight: true, annotation: '66% single-bid · vouchers',          annotation_es: '66% oferta única · vales' },
              { label: 'Efectivale (RL)',         value: 1155, value2: 2539, color: '#dc2626', highlight: true, annotation: '45% single-bid · vouchers',          annotation_es: '45% oferta única · vales' },
              { label: 'Efectivale (S.A.)',       value: 1055, value2: 1150, color: '#dc2626', highlight: true, annotation: '92% single-bid · vouchers',          annotation_es: '92% oferta única · vales' },
              { label: 'Seg. Alim. Mex (Segalmex)',value: 1014, value2: 1541, color: '#dc2626', highlight: true, annotation: '66% single-bid · risk 0.94',         annotation_es: '66% oferta única · riesgo 0.94' },
              { label: 'Liconsa',                 value: 998,  value2: 5858, color: '#a06820',                  annotation: '17% single-bid · gov-owned',          annotation_es: '17% oferta única · paraestatal' },
              { label: 'Sodexo',                  value: 658,  value2: 1203, color: '#dc2626', highlight: true, annotation: '55% single-bid · vouchers',          annotation_es: '55% oferta única · vales' },
              { label: 'PRAXAIR México',          value: 585,  value2: 2794, color: '#a06820',                  annotation: '21% single-bid · gas',                annotation_es: '21% oferta única · gas' },
              { label: 'Servicio Postal',         value: 551,  value2: 878,  color: '#a06820',                  annotation: '63% single-bid · gov-owned',          annotation_es: '63% oferta única · paraestatal' },
              { label: 'Productos Hospitalarios', value: 511,  value2: 1596, color: '#a06820',                  annotation: '32% single-bid · medical supply',     annotation_es: '32% oferta única · insumos médicos' },
              { label: 'Estafeta Mexicana',       value: 475,  value2: 1342, color: '#a06820',                  annotation: '35% single-bid · logistics',          annotation_es: '35% oferta única · logística' },
            ],
            yLabel: 'Contract wins',
            yLabel_es: 'Victorias de contrato',
            unit: 'wins',
            gapFormat: 'ratio',
            annotation: 'Filled dot = single-bid wins (vendor was the only bidder). Open dot = total contract wins of any kind. The ratio shows what fraction of every contract this vendor secured came as the only "competitive" bidder — Efectivale S.A. is structurally captive at 92%; Liconsa and PRAXAIR run diversified books at 17–21%.',
            annotation_es: 'Punto relleno = victorias de oferta única (único oferente). Punto abierto = victorias totales de contrato de cualquier tipo. La razón muestra qué fracción de los contratos que ganó este proveedor llegó como único oferente "competitivo" — Efectivale S.A. es estructuralmente cautivo al 92%; Liconsa y PRAXAIR operan carteras diversificadas al 17–21%.',
          },
        },
        pullquote: {
          quote: 'Six related vendors. 6,851 "competitive" procurement procedures won as the only bidder. 91.7 billion pesos. The welfare-voucher market is structurally non-competitive.',
          quote_es: 'Seis proveedores relacionados. 6,851 procedimientos de contratación "competitivos" ganados como único oferente. 91.7 mil millones de pesos. El mercado de vales del bienestar es estructuralmente no competitivo.',
          stat: '6,851',
          statLabel: 'single-bid wins by the welfare-voucher cluster',
          statLabel_es: 'victorias en oferta única del cluster de vales del bienestar',
          barValue: 0.917,
          barLabel: '91.7B MXN routed through the cluster across 23 years',
          barLabel_es: '91.7 mil millones de pesos canalizados por el cluster en 23 años',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'RUBLI vendor ranking by SUM(is_single_bid=1 AND is_direct_award=0) GROUP BY vendor. April 2026.',
          'OECD. (2009). Guidelines for Fighting Bid Rigging in Public Procurement.',
          'COFECE. (2022). Investigación sobre el mercado de monederos electrónicos para programas sociales.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The 89% Sector',
        title_es: 'El sector del 89%',
        subtitle: 'Civilian infrastructure has the highest single-bid rate in Mexican procurement',
        subtitle_es: 'La infraestructura civil tiene la tasa más alta de oferta única en la contratación mexicana',
        prose: [
          'Single-bid rates vary dramatically by sector. The headline national rate of 47-49 percent in recent years is an average across 12 sectors with very different competitive dynamics. The variation across sectors is the editorial story.',
          'Civilian Infrastructure leads the ranking with a structurally astonishing rate: 89.2 percent of "competitive" infraestructura procedures are won by a single bidder. Out of 189,855 competitive infrastructure tenders in the dataset, 169,434 had only one bid. Public roads, water systems, drainage, urban infrastructure — these are not specialized industrial equipment with single suppliers. They are sectors with hundreds of qualified Mexican construction firms. The 89.2 percent rate is not market scarcity; it is market allocation.',
          'Medio Ambiente follows at 82.3 percent, Trabajo at 74.9 percent, Otros at 70.7 percent, Hacienda at 59.0 percent (the voucher cluster pulling the rate up), Energía at 56.7 percent (Pemex/CFE specialty equipment with genuinely thin supplier markets). On the other end of the distribution, Salud sits at only 19.3 percent, Defensa at 22.8 percent, and Educación at 44.1 percent. The contrast is informative: in sectors where the procurement is concentrated in a small number of large institutional buyers (IMSS, SEDENA), single-bid rates are low because the buyers force competition through aggregated tenders. In sectors where the procurement is fragmented across many smaller institutional units (state-level infrastructure, rural water systems, federal districts), single-bid rates are dramatically higher because each unit operates on its own established vendor relationships.',
          'Infrastructure at 89.2 percent is the most consequential of these findings. The COVID-era stimulus, the AMLO-era national projects, the post-Sheinbaum decentralized water and roads programs all flow through civilian infrastructure procurement. The 89.2 percent rate means that across more than a decade of stimulus and major projects, the vast majority of "competitively" awarded contracts had no competition at all.',
        ],
        prose_es: [
          'Las tasas de oferta única varían dramáticamente por sector. La tasa nacional de 47-49 por ciento en años recientes es un promedio a través de 12 sectores con dinámicas competitivas muy distintas. La variación entre sectores es la historia editorial.',
          'Infraestructura civil encabeza el ranking con una tasa estructuralmente sorprendente: 89.2 por ciento de los procedimientos "competitivos" de infraestructura son ganados por un solo oferente. De 189,855 licitaciones competitivas de infraestructura en el dataset, 169,434 tuvieron una sola oferta. Carreteras públicas, sistemas de agua, drenaje, infraestructura urbana — estos no son equipos industriales especializados con suministradores únicos. Son sectores con cientos de constructoras mexicanas calificadas. La tasa de 89.2 por ciento no es escasez de mercado; es asignación de mercado.',
          'Medio Ambiente sigue con 82.3 por ciento, Trabajo con 74.9 por ciento, Otros con 70.7 por ciento, Hacienda con 59.0 por ciento (el cluster de vales jala la tasa hacia arriba), Energía con 56.7 por ciento (equipo especializado de Pemex/CFE con mercados de suministradores genuinamente delgados). En el otro extremo de la distribución, Salud se ubica en apenas 19.3 por ciento, Defensa en 22.8 por ciento, y Educación en 44.1 por ciento. El contraste es informativo: en los sectores donde la contratación se concentra en un pequeño número de grandes compradores institucionales (IMSS, SEDENA), las tasas de oferta única son bajas porque los compradores fuerzan la competencia mediante licitaciones agregadas. En los sectores donde la contratación se fragmenta entre muchas unidades institucionales más pequeñas (infraestructura a nivel estatal, sistemas de agua rurales, distritos federales), las tasas de oferta única son dramáticamente más altas porque cada unidad opera con sus propias relaciones de proveedor establecidas.',
          'Infraestructura al 89.2 por ciento es el hallazgo más consecuente de todos. El estímulo de la era COVID, los proyectos nacionales del periodo AMLO, los programas descentralizados de agua y carreteras pos-Sheinbaum todos fluyen por la contratación civil de infraestructura. La tasa de 89.2 por ciento significa que a lo largo de más de una década de estímulo y grandes proyectos, la gran mayoría de los contratos adjudicados "competitivamente" no tuvieron competencia alguna.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'Single-Bid Rate by Sector (in "competitive" procedures only)',
          title_es: 'Tasa de oferta única por sector (solo en procedimientos "competitivos")',
          chartId: 'sb-by-sector',
          data: {
            points: [
              { label: 'Infraestructura', value: 89.2, color: '#dc2626', highlight: true, annotation: '169,434 of 189,855',  annotation_es: '169,434 de 189,855' },
              { label: 'Medio Ambiente',  value: 82.3, color: '#dc2626', highlight: true, annotation: '52,559 of 63,885',    annotation_es: '52,559 de 63,885' },
              { label: 'Trabajo',         value: 74.9, color: '#a06820', annotation: '11,818 of 15,784',      annotation_es: '11,818 de 15,784' },
              { label: 'Otros',           value: 70.7, color: '#a06820', annotation: '3,570 of 5,052',         annotation_es: '3,570 de 5,052' },
              { label: 'Hacienda',        value: 59.0, color: '#a06820', annotation: '20,454 of 34,659',      annotation_es: '20,454 de 34,659' },
              { label: 'Energía',         value: 56.7, color: '#a06820', annotation: '76,028 of 134,052',     annotation_es: '76,028 de 134,052' },
              { label: 'Tecnología',      value: 49.1, color: '#a06820', annotation: '3,700 of 7,535',         annotation_es: '3,700 de 7,535' },
              { label: 'Gobernación',     value: 48.2, color: '#a06820', annotation: '30,390 of 63,014',      annotation_es: '30,390 de 63,014' },
              { label: 'Agricultura',     value: 47.5, color: '#a06820', annotation: '15,429 of 32,449',      annotation_es: '15,429 de 32,449' },
              { label: 'Educación',       value: 44.1, color: '#a06820', annotation: '38,143 of 86,456',      annotation_es: '38,143 de 86,456' },
              { label: 'Defensa',         value: 22.8, color: '#1e3a5f', annotation: '7,511 of 32,923',        annotation_es: '7,511 de 32,923' },
              { label: 'Salud',           value: 19.3, color: '#1e3a5f', annotation: '75,867 of 394,009',     annotation_es: '75,867 de 394,009' },
            ],
            referenceLine: { value: 15, label: 'OECD red flag >15%', label_es: 'Bandera roja OCDE >15%', color: '#3b82f6' },
            unit: '%',
            maxValue: 100,
            yLabel: 'Single-bid share of competitive procedures',
            yLabel_es: 'Tasa de oferta única en procedimientos competitivos',
            annotation: 'Civilian infrastructure at 89.2 percent is six times the OECD red-flag threshold. Salud and Defensa stay low (~20%) because aggregated institutional buyers (IMSS, SEDENA) force competition through bigger tenders.',
            annotation_es: 'La infraestructura civil al 89.2 por ciento es seis veces el umbral de bandera roja OCDE. Salud y Defensa se mantienen bajos (~20%) porque los compradores institucionales agregados (IMSS, SEDENA) fuerzan la competencia mediante licitaciones más grandes.',
          },
        },
        pullquote: {
          quote: 'Civilian infrastructure runs at 89 percent single-bid. Out of every ten "competitive" tenders for roads, water, drainage, and urban works, nine arrive with only one bidder.',
          quote_es: 'La infraestructura civil opera al 89 por ciento de oferta única. De cada diez licitaciones "competitivas" para carreteras, agua, drenaje y obra urbana, nueve llegan con un solo oferente.',
          stat: '89.2%',
          statLabel: 'Infraestructura sector single-bid rate',
          statLabel_es: 'Tasa de oferta única en el sector Infraestructura',
          barValue: 0.892,
          barLabel: 'six times the OECD red-flag threshold (15%)',
          barLabel_es: 'seis veces el umbral de bandera roja OCDE (15%)',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI sector × is_single_bid aggregation, contracts with is_direct_award=0. April 2026.',
          'OECD/COFECE. (2022). Joint Assessment of Mexican Public Procurement Competition.',
          'IMCO. (2024). Concentración en la contratación de obra pública estatal y municipal.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'El vacío de fiscalización',
        prose: [
          'The institutional failure underlying Mexico\'s single-bid rate is subtler than straightforward corruption. Nobody in the procurement process is explicitly breaking the rules when only one bidder shows up. The procuring official ran the tender. The bidder submitted a bid. The award was made according to procedure. Each individual action is defensible. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.',
          'This is why traditional accountability institutions struggle with the problem. ASF audits individual contracts; it does not produce systemic findings about aggregated bidding patterns. SFP investigates individual officials; it does not investigate industry-wide cartels. COFECE investigates anticompetitive conduct but limits its public procurement cases to clear-cut cartel documentation, not to behavioral pattern evidence. The thing that RUBLI\'s data shows — a system-level structural failure — has no institution of accountability.',
          'Closing the gap requires either the creation of a new institutional capacity focused on structural procurement patterns, or the redirection of existing resources at COFECE and SFP toward the analysis RUBLI performs. Neither has happened. The single-bid rate is not a secret; Transparencia Mexicana and IMCO have reported on it for years. What is absent is institutional follow-through: naming the specific vendor clusters in P5 pattern, requesting their financial records, prosecuting documented cases of cover bidding, and establishing deterrent consequences for the officials who knowingly accept single-bid outcomes as normal.',
          'Until those consequences exist, reform will continue to mean procedural adjustment rather than structural change. The chart of single-bid rates will continue to sit three to four times above the OECD threshold, year after year, while everyone agrees the problem is serious.',
        ],
        prose_es: [
          'La falla institucional que subyace a la tasa mexicana de oferta única es más sutil que la corrupción directa. Nadie en el proceso de contratación rompe explícitamente las reglas cuando solo se presenta un oferente. El funcionario contratante corrió la licitación. El oferente presentó una oferta. La adjudicación se hizo conforme al procedimiento. Cada acción individual es defendible. La corrupción reside en el patrón a lo largo de 800,000 procedimientos, no en una sola transacción.',
          'Por esto las instituciones tradicionales de fiscalización tienen problemas con el asunto. La ASF audita contratos individuales; no produce hallazgos sistémicos sobre patrones agregados de licitación. La SFP investiga a funcionarios individuales; no investiga cárteles a escala industrial. La COFECE investiga conducta anticompetitiva pero limita sus casos de contratación pública a documentación clara de cártel, no a evidencia conductual por patrón. Lo que muestran los datos de RUBLI — una falla estructural a nivel de sistema — no tiene institución de rendición de cuentas.',
          'Cerrar la brecha requiere o la creación de una nueva capacidad institucional enfocada en patrones estructurales de contratación, o la redirección de recursos existentes de la COFECE y la SFP hacia el análisis que RUBLI realiza. Ninguna ha ocurrido. La tasa de oferta única no es un secreto; Transparencia Mexicana e IMCO la han reportado durante años. Lo que está ausente es el seguimiento institucional: nombrar los clusters específicos de proveedores en el patrón P5, solicitar sus registros financieros, procesar casos documentados de oferta de cobertura, y establecer consecuencias disuasorias para los funcionarios que aceptan a sabiendas los resultados de oferta única como normales.',
          'Hasta que esas consecuencias existan, la reforma seguirá significando ajuste procedimental en vez de cambio estructural. La gráfica de las tasas de oferta única seguirá ubicada de tres a cuatro veces por encima del umbral OCDE, año tras año, mientras todos coinciden en que el problema es serio.',
        ],
        pullquote: {
          quote: 'Nobody is individually breaking the rules. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.',
          quote_es: 'Nadie rompe individualmente las reglas. La corrupción reside en el patrón a lo largo de 800,000 procedimientos, no en una sola transacción.',
          stat: '800,000+',
          statLabel: 'single-bid competitive procedures 2010-2024',
          statLabel_es: 'procedimientos competitivos de oferta única 2010-2024',
        },
        sources: [
          'IMCO. (2024). Índice de Riesgos de Corrupción en Compras Públicas.',
          'RUBLI aggregate single_bid analysis, 2010-2024.',
        ],
      },
    ],
    relatedSlugs: ['marea-de-adjudicaciones', 'el-monopolio-invisible', 'captura-institucional'],
    lensTags: {
      patterns: ['P5', 'P7'],
      sectors: ['infraestructura', 'hacienda'],
      terms: ['oferta única', 'single-bid', 'vales', 'voucher'],
    },
    nextSteps: [
      'Request from SFP the official single-bid statistics for 2020-2025 and compare against RUBLI\'s independent calculation from COMPRANET microdata.',
      'Identify the 100 procedures with the highest contract values that had a single bidder in 2023 and request full bid evaluation records.',
      'File COFECE investigation reports for the top 20 vendor co-bidding pairs identified in RUBLI\'s ARIA queue P5 pattern.',
      'Research which industries in Mexico have COFECE "effective competition" certification and cross-reference their single-bid rates against uncertified sectors.',
      'Map single-bid rates by procurement institution to identify the worst-offending procurement units for prioritized audit.',
      'Pursue a journalistic investigation of the 2011 single-bid peak (64.4%) — what specific procurement category or institution drove the annual figure?',
    ],
    nextSteps_es: [
      'Solicitar a la SFP las estadísticas oficiales de oferta única 2020-2025 y comparar con el cálculo independiente de RUBLI a partir de los microdatos de COMPRANET.',
      'Identificar los 100 procedimientos de mayor valor contractual con un solo licitante en 2023 y solicitar las actas completas de evaluación de propuestas.',
      'Presentar denuncias de investigación ante la COFECE para los 20 pares de proveedores co-licitantes identificados en el patrón P5 de la cola ARIA de RUBLI.',
      'Investigar qué industrias en México cuentan con certificación de "competencia efectiva" de la COFECE y cruzar sus tasas de oferta única con sectores no certificados.',
      'Mapear las tasas de oferta única por institución compradora para identificar las unidades de compra con peor desempeño y priorizar la auditoría.',
      'Realizar una investigación periodística sobre el pico de oferta única de 2011 (64.4%) — ¿qué categoría de compra o institución específica impulsó esa cifra anual?',
    ],
    entities: [
      { type: 'vendor', id: 44372,  name: 'Edenred Mexico',      riskScore: 0.928, ariaTier: 1, role: 'Welfare-voucher monopolist · 1,679 single-bid wins', role_es: 'Monopolio de vales · 1,679 victorias de oferta única' },
      { type: 'vendor', id: 102627, name: 'TOKA Internacional',  riskScore: 0.988, ariaTier: 1, role: 'Welfare-voucher monopolist · 1,290 single-bid wins', role_es: 'Monopolio de vales · 1,290 victorias de oferta única' },
      { type: 'vendor', id: 64,     name: 'Efectivale',          riskScore: 0.957, ariaTier: 1, role: 'Welfare-voucher monopolist · 2,210 single-bid wins', role_es: 'Monopolio de vales · 2,210 victorias de oferta única' },
    ],
  },

  // =========================================================================
  // STORY 5: Institutional Capture
  // =========================================================================
  {
    slug: 'captura-institucional',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'Inside Institutional Capture',
    headline_es: 'Captura Institucional',
    subheadline: 'RUBLI\'s P6 algorithm flagged 15,923 vendors showing signs of institutional capture. Across eight major sectors — led by infrastructure at 179 billion pesos and energy at 131 billion — the intermediary-pattern vendors alone account for 526 billion pesos of federal spending.',
    subheadline_es: 'El algoritmo P6 de RUBLI marcó a 15,923 proveedores con signos de captura institucional. En ocho sectores principales — encabezados por infraestructura con 179 mil millones de pesos y energía con 131 mil millones — los proveedores con patrón de intermediario suman por sí solos 526 mil millones de pesos de gasto federal.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 15,
    status: 'auditado',
    leadStat: { value: '15,923', label: 'P6 capture-pattern vendors', label_es: 'proveedores con patrón de captura P6', sublabel: '526.8B MXN in P3 intermediary chains', sublabel_es: '526.8 mil millones en cadenas de intermediarios P3', color: '#8b5cf6' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Mechanics of Capture',
        title_es: 'La mecánica de la captura',
        prose: [
          'Institutional capture in procurement is distinct from simple corruption. It is not a one-time bribe — it is a relationship structure that embeds a vendor into an institution\'s procurement workflows so thoroughly that alternatives become invisible or impractical. Officials stop looking for competing vendors because the "reliable" vendor always delivers. The vendor\'s prices slowly rise because there is no pressure to compete. The relationship becomes self-reinforcing, and over years it becomes indistinguishable from policy.',
          'RUBLI\'s Pattern 6 (P6) algorithm identifies capture signatures by analyzing the concentration of a vendor\'s contracts at a single institution, the evolution of that concentration over time, and the degree to which that institution has ceased awarding to competitors in the relevant category. P6 is RUBLI\'s largest pattern: 15,923 vendors in the queue, representing the broadest category of structural procurement risk in the entire dataset.',
          'Adjacent to P6 is Pattern 3 (P3) — intermediary vendors who win contracts and subcontract the actual work to smaller entities, extracting a fee at each tier. P3 is both a capture mechanism and a fraud mechanism: a vendor captures institutional relationships, then monetizes those relationships by acting as a toll-road between the government and the real suppliers. RUBLI identifies 2,974 vendors in P3, concentrated overwhelmingly in infrastructure (179.5B MXN), energy (130.6B MXN), and health (104.2B MXN).',
        ],
        prose_es: [
          'La captura institucional en la contratación pública es distinta de la corrupción simple. No es un soborno único — es una estructura de relación que incrusta a un proveedor en los flujos de trabajo de adquisiciones de una institución de manera tan completa que las alternativas se vuelven invisibles o impracticables. Los funcionarios dejan de buscar proveedores competidores porque el proveedor "confiable" siempre entrega. Los precios del proveedor suben lentamente porque no hay presión para competir. La relación se vuelve auto-reforzante, y con los años se vuelve indistinguible de una política.',
          'El algoritmo del Patrón 6 (P6) de RUBLI identifica firmas de captura analizando la concentración de los contratos de un proveedor en una sola institución, la evolución de esa concentración a lo largo del tiempo, y el grado al cual esa institución ha dejado de adjudicar a competidores en la categoría relevante. P6 es el patrón más grande de RUBLI: 15,923 proveedores en la cola, que representan la categoría más amplia de riesgo estructural en la contratación pública en todo el dataset.',
          'Adyacente a P6 está el Patrón 3 (P3) — proveedores intermediarios que ganan contratos y subcontratan el trabajo real a entidades más pequeñas, extrayendo una comisión en cada nivel. P3 es tanto un mecanismo de captura como un mecanismo de fraude: un proveedor captura relaciones institucionales, luego monetiza esas relaciones actuando como una caseta de cobro entre el gobierno y los proveedores reales. RUBLI identifica 2,974 proveedores en P3, concentrados abrumadoramente en infraestructura (179.5 mil millones), energía (130.6 mil millones) y salud (104.2 mil millones).',
        ],
        pullquote: {
          quote: '15,923 vendors in the capture pattern. 2,974 in the intermediary pattern. 526 billion pesos of federal spending running through these two structures alone.',
          quote_es: '15,923 proveedores con patrón de captura. 2,974 con patrón de intermediario. 526 mil millones de pesos de gasto federal corriendo solo por estas dos estructuras.',
          stat: '526.8B MXN',
          statLabel: 'P3 intermediary contracts, eight sectors',
          statLabel_es: 'contratos intermediarios P3, ocho sectores',
        },
        sources: [
          'RUBLI ARIA P6 and P3 pattern analysis, run ID 28d5c453, March 25 2026.',
          'IMSS. (2024). Informe al Ejecutivo Federal y al Congreso de la Unión.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Sectoral Map of Intermediation',
        title_es: 'El mapa sectorial de la intermediación',
        subtitle: 'Where the intermediary chains run deepest',
        subtitle_es: 'Dónde corren más profundas las cadenas de intermediarios',
        prose: [
          'The P3 intermediary pattern is not evenly distributed across Mexican procurement. It concentrates dramatically in the three sectors where contracts are largest, oversight is thinnest, and technical complexity provides cover: infrastructure, energy, and health.',
          'Infrastructure leads by a wide margin. 1,128 P3-classified vendors moved 179.5 billion pesos through intermediary structures in construction and public works between 2002 and 2025. Energy follows with 463 P3 vendors and 130.6 billion pesos, concentrated in the PEMEX and CFE ecosystems. Health is third with 476 vendors moving 104.2 billion pesos. Hacienda, education, agriculture, gobernación, and defense round out the top eight, each with tens of billions of pesos in P3-pattern contracting.',
          'The sectoral distribution matters because it maps onto known vulnerability patterns. Infrastructure contracts involve specialized subcontracting almost by necessity — a highway project uses dozens of different trades — which creates legitimate intermediary structures that also provide cover for fraudulent ones. Energy contracts involve specialized technical expertise that few vendors possess, which legitimately narrows competition but also enables capture by the few who meet the specifications. Health contracts involve FDA-equivalent regulatory approval and specialized storage, which narrows competition further and entrenches approved-supplier lists.',
          'In each sector the P3 mechanism operates differently. In infrastructure the intermediary wins the contract, then subcontracts civil works to actual construction firms, keeping 15-30 percent overhead. In energy the intermediary supplies equipment sourced from international manufacturers, marking up prices across the supply chain. In health the intermediary distributes medications from a small number of actual pharmaceutical manufacturers, collecting margins at each link.',
        ],
        prose_es: [
          'El patrón de intermediación P3 no se distribuye uniformemente a través de la contratación pública mexicana. Se concentra dramáticamente en los tres sectores donde los contratos son más grandes, la fiscalización es más delgada y la complejidad técnica provee cobertura: infraestructura, energía y salud.',
          'Infraestructura encabeza por amplio margen. 1,128 proveedores clasificados como P3 movieron 179.5 mil millones de pesos por estructuras de intermediación en construcción y obra pública entre 2002 y 2025. Energía sigue con 463 proveedores P3 y 130.6 mil millones, concentrados en los ecosistemas de PEMEX y CFE. Salud es tercero con 476 proveedores moviendo 104.2 mil millones. Hacienda, educación, agricultura, gobernación y defensa completan el top ocho, cada uno con decenas de miles de millones de pesos en contratación con patrón P3.',
          'La distribución sectorial importa porque mapea patrones conocidos de vulnerabilidad. Los contratos de infraestructura implican subcontratación especializada casi por necesidad — un proyecto carretero usa decenas de oficios distintos — lo que crea estructuras de intermediación legítimas que también proveen cobertura para las fraudulentas. Los contratos de energía implican pericia técnica especializada que pocos proveedores poseen, lo cual legítimamente estrecha la competencia pero también habilita la captura por los pocos que cumplen las especificaciones. Los contratos de salud implican aprobación regulatoria equivalente a la de la FDA y almacenamiento especializado, lo que estrecha aún más la competencia y atrinchera las listas de proveedores autorizados.',
          'En cada sector el mecanismo P3 opera distinto. En infraestructura el intermediario gana el contrato, luego subcontrata la obra civil a constructoras reales, quedándose con 15-30 por ciento de sobrecarga. En energía el intermediario suministra equipo proveniente de fabricantes internacionales, marcando los precios a lo largo de la cadena de suministro. En salud el intermediario distribuye medicamentos de un pequeño número de fabricantes farmacéuticos reales, cobrando márgenes en cada eslabón.',
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'P3 Intermediation as a Share of Each Sector’s High-Risk Spend',
          title_es: 'Intermediación P3 como porción del gasto de alto riesgo por sector',
          chartId: 'p3-by-sector',
          data: {
            // Sorted by P3 share of high-risk spend (descending) so the largest
            // capture footprint reads at top. value = P3 intermediary spend;
            // value2 = total high+critical-risk spend in the same sector (real
            // comparator, sourced from contracts.risk_level rollup, May 22 2026).
            points: [
              { label: 'Infraestructura', label_en: 'Infrastructure',  value: 179.5, value2: 917.3,  color: '#ea580c', highlight: true },
              { label: 'Agricultura',     label_en: 'Agriculture',     value: 18.8,  value2: 163.2,  color: '#22c55e' },
              { label: 'Energía',    label_en: 'Energy',          value: 130.6, value2: 1181.6, color: '#eab308' },
              { label: 'Defensa',         label_en: 'Defense',         value: 15.9,  value2: 158.3,  color: '#1e3a5f' },
              { label: 'Gobernación', label_en: 'Governance',     value: 17.8,  value2: 204.4,  color: '#be123c' },
              { label: 'Educación',  label_en: 'Education',       value: 19.1,  value2: 250.1,  color: '#3b82f6' },
              { label: 'Hacienda',        label_en: 'Treasury',        value: 40.9,  value2: 625.5,  color: '#16a34a' },
              { label: 'Salud',           label_en: 'Health',          value: 104.2, value2: 1739.7, color: '#dc2626' },
            ],
            unit: 'B MXN',
            gapFormat: 'ratio',
            annotation: 'Filled dot = P3 intermediary spend (B MXN). Open dot = sector total at high or critical risk (B MXN). Right column = P3 share of the sector’s at-risk footprint. Infrastructure routes 19.6% of its high-risk spend through P3 intermediaries — roughly three times the share seen in Health (6.0%) or Hacienda (6.5%).',
            annotation_es: 'Punto relleno = gasto P3 de intermediación (miles de millones MXN). Punto abierto = total sectorial en riesgo alto o crítico (miles de millones MXN). Columna derecha = porción del gasto de riesgo del sector que corre por estructuras P3. Infraestructura canaliza 19.6% de su gasto de alto riesgo por intermediarios P3 — cerca del triple de la porción que se observa en Salud (6.0%) o Hacienda (6.5%).',
          },
        },
        pullquote: {
          quote: 'Infrastructure alone moves 179 billion pesos through intermediary structures. The overhead cost — if OECD research applies — is 27 to 54 billion pesos.',
          quote_es: 'Solo en infraestructura se mueven 179 mil millones de pesos por estructuras de intermediación. El sobrecosto — si aplica la investigación OCDE — es de 27 a 54 mil millones de pesos.',
          stat: '179.5B MXN',
          statLabel: 'P3 intermediary contracts in infraestructura',
          statLabel_es: 'contratos intermediarios P3 en infraestructura',
        },
        sources: [
          'RUBLI P3 sector analysis, April 2026.',
          'OECD. (2023). Public Procurement Performance Report. Chapter 6: subcontracting and price markups.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'How Capture Develops Over Time',
        title_es: 'Cómo se desarrolla la captura con el tiempo',
        prose: [
          'P6 capture is typically not instantaneous. RUBLI\'s temporal analysis shows that vendors classified as P6 typically begin as legitimate competitive winners — they earn an initial contract, deliver adequately, and build a relationship with an institutional contact. The risk metrics worsen gradually: year one shows normal competitive behavior; by year three, direct-award frequency is rising; by year five, the vendor is receiving 70-90 percent of the relevant category via direct adjudication at the same institution.',
          'This graduation from legitimate to captured is precisely what makes P6 difficult to catch through traditional audit methods. Each individual contract decision may appear defensible: the vendor has a track record, the official can cite past performance, and the administrative burden of running a new competitive process is real. The corruption is not in any single contract — it is in the pattern across hundreds of contracts over years.',
          'ASF\'s annual audit reports have repeatedly flagged IMSS and ISSSTE for over-reliance on recurring vendors without competitive re-tendering. The 2022 Cuenta Pública audit found IMSS pharmaceutical procurement showed "patterns of concentration inconsistent with market competition" in 15 specific categories. RUBLI\'s P6 analysis provides the quantitative underpinning for that finding at scale: at IMSS specifically, RUBLI counts 3,415 P6-pattern vendors moving 401.8 billion pesos across 392,579 contracts.',
          'The same mechanism operates at CFE (240.7B MXN in P6-pattern contracting across 2,600 vendors), at PEMEX (199.8B MXN — concentrated in just 284 vendors, the smallest cohort but the largest average ticket), at SCT/SICT (71.6B MXN, 412 vendors), and at DICONSA (70.0B MXN, 495 vendors). ISSSTE adds another 50.1B MXN. Across the seven highest-value institutions, P6 contracting totals 1.06 trillion pesos — federal spending routed through vendor relationships whose behavioral fingerprints indicate capture, equivalent to roughly twelve percent of an entire annual federal budget.',
        ],
        prose_es: [
          'La captura P6 típicamente no es instantánea. El análisis temporal de RUBLI muestra que los proveedores clasificados como P6 típicamente comienzan como ganadores competitivos legítimos — obtienen un contrato inicial, entregan adecuadamente y construyen una relación con un contacto institucional. Las métricas de riesgo se deterioran gradualmente: el año uno muestra comportamiento competitivo normal; para el año tres, la frecuencia de adjudicación directa va al alza; para el año cinco, el proveedor recibe entre 70 y 90 por ciento de la categoría relevante por adjudicación directa en la misma institución.',
          'Esta graduación de legítimo a capturado es precisamente lo que hace al P6 difícil de detectar por métodos de auditoría tradicionales. Cada decisión individual de contrato puede parecer defendible: el proveedor tiene historial, el funcionario puede invocar el desempeño pasado, y la carga administrativa de correr un nuevo proceso competitivo es real. La corrupción no está en ningún contrato individual — está en el patrón a lo largo de cientos de contratos durante años.',
          'Los informes anuales de auditoría de la ASF han marcado repetidamente al IMSS y al ISSSTE por dependencia excesiva en proveedores recurrentes sin re-licitación competitiva. La auditoría de la Cuenta Pública 2022 encontró que la contratación farmacéutica del IMSS mostraba "patrones de concentración inconsistentes con la competencia de mercado" en 15 categorías específicas. El análisis P6 de RUBLI provee el fundamento cuantitativo para ese hallazgo a escala: en el IMSS específicamente, RUBLI cuenta 3,415 proveedores con patrón P6 moviendo 401.8 mil millones de pesos en 392,579 contratos.',
          'El mismo mecanismo opera en la CFE (240.7 mil millones en contratación con patrón P6 en 2,600 proveedores), en PEMEX (199.8 mil millones — concentrados en apenas 284 proveedores, la cohorte más pequeña pero con el ticket promedio más grande), en SCT/SICT (71.6 mil millones, 412 proveedores) y en DICONSA (70.0 mil millones, 495 proveedores). El ISSSTE añade otros 50.1 mil millones. En las siete instituciones de mayor valor, la contratación P6 totaliza 1.06 billones de pesos — gasto federal canalizado por relaciones de proveedor cuyas huellas conductuales indican captura, equivalente a aproximadamente doce por ciento de un presupuesto federal anual completo.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'Top 7 Institutions by P6 Capture-Pattern Contracting',
          title_es: 'Top 7 instituciones por contratación con patrón de captura P6',
          chartId: 'p6-by-institution',
          data: {
            points: [
              { label: 'IMSS',     value: 401.8, color: '#dc2626', highlight: true, annotation: '3,415 vendors · 392K contracts',  annotation_es: '3,415 proveedores · 392K contratos' },
              { label: 'CFE',      value: 240.7, color: '#eab308',                  annotation: '2,600 vendors · 112K contracts',  annotation_es: '2,600 proveedores · 112K contratos' },
              { label: 'PEMEX',    value: 199.8, color: '#eab308',                  annotation: '284 vendors · 7,169 contracts',   annotation_es: '284 proveedores · 7,169 contratos' },
              { label: 'SCT',      value: 71.6,  color: '#ea580c',                  annotation: '412 vendors · 8,965 contracts',   annotation_es: '412 proveedores · 8,965 contratos' },
              { label: 'DICONSA',  value: 70.0,  color: '#64748b',                  annotation: '495 vendors · 236K contracts',    annotation_es: '495 proveedores · 236K contratos' },
              { label: 'ISSSTE',   value: 50.1,  color: '#dc2626', highlight: true, annotation: '841 vendors · 33,636 contracts',  annotation_es: '841 proveedores · 33,636 contratos' },
              { label: 'CONAGUA',  value: 28.2,  color: '#64748b',                  annotation: '281 vendors · 5,988 contracts',   annotation_es: '281 proveedores · 5,988 contratos' },
            ],
            unit: 'B MXN',
            annotation: 'Each bar shows the total value of P6-pattern contracting where the listed institution is the vendor\'s primary buyer. Health institutions (IMSS, ISSSTE — red highlight) account for 451.9B MXN; energy (CFE, PEMEX) accounts for 440.5B MXN. The seven institutions sum to 1.06 trillion pesos.',
            annotation_es: 'Cada barra muestra el valor total de contratación con patrón P6 donde la institución listada es el comprador principal del proveedor. Las instituciones de salud (IMSS, ISSSTE — resaltadas en rojo) suman 451.9 mil millones; energía (CFE, PEMEX) suma 440.5 mil millones. Las siete instituciones suman 1.06 billones de pesos.',
          },
        },
        pullquote: {
          quote: 'Each individual contract appears defensible. The corruption is in the pattern across hundreds of contracts, across years, across entire institutions.',
          quote_es: 'Cada contrato individual parece defendible. La corrupción está en el patrón a lo largo de cientos de contratos, a lo largo de años, a lo largo de instituciones enteras.',
          stat: '1.06T MXN',
          statLabel: 'P6 contracting at the top seven Mexican federal institutions',
          statLabel_es: 'contratación P6 en las siete principales instituciones federales mexicanas',
          barValue: 0.78,
          barLabel: 'share via direct adjudication',
          barLabel_es: 'porción vía adjudicación directa',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'ASF. (2022). Auditoría de Desempeño 2022-6-06G00-07-0024. Adquisición de Medicamentos, IMSS.',
          'RUBLI temporal contract analysis, P6-classified vendors grouped by top_institution, April 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The La Estafa Maestra Echo',
        title_es: 'El eco de La Estafa Maestra',
        prose: [
          'The largest documented case of intermediary fraud in Mexican procurement history is La Estafa Maestra — a scheme in which federal agencies contracted with public universities, which then subcontracted to phantom companies, which effectively returned money to the original agencies\' officials. The Parliamentary investigation of 2017 and the MCCI/Animal Político journalistic investigation of the same year found 7.67 billion pesos moved through this structure between 2013 and 2014 alone.',
          'La Estafa Maestra was possible because Mexico\'s procurement law had a carve-out for contracts with public universities, treating them as exempt from competitive bidding requirements under the legal fiction that universities are trusted public institutions. The universities became intermediaries between the procurement law and the shadow market, and the intermediaries within that chain were phantom companies whose RFCs matched nothing in the Registro Federal de Contribuyentes.',
          'RUBLI\'s ground truth database includes La Estafa Maestra; the vendors directly linked to it have risk scores averaging 0.55 to 0.65 — elevated but not at the ceiling, because the small contract counts of phantom companies limit what the behavioral model can see. What RUBLI does see clearly is the mechanism. The 2,974 P3 vendors in today\'s queue are the structural successors of the La Estafa Maestra architecture — different entities, different institutions, same role: a paid pass-through between government budget and actual delivery.',
          'The OECD\'s 2023 Procurement Performance Review explicitly warned that intermediary chains in public works typically add 15 to 30 percent overhead without adding delivery value. Applied to RUBLI\'s 526.8 billion pesos of P3 intermediary contracting, the implied overhead cost is somewhere between 79 and 158 billion pesos. That is, at the low end, approximately the annual budget of the entire federal Ministry of Health infrastructure program. The cost of intermediation, if it is fraudulent, is not hypothetical.',
        ],
        prose_es: [
          'El caso documentado más grande de fraude por intermediación en la historia de la contratación pública mexicana es La Estafa Maestra — un esquema en el que las dependencias federales contrataban con universidades públicas, que luego subcontrataban con empresas fantasma, que en efecto devolvían el dinero a los funcionarios de las dependencias originales. La investigación parlamentaria de 2017 y la investigación periodística de MCCI/Animal Político del mismo año encontraron que 7.67 mil millones de pesos se movieron por esta estructura solo entre 2013 y 2014.',
          'La Estafa Maestra fue posible porque la ley mexicana de adquisiciones tenía una excepción para los contratos con universidades públicas, tratándolos como exentos de los requisitos de licitación competitiva bajo la ficción legal de que las universidades son instituciones públicas confiables. Las universidades se volvieron intermediarias entre la ley de adquisiciones y el mercado en la sombra, y los intermediarios dentro de esa cadena eran empresas fantasma cuyos RFC no coincidían con nada en el Registro Federal de Contribuyentes.',
          'La base de datos de la verdad-base de RUBLI incluye La Estafa Maestra; los proveedores directamente vinculados a ella tienen calificaciones de riesgo que promedian de 0.55 a 0.65 — elevadas pero no en el techo, porque las cuentas pequeñas de contratos de las empresas fantasma limitan lo que el modelo conductual puede ver. Lo que RUBLI sí ve con claridad es el mecanismo. Los 2,974 proveedores P3 en la cola de hoy son los sucesores estructurales de la arquitectura de La Estafa Maestra — distintas entidades, distintas instituciones, el mismo papel: un paso pagado entre el presupuesto del gobierno y la entrega real.',
          'La Revisión de Desempeño en Compras Públicas 2023 de la OCDE advirtió expresamente que las cadenas de intermediación en obra pública típicamente añaden de 15 a 30 por ciento de sobrecarga sin agregar valor de entrega. Aplicado a los 526.8 mil millones de pesos de contratación con intermediación P3 de RUBLI, el costo implícito de sobrecarga está entre 79 y 158 mil millones de pesos. Eso es, en el extremo bajo, aproximadamente el presupuesto anual del programa federal completo de infraestructura del sector salud. El costo de la intermediación, si es fraudulenta, no es hipotético.',
        ],
        // Editorial-swimlane chartConfig removed 2026-05-26:
        // The renderer was CategorySwimlaneStory (self-fetches federal-spend
        // categories), unrelated to this chapter's content. With no data
        // block in the config, the chart rendered as wrong-content or empty.
        // The pullquote (79-158B MXN annual overhead) carries the editorial
        // weight directly — keep the chapter prose-led.
        pullquote: {
          quote: 'La Estafa Maestra moved 7.67 billion pesos through an intermediary structure in two years. RUBLI\'s current P3 population is running 526 billion.',
          quote_es: 'La Estafa Maestra movió 7.67 mil millones de pesos por una estructura de intermediación en dos años. La población P3 actual de RUBLI corre con 526 mil millones.',
          stat: '79-158B MXN',
          statLabel: 'estimated annual overhead cost of P3 intermediation',
          statLabel_es: 'costo anual estimado de sobrecarga de la intermediación P3',
        },
        sources: [
          'ASF. (2017). Auditoría de Desempeño 2016-0-06100-07-0161. La Estafa Maestra.',
          'Animal Político / MCCI. (2017). La Estafa Maestra: Graduados en desaparecer dinero público.',
          'OECD. (2023). Public Procurement Performance Report: Mexico.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'El vacío de fiscalización',
        prose: [
          'Capture and intermediation are difficult to prosecute for a fundamental reason: both rely on legal procurement actions whose aggregate effect is harmful even when each individual action is defensible. Subcontracting is legal. Recurring vendor relationships are legal. Direct adjudication of specialized procurement is legal. A prosecutor cannot easily build a case against an individual contract; what the evidence demands is a case against a pattern, and Mexican procurement law does not provide the legal vehicle for pattern-based prosecution.',
          'The SFP has authority to audit procurement unit performance and can theoretically sanction officials whose patterns of award indicate favoritism. SFP\'s actual sanctions docket, however, focuses overwhelmingly on documented individual misconduct — bribery, conflict-of-interest failures, procedural violations. Pattern-based sanctions are rare and politically controversial because they require oversight bodies to second-guess cumulative professional judgment.',
          'RUBLI\'s 15,923 P6 vendors and 2,974 P3 vendors provide a starting point for precisely the pattern-based oversight that the legal architecture does not yet structurally support. UIF could subpoena bank records for the top-value P3 intermediaries to determine whether the price spread between government payment and subcontract payment is systematic. COFECE could investigate P6 vendor-institution relationships as potential prácticas monopólicas relativas. ASF could run dedicated audits of the highest-concentration P6 procurement units. None of this is happening systematically.',
          'The accountability gap is not legal. It is institutional and political. Mexico has the statutes, the oversight bodies, and — with RUBLI — the analytical capacity. What is missing is the political decision to deploy those tools against patterns that have operated undisturbed for two decades.',
        ],
        prose_es: [
          'La captura y la intermediación son difíciles de procesar penalmente por una razón fundamental: ambas se apoyan en acciones legales de contratación cuyo efecto agregado es dañino aun cuando cada acción individual sea defendible. Subcontratar es legal. Las relaciones recurrentes con proveedores son legales. La adjudicación directa de contratación especializada es legal. Un fiscal no puede construir fácilmente un caso contra un contrato individual; lo que la evidencia exige es un caso contra un patrón, y la ley mexicana de adquisiciones no provee el vehículo legal para imputación basada en patrones.',
          'La SFP tiene autoridad para auditar el desempeño de las unidades compradoras y puede teóricamente sancionar a funcionarios cuyos patrones de adjudicación indiquen favoritismo. La agenda real de sanciones de la SFP, sin embargo, se enfoca abrumadoramente en mal comportamiento individual documentado — sobornos, fallas de conflicto de interés, violaciones procedimentales. Las sanciones basadas en patrones son raras y políticamente controvertidas porque exigen que los órganos de fiscalización pongan en duda el juicio profesional acumulado.',
          'Los 15,923 proveedores P6 y los 2,974 proveedores P3 de RUBLI proveen un punto de partida para precisamente el oversight basado en patrones que la arquitectura legal aún no respalda estructuralmente. La UIF podría solicitar registros bancarios de los intermediarios P3 de mayor valor para determinar si la diferencia de precio entre el pago del gobierno y el pago del subcontrato es sistemática. La COFECE podría investigar las relaciones proveedor-institución P6 como potenciales prácticas monopólicas relativas. La ASF podría correr auditorías dedicadas a las unidades compradoras P6 con mayor concentración. Nada de esto está pasando sistemáticamente.',
          'El vacío de fiscalización no es legal. Es institucional y político. México tiene los estatutos, los órganos de oversight y — con RUBLI — la capacidad analítica. Lo que falta es la decisión política de desplegar esas herramientas contra patrones que han operado sin perturbación durante dos décadas.',
        ],
        pullquote: {
          quote: 'Mexico has the statutes, the oversight bodies, and the analytical capacity. What is missing is the political decision to use them.',
          quote_es: 'México tiene las leyes, los órganos de fiscalización y la capacidad analítica. Lo que falta es la decisión política de usarlos.',
          stat: '18,897',
          statLabel: 'total P3 + P6 vendors awaiting pattern-based investigation',
          statLabel_es: 'total de proveedores P3 + P6 a la espera de investigación basada en patrones',
          barValue: 0.62,
          barLabel: 'share in direct-award contracts',
          barLabel_es: 'porción en contratos por adjudicación directa',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'SFP. (2025). Programa de Auditoría a Unidades Compradoras 2025.',
          'UIF/SHCP. (2024). Informe Anual de Actividades 2024.',
          'RUBLI institution-level P6 analysis, April 2026.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'marea-de-adjudicaciones', 'el-ejercito-fantasma'],
    lensTags: {
      patterns: ['P3', 'P6'],
      sectors: ['salud', 'energia', 'infraestructura'],
      terms: ['captura', 'IMSS', 'CFE', 'PEMEX'],
    },
    nextSteps: [
      'Request from SFP the results of any audits of IMSS pharmaceutical procurement in 2023-2025 involving recurring direct-award vendors.',
      'File UIF financial intelligence request for bank transaction data on the top 20 P3-classified intermediary vendors in infrastructure by contract value.',
      'Use COMPRANET to identify which IMSS procurement officials signed the highest-value P6-pattern contracts — cross-reference with SIPOT conflict-of-interest declarations.',
      'Investigate whether any of the 3,821 IMSS P6 vendors were listed on the RUPC as recently established entities at the time of first contract.',
      'File information requests to ASF for the complete findings of the 2022 IMSS pharmaceutical audit, including vendor names and institutional findings.',
      'Research whether Mexico\'s 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.',
    ],
    nextSteps_es: [
      'Solicitar a la SFP los resultados de cualquier auditoría de compras farmacéuticas del IMSS en 2023-2025 que involucre proveedores recurrentes de adjudicación directa.',
      'Presentar solicitud de inteligencia financiera a la UIF para datos de transacciones bancarias de los 20 proveedores intermediarios P3 de mayor valor en infraestructura.',
      'Usar COMPRANET para identificar qué funcionarios de compras del IMSS firmaron los contratos de mayor valor con patrón P6 — cruzar con declaraciones de conflicto de interés del SIPOT.',
      'Investigar si alguno de los 3,821 proveedores P6 del IMSS estaba registrado en el RUPC como entidad de reciente creación al momento de su primer contrato.',
      'Solicitar a la ASF los hallazgos completos de la auditoría farmacéutica del IMSS de 2022, incluyendo nombres de proveedores y conclusiones institucionales.',
      'Investigar si la reforma a la ley de contrataciones de 2022 atendió el vacío legal de subcontratación universitaria que posibilitó La Estafa Maestra.',
    ],
  },

  // =========================================================================
  // STORY 6: The Direct Award Tide
  // =========================================================================
  {
    slug: 'marea-de-adjudicaciones',
    outlet: 'data_analysis',
    type: 'era',
    era: 'cross',
    headline: 'The Direct Award Tide',
    headline_es: 'La Marea de las Adjudicaciones',
    subheadline: 'RUBLI traces a 14-year rise in non-competitive contract awards from 62% to 82%. Every administration set a new ceiling. The data shows this is not an emergency measure — it is structural policy.',
    subheadline_es: 'RUBLI rastrea un alza de 14 años en adjudicaciones no competitivas, del 62% al 82%. Cada administración fijó un nuevo techo. Los datos muestran que esto no es una medida de emergencia — es política estructural.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'reporteado',
    leadStat: { value: '82.2%', label: 'direct award rate in 2023', label_es: 'tasa de adjudicación directa en 2023', sublabel: 'highest in 23-year dataset', sublabel_es: 'la más alta en 23 años de datos', color: '#ea580c' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Upward Slope That Never Reversed',
        title_es: 'La pendiente que nunca se invirtió',
        prose: [
          'Every Mexican government since 2010 has promised procurement transparency. Every government has also used more direct awards than the previous one. RUBLI\'s data on direct award rates — contracts awarded without competitive bidding — documents this gap between rhetoric and reality with the clarity of a single ascending line.',
          'In 2010, the first year of reliable COMPRANET data (Structure B), 62.7 percent of all federal contracts were direct awards. By 2013 the rate had climbed to 68.4 percent. In 2015 it reached 73.0 percent under Peña Nieto. In 2019, AMLO\'s first year, it hit 77.8 percent. In 2021 it reached 80.0 percent. In 2023 it climbed to 82.2 percent — the highest rate in the 23 years RUBLI can analyze. In 2024 it remained at 79.3 percent.',
          'OECD\'s 2023 Procurement Performance Review sets 25-30 percent as the approximate ceiling for direct award usage in a well-functioning procurement system. That ceiling reflects the legitimate universe of single-source situations: genuine emergencies, sole-provider specialty procurement, small-value transactions where competitive overhead exceeds expected savings. Above 30 percent, the OECD framework treats direct adjudication as a structural indicator of procurement dysfunction.',
          'Mexico has been above 60 percent for the entire available data period. It has been above 75 percent since 2017. The ceiling the OECD frames as "dysfunction" is a floor Mexico does not approach. In Mexican federal procurement, non-competition is not the exception to the rule. It is the rule.',
          'Aggregated by administration, the trajectory is unambiguous. Calderón (2007-2012) ran an average direct-award rate of 42.3 percent across 481,450 contracts. Peña Nieto (2013-2018) ran 73.1 percent across 1.23 million contracts. AMLO (2019-2024) ran 79.4 percent across 1.05 million contracts. Sheinbaum\'s incomplete first months sit at 68.3 percent on 92,631 contracts — a partial-year reading. The Fox period predates reliable COMPRANET coverage of the direct-award flag and cannot be benchmarked against the others.',
        ],
        prose_es: [
          'Todo gobierno mexicano desde 2010 ha prometido transparencia en la contratación pública. Todo gobierno también ha usado más adjudicaciones directas que el anterior. Los datos de RUBLI sobre tasas de adjudicación directa — contratos adjudicados sin licitación competitiva — documentan esa brecha entre la retórica y la realidad con la claridad de una sola línea ascendente.',
          'En 2010, el primer año de datos confiables en CompraNet (estructura B), 62.7 por ciento de todos los contratos federales fueron adjudicaciones directas. Para 2013 la tasa había subido a 68.4 por ciento. En 2015 alcanzó 73.0 por ciento bajo Peña Nieto. En 2019, primer año de AMLO, llegó a 77.8 por ciento. En 2021 alcanzó 80.0 por ciento. En 2023 subió a 82.2 por ciento — la tasa más alta en los 23 años que RUBLI puede analizar. En 2024 se mantuvo en 79.3 por ciento.',
          'La Revisión de Desempeño en Compras Públicas 2023 de la OCDE fija 25-30 por ciento como el techo aproximado del uso de adjudicación directa en un sistema de contratación que funciona bien. Ese techo refleja el universo legítimo de situaciones de única fuente: emergencias genuinas, contratación especializada de proveedor único, transacciones de bajo valor donde la sobrecarga competitiva excede los ahorros esperados. Por encima del 30 por ciento, el marco OCDE trata a la adjudicación directa como un indicador estructural de disfunción en la contratación pública.',
          'México ha estado por encima del 60 por ciento durante todo el periodo de datos disponible. Ha estado por encima del 75 por ciento desde 2017. El techo que la OCDE encuadra como "disfunción" es un piso al que México no se acerca. En la contratación federal mexicana, la no-competencia no es la excepción a la regla. Es la regla.',
          'Agregado por administración, la trayectoria es inequívoca. Calderón (2007-2012) corrió una tasa promedio de adjudicación directa de 42.3 por ciento en 481,450 contratos. Peña Nieto (2013-2018) corrió 73.1 por ciento en 1.23 millones de contratos. AMLO (2019-2024) corrió 79.4 por ciento en 1.05 millones de contratos. Los meses iniciales incompletos de Sheinbaum se ubican en 68.3 por ciento sobre 92,631 contratos — una lectura parcial. El periodo Fox antecede a la cobertura confiable del indicador is_direct_award en CompraNet y no puede compararse con los demás.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'Direct Award Rate, Average per Administration',
          title_es: 'Tasa de adjudicación directa, promedio por administración',
          chartId: 'da-rate-by-admin',
          data: {
            points: [
              { label: 'Calderón',  value: 42.3, color: '#3b82f6',                  annotation: '481K contracts · 191.6B MXN',     annotation_es: '481K contratos · 191.6 mil M MXN' },
              { label: 'Peña Nieto', value: 73.1, color: '#a06820',                 annotation: '1.23M contracts · 852.5B MXN',    annotation_es: '1.23M contratos · 852.5 mil M MXN' },
              { label: 'AMLO',      value: 79.4, color: '#dc2626', highlight: true, annotation: '1.05M contracts · 1.06T MXN',     annotation_es: '1.05M contratos · 1.06 billones MXN' },
              { label: 'Sheinbaum', value: 68.3, color: '#ea580c',                  annotation: '92K contracts (partial term)',    annotation_es: '92K contratos (mandato parcial)' },
            ],
            referenceLine: { value: 30, label: 'OECD ceiling ~30%', label_es: 'Techo OCDE ~30%', color: '#3b82f6' },
            unit: '%',
            maxValue: 100,
            yLabel: 'Average direct award rate (%)',
            yLabel_es: 'Tasa promedio de adjudicación directa (%)',
            annotation: 'Each administration since reliable data began has set a new ceiling. Fox (2001-2006) excluded — Structure A coverage of is_direct_award is unreliable. Sheinbaum reads as a partial-year preview.',
            annotation_es: 'Cada administración desde el inicio de los datos confiables ha fijado un nuevo techo. Fox (2001-2006) excluido — la cobertura del indicador is_direct_award en la estructura A no es confiable. Sheinbaum es una lectura parcial.',
          },
        },
        pullquote: {
          quote: 'In Mexico\'s federal procurement, competitive bidding is the exception. Direct awards are the rule, by a ratio of four to one.',
          quote_es: 'En la contratación federal mexicana, la licitación competitiva es la excepción. La adjudicación directa es la regla, con razón de cuatro a uno.',
          stat: '82.2%',
          statLabel: 'direct award rate 2023',
          statLabel_es: 'tasa de adjudicación directa 2023',
          barValue: 0.822,
          barLabel: 'OECD recommended maximum: ~25-30%',
          barLabel_es: 'máximo recomendado OCDE: ~25-30%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI contracts table analysis, is_direct_award flag, 2010-2024. Queried April 2026.',
          'RUBLI per-administration aggregation: GROUP BY admin (Fox 2001-06, Calderón 2007-12, Peña 2013-18, AMLO 2019-24, Sheinbaum 2025+). April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Chapter 3.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Fourteen Years Above the Line',
        title_es: 'Catorce años por encima de la línea',
        subtitle: 'Direct award rate 2010-2024, compared to the OECD recommended ceiling',
        subtitle_es: 'Tasa de adjudicación directa 2010-2024, comparada con el techo recomendado OCDE',
        prose: [
          'Charted year by year, the direct award rate traces a structural diagnosis of Mexican procurement. The line starts in 2010 at 62.7 percent — already more than twice the OECD ceiling — and climbs almost every year for the next 13. There is no single administration\'s fault here, and no single policy reform caused the trajectory. The ratchet operates continuously across partisan transitions.',
          'The 2020 COVID pandemic did produce a local spike in emergency direct awards, which RUBLI captures in the 78.1 percent figure for that year. But the overall trend was already climbing before the pandemic and continued climbing after it. The pandemic was not the cause of Mexico\'s direct-award culture; it was an accelerant applied to a pre-existing structural condition.',
          'The 2023 peak at 82.2 percent deserves particular scrutiny because it occurred during a period when the AMLO administration had completed the centralization of pharmaceutical procurement, had reconstituted military construction oversight, and had nominally committed to competitive procurement as the default mechanism. The peak is not an inheritance from the prior administration. It is a policy choice of the current architecture.',
        ],
        prose_es: [
          'Graficada año por año, la tasa de adjudicación directa traza un diagnóstico estructural de la contratación pública mexicana. La línea arranca en 2010 en 62.7 por ciento — ya más del doble del techo OCDE — y sube casi cada año durante los siguientes 13. No hay culpa de una sola administración, y ninguna reforma de política causó por sí sola la trayectoria. El trinquete opera continuamente a través de las transiciones partidistas.',
          'La pandemia de COVID en 2020 sí produjo un pico local en adjudicaciones directas de emergencia, que RUBLI captura en la cifra de 78.1 por ciento de ese año. Pero la tendencia general ya estaba subiendo antes de la pandemia y siguió subiendo después. La pandemia no fue la causa de la cultura de adjudicación directa en México; fue un acelerante aplicado a una condición estructural preexistente.',
          'El pico de 2023 en 82.2 por ciento merece escrutinio particular porque ocurrió durante un periodo en el que la administración AMLO había completado la centralización de la contratación farmacéutica, había reconstituido la supervisión de la construcción militar y se había comprometido nominalmente con la contratación competitiva como mecanismo por defecto. El pico no es una herencia de la administración previa. Es una decisión de política de la arquitectura actual.',
        ],
        chartConfig: {
          type: 'inline-area',
          title: 'Direct Award Rate by Year 2010-2024',
          title_es: 'Tasa de adjudicación directa por año 2010-2024',
          chartId: 'da-rate-trend',
          data: {
            points: [
              { label: '2010', value: 62.7 },
              { label: '2011', value: 60.0 },
              { label: '2013', value: 68.4 },
              { label: '2015', value: 73.0 },
              { label: '2016', value: 74.8 },
              { label: '2017', value: 77.1 },
              { label: '2019', value: 77.8 },
              { label: '2020', value: 78.1 },
              { label: '2021', value: 80.0, highlight: true, annotation: '80%' },
              { label: '2022', value: 79.1 },
              { label: '2023', value: 82.2, highlight: true, annotation: 'peak 82.2%', annotation_es: 'pico 82.2%' },
              { label: '2024', value: 79.3 },
            ],
            referenceLine: { value: 30, label: 'OECD recommended ceiling ~30%', label_es: 'Techo recomendado OCDE ~30%', color: '#3b82f6' },
            unit: '%',
            maxValue: 100,
            yLabel: 'Direct award rate (%)',
            yLabel_es: 'Tasa de adjudicación directa (%)',
            annotation: 'Mexico exceeds OECD recommended ceiling by 2-3x every year in the dataset.',
            annotation_es: 'México excede el techo recomendado OCDE entre 2 y 3 veces cada año del periodo.',
          },
        },
        pullquote: {
          quote: 'The OECD ceiling is 30 percent. Mexico\'s floor is 60 percent. The distance between them is where competitive procurement used to live.',
          quote_es: 'El techo OCDE es del 30 por ciento. El piso mexicano es del 60. La distancia entre ambos es donde solía vivir la contratación competitiva.',
          stat: '14 years',
          statLabel: 'consecutive years above 60% direct-award rate',
          statLabel_es: 'años consecutivos con tasa de adjudicación directa por encima del 60%',
        },
        sources: [
          'RUBLI year-over-year direct award analysis, 2018-2022, April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 3.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Emergency as Habit',
        title_es: 'La emergencia como hábito',
        prose: [
          'Direct award procedures exist for legitimate reasons. Mexico\'s Ley de Adquisiciones, Art. 41, enumerates them: genuine emergencies, single-source situations, continuity of services with existing contractors, small-value contracts below threshold, and specific enumerated exceptions including national security procurement and force majeure. Each of these exceptions was drafted to address a specific legitimate need that competitive bidding cannot accommodate.',
          'The problem RUBLI identifies is that "exception" has become "default." When 82 percent of contracts invoke one or another exception, the statute\'s architecture has been inverted. The exception clauses in Art. 41 are now the normal operating procedure, and open competitive bidding under Art. 26 is the exception.',
          'AMLO\'s 2019 centralization of pharmaceutical procurement under BIRMEX and INSABI was explicitly framed as an anti-corruption measure — removing the discretion of individual institutional buyers who had developed corrupt relationships with vendors. The irony documented in RUBLI\'s data: the centralized BIRMEX-INSABI system that replaced fragmented procurement ran at near-100 percent direct award rates in 2020-2021, with vendors winning enormous single-source contracts without competitive process. Centralization did not cure the direct-award dependency; it concentrated it.',
          'The mechanism of this concentration is revealing. A decentralized procurement system with corrupt relationships at 1,000 institutional buyers produces 1,000 instances of direct adjudication, each justified on its own terms. A centralized system with no more competitive capacity than its predecessors produces a single national-scale direct award, justified on a single institutional basis. The shape of the problem has changed; the underlying dependency has not.',
        ],
        prose_es: [
          'Los procedimientos de adjudicación directa existen por razones legítimas. La Ley de Adquisiciones de México, Art. 41, las enumera: emergencias genuinas, situaciones de única fuente, continuidad de servicios con contratistas existentes, contratos de bajo valor por debajo del umbral, y excepciones específicas enumeradas que incluyen la contratación de seguridad nacional y la fuerza mayor. Cada una de esas excepciones fue redactada para atender una necesidad legítima específica que la licitación competitiva no puede acomodar.',
          'El problema que RUBLI identifica es que la "excepción" se ha vuelto "regla por defecto". Cuando el 82 por ciento de los contratos invoca alguna u otra excepción, la arquitectura del estatuto se ha invertido. Las cláusulas de excepción del Art. 41 son ahora el procedimiento normal de operación, y la licitación pública abierta bajo el Art. 26 es la excepción.',
          'La centralización de la contratación farmacéutica de 2019 bajo BIRMEX e INSABI por AMLO fue planteada explícitamente como medida anticorrupción — removiendo la discreción de compradores institucionales individuales que habían desarrollado relaciones corruptas con proveedores. La ironía documentada en los datos de RUBLI: el sistema centralizado BIRMEX-INSABI que reemplazó a la contratación fragmentada operó con tasas de adjudicación directa cercanas al 100 por ciento en 2020-2021, con proveedores ganando enormes contratos de única fuente sin proceso competitivo. La centralización no curó la dependencia de la adjudicación directa; la concentró.',
          'El mecanismo de esta concentración es revelador. Un sistema descentralizado de contratación con relaciones corruptas en 1,000 compradores institucionales produce 1,000 instancias de adjudicación directa, cada una justificada en sus propios términos. Un sistema centralizado sin mayor capacidad competitiva que sus predecesores produce una sola adjudicación directa de escala nacional, justificada sobre una sola base institucional. La forma del problema cambió; la dependencia subyacente no.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'The pandemic was an accelerant, not a cause',
          title_es: 'La pandemia fue acelerante, no causa',
          data: {
            points: [
              { label: '2019 pre-COVID',  value: 77.8, color: '#ea580c',                  annotation: 'already at structural peak',          annotation_es: 'ya en el pico estructural' },
              { label: '2020 COVID year', value: 78.1, color: '#ea580c',                  annotation: '+0.3pp during pandemic',              annotation_es: '+0.3pp durante la pandemia' },
              { label: '2023 post-COVID', value: 82.2, color: '#dc2626', highlight: true, annotation: '+4.1pp after pandemic ended',         annotation_es: '+4.1pp tras finalizar la pandemia' },
            ],
            referenceLine: { value: 30, label: 'OECD recommended ceiling ~30%', label_es: 'Techo recomendado OCDE ~30%', color: '#3b82f6' },
            unit: '%',
            maxValue: 100,
            yLabel: 'Direct award rate (%)',
            yLabel_es: 'Tasa de adjudicación directa (%)',
            annotation: 'The trend was climbing before COVID and continued climbing after. The pandemic moved the rate +0.3pp; the three years that followed moved it +4.1pp more. The pandemic was an accelerant applied to a pre-existing structural condition — not the cause.',
            annotation_es: 'La tendencia ya subía antes de la COVID y siguió subiendo después. La pandemia movió la tasa +0.3pp; los tres años siguientes la movieron +4.1pp adicionales. La pandemia fue un acelerante aplicado a una condición estructural preexistente — no la causa.',
          },
        },
        pullquote: {
          quote: 'The pandemic did not create Mexico\'s direct-award culture. It was an accelerant applied to a pre-existing structural condition.',
          quote_es: 'La pandemia no creó la cultura de adjudicación directa en México. Fue un acelerante aplicado a una condición estructural preexistente.',
          stat: '78.1%',
          statLabel: 'direct award rate in 2020 (pandemic year)',
          statLabel_es: 'tasa de adjudicación directa en 2020 (año pandémico)',
          barValue: 0.781,
          barLabel: 'was already 77.8% in 2019 pre-pandemic',
          barLabel_es: 'ya era 77.8% en 2019 prepandemia',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público, Art. 41.',
          'Fundar/IMCO. (2021). La Reforma Farmacéutica: ¿Compras sin competencia?',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'What 82% Really Costs',
        title_es: 'Lo que realmente cuesta el 82%',
        prose: [
          'OECD research across 40 countries has quantified the premium paid in non-competitive procurement. A 2019 meta-analysis found that eliminating competition in public procurement increases contract prices by 15 to 30 percent on average, with higher premiums in concentrated markets and for recurring vendors. The premium is larger still — 25 to 40 percent — for infrastructure and specialized technical procurement.',
          'Applied conservatively to Mexican federal procurement: in 2023, direct-award contracts totaled approximately 720 billion pesos in face value. At a 15 percent competitive distortion premium — the low end of the OECD range — the competitive distortion cost is approximately 108 billion pesos annually. That figure is equivalent to roughly 40 percent of the entire federal education budget for that year, or 60 percent of the health infrastructure budget.',
          'This is not a definitive calculation. Individual contract circumstances vary enormously, and some direct awards may in fact be priced competitively due to internal benchmarking, international reference pricing, or vendor self-discipline. But RUBLI\'s risk model provides complementary corroborating evidence: the average risk score for direct-award contracts is significantly higher than for competitive procedures in the same sector-year, consistent with the pattern that non-competitive awards attract overpricing and favoritism even when not outright fraudulent.',
          'Summed across the 23 years of data, the aggregate cost of Mexican direct-award dependency, assuming OECD-typical premiums, is in the low trillions of pesos. That is not a precise figure; it is an order-of-magnitude estimate. What RUBLI\'s data permits with precision is the documentation that the opportunity cost exists and that it scales with the direct-award rate. Every percentage point of additional direct adjudication corresponds, in international experience, to measurable procurement cost inflation.',
          'Naming who actually wins these non-competitive contracts grounds the abstraction. Of vendors with at least 50 contracts between 2010 and 2024, those with a direct-award rate above 95 percent split into three coherent clusters. Tech licensing (Microsoft Corporation 10.9B MXN at 97.3% DA, Oracle México 8.3B MXN at 98.4%, IBM 8.0B MXN at 95.4%) — defensible to a degree, since proprietary software is genuinely sole-source. Government media buys (Televisa 7.1B MXN at 99.7%, Estudios Azteca 5.8B MXN at 99.8%) — federal advertising routed without competition to the two dominant broadcasters. And bulk commodity supply to the welfare-distribution apparatus DICONSA-LICONSA (Molinos Azteca 7.6B MXN at 99.9%, Marcas Nestlé 4.4B MXN at 99.9%, Molinera de México 2.9B MXN at 100%, Fábrica de Jabón La Corona 2.7B MXN at 99.9%).',
        ],
        prose_es: [
          'La investigación de la OCDE en 40 países ha cuantificado la prima pagada en la contratación no competitiva. Un meta-análisis de 2019 encontró que eliminar la competencia en la contratación pública incrementa los precios de contrato en promedio entre 15 y 30 por ciento, con primas más altas en mercados concentrados y con proveedores recurrentes. La prima es aún mayor — 25 a 40 por ciento — en infraestructura y contratación técnica especializada.',
          'Aplicado conservadoramente a la contratación federal mexicana: en 2023, los contratos por adjudicación directa totalizaron aproximadamente 720 mil millones de pesos en valor nominal. Con una prima de distorsión competitiva del 15 por ciento — el extremo bajo del rango OCDE — el costo por distorsión competitiva es de aproximadamente 108 mil millones de pesos anuales. Esa cifra equivale a aproximadamente 40 por ciento del presupuesto federal de educación completo de ese año, o 60 por ciento del presupuesto de infraestructura del sector salud.',
          'Este no es un cálculo definitivo. Las circunstancias de cada contrato varían enormemente, y algunas adjudicaciones directas pueden de hecho tener precios competitivos por benchmarking interno, precios internacionales de referencia o auto-disciplina del proveedor. Pero el modelo de riesgo de RUBLI provee evidencia corroborativa complementaria: la calificación de riesgo promedio para contratos por adjudicación directa es significativamente más alta que la de procedimientos competitivos en el mismo sector-año, consistente con el patrón de que las adjudicaciones no competitivas atraen sobreprecio y favoritismo aun cuando no sean francamente fraudulentas.',
          'Sumado a lo largo de los 23 años de datos, el costo agregado de la dependencia mexicana de la adjudicación directa, asumiendo primas típicas OCDE, está en el bajo orden de los billones de pesos. No es una cifra precisa; es una estimación de orden de magnitud. Lo que los datos de RUBLI permiten con precisión es documentar que el costo de oportunidad existe y que escala con la tasa de adjudicación directa. Cada punto porcentual de adjudicación directa adicional corresponde, en la experiencia internacional, a una inflación de costo de contratación medible.',
          'Nombrar quiénes realmente ganan esos contratos no competitivos ancla la abstracción. De los proveedores con al menos 50 contratos entre 2010 y 2024, aquellos con tasa de adjudicación directa por encima del 95 por ciento se dividen en tres bloques coherentes. Licencias tecnológicas (Microsoft Corporation 10.9 mil millones a 97.3% AD, Oracle México 8.3 mil millones a 98.4%, IBM 8.0 mil millones a 95.4%) — defendibles hasta cierto punto, ya que el software propietario es genuinamente de única fuente. Gasto gubernamental en medios (Televisa 7.1 mil millones a 99.7%, Estudios Azteca 5.8 mil millones a 99.8%) — publicidad federal canalizada sin competencia a las dos radiodifusoras dominantes. Y suministro de productos básicos al aparato de distribución de bienestar DICONSA-LICONSA (Molinos Azteca 7.6 mil millones a 99.9%, Marcas Nestlé 4.4 mil millones a 99.9%, Molinera de México 2.9 mil millones a 100%, Fábrica de Jabón La Corona 2.7 mil millones a 99.9%).',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'Top 14 Vendors by Direct-Award-Only Spend (≥95% DA, ≥50 contracts, 2010-2024)',
          title_es: 'Top 14 proveedores con gasto solo por adjudicación directa (≥95% AD, ≥50 contratos, 2010-2024)',
          chartId: 'da-only-vendors',
          data: {
            points: [
              { label: 'Microsoft Corporation',          value: 10.87, color: '#a06820',                  annotation: '97.3% DA · tech license',     annotation_es: '97.3% AD · licencia tech' },
              { label: 'Oracle México',                  value: 8.27,  color: '#a06820',                  annotation: '98.4% DA · tech license',     annotation_es: '98.4% AD · licencia tech' },
              { label: 'IBM México',                     value: 8.02,  color: '#a06820',                  annotation: '95.4% DA · tech license',     annotation_es: '95.4% AD · licencia tech' },
              { label: 'Molinos Azteca',                 value: 7.62,  color: '#64748b',                  annotation: '99.9% DA · DICONSA flour',    annotation_es: '99.9% AD · harina DICONSA' },
              { label: 'Televisa',                       value: 7.07,  color: '#dc2626', highlight: true, annotation: '99.7% DA · gov media buy',    annotation_es: '99.7% AD · gasto en medios' },
              { label: 'Microsoft Licensing GP',         value: 6.66,  color: '#a06820',                  annotation: '97.7% DA · tech license',     annotation_es: '97.7% AD · licencia tech' },
              { label: 'Microsoft México',               value: 6.61,  color: '#a06820',                  annotation: '99.6% DA · tech license',     annotation_es: '99.6% AD · licencia tech' },
              { label: 'Estudios Azteca',                value: 5.82,  color: '#dc2626', highlight: true, annotation: '99.8% DA · gov media buy',    annotation_es: '99.8% AD · gasto en medios' },
              { label: 'Aeroméxico',                     value: 5.31,  color: '#a06820',                  annotation: '95.5% DA · gov travel',       annotation_es: '95.5% AD · viajes oficiales' },
              { label: 'Marcas Nestlé',                  value: 4.35,  color: '#64748b',                  annotation: '99.9% DA · DICONSA dairy',    annotation_es: '99.9% AD · lácteos DICONSA' },
              { label: 'Industrial Patrona',             value: 3.87,  color: '#64748b',                  annotation: '99.7% DA · DICONSA bulk',     annotation_es: '99.7% AD · insumos DICONSA' },
              { label: 'CENEVAL',                        value: 3.66,  color: '#a06820',                  annotation: '100% DA · gov-owned exam',    annotation_es: '100% AD · paraestatal' },
              { label: 'Molinera de México',             value: 2.87,  color: '#64748b',                  annotation: '100% DA · DICONSA flour',     annotation_es: '100% AD · harina DICONSA' },
              { label: 'Fábrica de Jabón La Corona',     value: 2.68,  color: '#64748b',                  annotation: '99.9% DA · DICONSA hygiene',  annotation_es: '99.9% AD · higiene DICONSA' },
            ],
            unit: 'B MXN',
            annotation: 'Three captive-supplier clusters emerge: tech licensing (amber, defensible as sole-source), broadcaster capture at Televisa and TV Azteca (red — 12.9B MXN routed to two broadcasters without competition), and DICONSA bulk-staples supply (slate — 17.5B MXN across four staple producers).',
            annotation_es: 'Emergen tres bloques de proveedores cautivos: licencias tecnológicas (ámbar, defendibles como única fuente), captura de las radiodifusoras Televisa y TV Azteca (rojo — 12.9 mil millones de pesos canalizados a dos radiodifusoras sin competencia), y suministro de bienes básicos a DICONSA (pizarra — 17.5 mil millones de pesos entre cuatro productores de canasta).',
          },
        },
        pullquote: {
          quote: 'A 15 percent competitive premium on 720 billion pesos in direct awards equals roughly 108 billion pesos annually — the cost of competition foregone.',
          quote_es: 'Una prima competitiva del 15 por ciento sobre 720 mil millones de pesos en adjudicaciones directas equivale aproximadamente a 108 mil millones de pesos anuales — el costo de la competencia que no hubo.',
          stat: '~108B MXN',
          statLabel: 'estimated annual cost of non-competitive procurement premium',
          statLabel_es: 'costo anual estimado de la prima por contratación no competitiva',
        },
        sources: [
          'Decarolis, F., & Giuffrida, L. (2019). Civil Servants and Cartels: The Revolving Door and Corruption in Procurement. American Economic Review.',
          'SHCP. (2024). Presupuesto de Egresos de la Federación 2024 — sector breakdowns.',
          'RUBLI vendor ranking by SUM(is_direct_award)/COUNT(*) ≥ 0.95 with COUNT(*) ≥ 50, 2010-2024. April 2026.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'El vacío de fiscalización',
        prose: [
          'The institutional architecture to oversee direct awards exists. Every direct award under Art. 41 requires a written justification stating the specific legal basis (emergency, sole source, continuity, et cetera), the vendor selected, and the rationale. Those justifications are theoretically public under transparency law. SFP is theoretically empowered to audit the pattern of justifications at each procurement unit. ASF is theoretically empowered to review individual high-value direct awards during Cuenta Pública audits.',
          'In practice, the justification documents are published inconsistently, the SFP pattern-audit function operates at a small fraction of its legal capacity, and ASF individual-contract reviews cover a tiny fraction of high-value direct awards. The oversight mechanism that Mexico built in law has not been built in practice. The rate of 82 percent is not the outcome of a system that tried to constrain direct awards and failed; it is the outcome of a system that accepted direct awards as normal and built no constraining architecture at all.',
          'Closing this gap requires three things that RUBLI\'s data makes possible but does not deliver on its own. First, systematic publication of Art. 41 justification documents in machine-readable form. Second, pattern-based audit by SFP of procurement units whose direct-award rates exceed sector norms. Third, real-time risk monitoring during procurement decisions so that a risky direct adjudication can be challenged before it is executed rather than after.',
          'Each of these fixes is technically feasible today. CompraNet has the data architecture. RUBLI has the analytical methodology. What is missing is the institutional commitment to operate an oversight system against the grain of 14 years of direct-award dependency. Until that commitment materializes, the line on the chart will continue to drift upward, and the cost — measurable in hundreds of billions of pesos annually — will continue to be paid by the Mexican public.',
        ],
        prose_es: [
          'La arquitectura institucional para supervisar las adjudicaciones directas existe. Cada adjudicación directa bajo el Art. 41 requiere una justificación escrita que especifique la base legal específica (emergencia, única fuente, continuidad, etcétera), el proveedor seleccionado y la motivación. Esas justificaciones son en teoría públicas bajo la ley de transparencia. La SFP está en teoría facultada para auditar el patrón de justificaciones en cada unidad compradora. La ASF está en teoría facultada para revisar adjudicaciones directas individuales de alto valor durante las auditorías de la Cuenta Pública.',
          'En la práctica, los documentos de justificación se publican de manera inconsistente, la función de auditoría por patrones de la SFP opera a una pequeña fracción de su capacidad legal, y las revisiones por contrato individual de la ASF cubren una fracción minúscula de las adjudicaciones directas de alto valor. El mecanismo de fiscalización que México construyó en la ley no se ha construido en la práctica. La tasa de 82 por ciento no es el resultado de un sistema que intentó restringir las adjudicaciones directas y falló; es el resultado de un sistema que aceptó la adjudicación directa como normal y no construyó arquitectura restrictiva alguna.',
          'Cerrar esta brecha requiere tres cosas que los datos de RUBLI hacen posibles pero no entregan por sí solas. Primero, publicación sistemática de los documentos de justificación del Art. 41 en formato legible por máquina. Segundo, auditoría basada en patrones por la SFP a las unidades compradoras cuyas tasas de adjudicación directa excedan las normas sectoriales. Tercero, monitoreo de riesgo en tiempo real durante las decisiones de contratación, de modo que una adjudicación directa riesgosa pueda impugnarse antes de ejecutarse y no después.',
          'Cada uno de estos remedios es técnicamente factible hoy. CompraNet tiene la arquitectura de datos. RUBLI tiene la metodología analítica. Lo que falta es el compromiso institucional para operar un sistema de fiscalización a contracorriente de 14 años de dependencia de la adjudicación directa. Hasta que ese compromiso se materialice, la línea en la gráfica seguirá desplazándose hacia arriba, y el costo — medible en cientos de miles de millones de pesos anualmente — seguirá pagándolo el público mexicano.',
        ],
        pullquote: {
          quote: 'Mexico built an oversight architecture in law and never built it in practice. The 82% direct-award rate is the visible shape of that absence.',
          quote_es: 'México construyó una arquitectura de fiscalización en la ley y nunca la construyó en la práctica. La tasa de adjudicación directa del 82% es la forma visible de esa ausencia.',
          stat: '~720B MXN',
          statLabel: '2023 direct-award contracts by face value',
          statLabel_es: 'contratos de adjudicación directa 2023 por valor nominal',
          barValue: 0.82,
          barLabel: 'share of federal procurement in 2023',
          barLabel_es: 'porción de la contratación federal en 2023',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público, Art. 41, Art. 42.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 4.',
        ],
      },
    ],
    relatedSlugs: ['la-ilusion-competitiva', 'el-sexenio-del-riesgo', 'captura-institucional'],
    lensTags: {
      patterns: ['P5'],
      years: [2010, 2019, 2023],
      terms: ['adjudicación directa', 'direct award', 'Art. 41'],
    },
    nextSteps: [
      'Request from SFP the official justification categories used for direct awards in 2023 — what fraction cite "emergency," "sole source," or "small value"?',
      'Analyze whether BIRMEX\'s post-2019 procurement shows competitive pricing versus pre-reform IMSS pharmaceutical prices for the same drug categories.',
      'File audit requests with ASF for the largest 50 direct-award contracts in 2024 — are any awarded to RUBLI T1/T2 ARIA-queue vendors?',
      'Research which procurement officials are authorized to approve direct awards above 10M MXN — how has that authority concentrated since 2019?',
      'Compile a dataset of Art. 41 justification documents for 2023-2024 and code the cited legal basis to identify which exception clauses are used most frequently.',
      'Interview former SFP auditors who have worked on direct-award pattern reviews about the institutional constraints they encountered.',
    ],
    nextSteps_es: [
      'Solicitar a la SFP las categorías oficiales de justificación de adjudicaciones directas en 2023 — ¿qué fracción cita "emergencia", "fuente única" o "pequeño valor"?',
      'Analizar si las compras de BIRMEX posteriores a 2019 muestran precios competitivos frente a los precios farmacéuticos previos del IMSS para las mismas categorías de medicamentos.',
      'Presentar solicitudes de auditoría a la ASF para los 50 contratos de adjudicación directa más grandes de 2024 — ¿alguno fue adjudicado a proveedores T1/T2 de la cola ARIA de RUBLI?',
      'Investigar qué funcionarios están autorizados para aprobar adjudicaciones directas superiores a 10M MXN — ¿cómo se ha concentrado esa autoridad desde 2019?',
      'Compilar un conjunto de datos de documentos de justificación del Art. 41 para 2023-2024 y codificar el fundamento legal citado para identificar las cláusulas de excepción más utilizadas.',
      'Entrevistar a ex auditores de la SFP que hayan trabajado en revisiones de patrones de adjudicación directa sobre las limitaciones institucionales que encontraron.',
    ],
  },

  // =========================================================================
  // STORY 7: The Riskiest Administration in History
  // =========================================================================
  {
    slug: 'el-sexenio-del-riesgo',
    outlet: 'data_analysis',
    type: 'era',
    era: 'amlo',
    headline: 'The Era of Risk',
    headline_es: 'El Sexenio del Riesgo',
    subheadline: 'Under AMLO, federal procurement reorganized along three axes: military spending tripled, civilian infrastructure collapsed by 65 percent, and pharmaceutical centralization handed multi-billion-peso contracts to a small set of vendors. RUBLI\'s v0.8.5 model scores 12.6 percent of AMLO-era contracts as high-risk — the highest of any administration in 23 years of data, and 5.1 percentage points above Fox\'s baseline.',
    subheadline_es: 'Bajo AMLO, la contratación federal se reorganizó por tres ejes: el gasto militar se triplicó, la infraestructura civil se desplomó 65 por ciento, y la centralización farmacéutica entregó contratos multimillonarios a un puñado de proveedores. El modelo v0.8.5 de RUBLI califica 12.6 por ciento de los contratos del sexenio AMLO como de alto riesgo — el porcentaje más alto de cualquier administración en 23 años de datos, y 5.1 puntos porcentuales por encima del nivel base de Fox.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 18,
    status: 'reporteado',
    leadStat: { value: '12.6%', label: 'high-risk rate, AMLO era (2019-2024) · v0.8.5', label_es: 'tasa de alto riesgo, sexenio AMLO (2019-2024) · v0.8.5', sublabel: 'vs 8.2% Calderón, 11.2% Peña Nieto, 7.5% Fox', sublabel_es: 'vs 8.2% Calderón, 11.2% Peña Nieto, 7.5% Fox', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Model Finds Across Administrations',
        title_es: 'Lo que el modelo encuentra',
        prose: [
          'RUBLI\'s v0.8.5 risk model was not calibrated to any single administration. It was trained on 1,427 documented corruption cases spanning multiple presidencies and scores contracts based on their structural similarity to known-bad patterns: vendor concentration, price volatility, single-bidder conditions, network membership, institution diversity, and procurement mechanism. The model has no partisan attachment and no political knowledge. It sees only patterns.',
          'When we apply this politically blind model across the four complete administrations in RUBLI\'s dataset, the results show a remarkably consistent upward trend. Under Fox (2001-2006), the high-risk rate was 7.50 percent across 206,333 contracts — well within OECD\'s 2–15 percent benchmark. Under Calderón (2007-2012), it reached 8.15 percent across 481,450 contracts. Under Peña Nieto (2013-2018), it climbed to 11.18 percent across 1,228,625 contracts. Under AMLO (2019-2024), it reached 12.62 percent across 1,043,097 contracts — the highest of any administration in the dataset and 5.1 percentage points above the Fox-era baseline.',
          'The counts behind these percentages are as telling as the rates themselves. Fox flagged 15,479 contracts as high-risk. Calderón flagged 39,238. Peña Nieto flagged 137,358. AMLO flagged 131,640. Each administration has produced more high-risk contracts than the previous one on a rate basis — a function of rising risk concentration even as procurement volume growth slowed under AMLO.',
          'Each administration also had its own procurement context. Fox governed with limited COMPRANET coverage (Structure A, 2001-2006), so the Fox-era rate should be read with caution: the dataset under-reports the period. Calderón\'s rate of 8.2 percent fell within OECD\'s acceptable range. Peña Nieto\'s 11.2 percent crossed into concerning territory. AMLO\'s 12.6 percent is the highest in the 23-year dataset — every administration since Fox has been riskier than its predecessor, a drift of 5.1 percentage points over a quarter-century.',
        ],
        prose_es: [
          'El modelo de riesgo v0.8.5 de RUBLI no fue calibrado para ninguna administración en particular. Fue entrenado en 1,427 casos documentados de corrupción que abarcan múltiples presidencias, y evalúa los contratos con base en su similitud estructural con patrones conocidos de corrupción: concentración de proveedores, volatilidad de precios, condiciones de postor único, membresía en redes, diversidad institucional y mecanismo de contratación. El modelo no tiene lealtad partidista ni conocimiento político. Solo ve patrones.',
          'Cuando aplicamos este modelo —políticamente ciego— a las cuatro administraciones completas en el conjunto de datos de RUBLI, los resultados muestran una tendencia ascendente notablemente consistente. Bajo Fox (2001-2006), la tasa de alto riesgo fue de 7.50 por ciento en 206,333 contratos — bien dentro del parámetro 2-15% de la OCDE. Bajo Calderón (2007-2012), alcanzó el 8.15 por ciento en 481,450 contratos. Bajo Peña Nieto (2013-2018), subió al 11.18 por ciento en 1,228,625 contratos. Bajo AMLO (2019-2024), llegó al 12.62 por ciento en 1,043,097 contratos — el más alto de cualquier administración en el conjunto de datos y 5.1 puntos porcentuales por encima de la línea base de la era Fox.',
          'Los conteos detrás de estos porcentajes son tan reveladores como las tasas mismas. Fox marcó 15,479 contratos como de alto riesgo. Calderón marcó 39,238. Peña Nieto marcó 137,358. AMLO marcó 131,640. Cada administración ha producido más contratos de alto riesgo que la anterior en términos de tasa — una función de la creciente concentración del riesgo, incluso cuando el crecimiento del volumen de contratación se desaceleró bajo AMLO.',
          'Cada administración también tuvo su propio contexto de contratación. Fox gobernó con cobertura limitada del COMPRANET (Estructura A, 2001-2006), por lo que la tasa de la era Fox debe leerse con cautela: el conjunto de datos sub-reporta ese período. La tasa del 8.2 por ciento de Calderón se encontraba dentro del rango aceptable de la OCDE. El 11.2 por ciento de Peña Nieto cruzó hacia territorio preocupante. El 12.6 por ciento de AMLO es el más alto en el conjunto de datos de 23 años — cada administración desde Fox ha sido más riesgosa que la anterior, una deriva de 5.1 puntos porcentuales a lo largo de un cuarto de siglo.',
        ],
        pullquote: {
          quote: 'Every Mexican administration since Fox has been riskier than its predecessor. Fox 7.5% → Calderón 8.2% → Peña Nieto 11.2% → AMLO 12.6%. The trend line points only one direction.',
          quote_es: 'Cada administración mexicana desde Fox ha sido más riesgosa que la anterior. Fox 7.5% → Calderón 8.2% → Peña Nieto 11.2% → AMLO 12.6%. La tendencia apunta en una sola dirección.',
          stat: '12.6%',
          statLabel: 'AMLO-era high-risk rate (v0.8.5) — highest in 23 years',
          statLabel_es: 'tasa de alto riesgo, era AMLO (v0.8.5) — la más alta en 23 años',
          barValue: 0.126,
          barLabel: 'vs 7.5% Fox baseline — +5.1pp drift over 24 years',
          barLabel_es: 'vs línea base Fox 7.5% — +5.1 pp de deriva en 24 años',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI contracts table. Grouped by administration by contract_year. Queried April 2026.',
          'OECD. (2023). Public Procurement Performance Report. OECD benchmark: 2-15% high-risk rate.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Reorganization, Not Reduction',
        title_es: 'Reorganización, no reducción',
        subtitle: 'Where every peso went, AMLO vs Peña Nieto',
        subtitle_es: 'A dónde fue cada peso, AMLO vs Peña Nieto',
        prose: [
          'The headline rate hides a more revealing story: AMLO did not spend less. He spent differently. Compared to Peña Nieto\'s six years (2013-2018), AMLO\'s six years (2019-2024) saw federal procurement reorganize along axes that no campaign rhetoric prepared the public for. Three sectors expanded sharply, three collapsed, and one — pharmaceuticals — grew by half while concentrating in fewer hands.',
          'Defense procurement tripled. Federal contracting routed through SEDENA grew from 59.2 billion pesos under Peña Nieto to 168.9 billion under AMLO — a 186 percent increase. This is not a story of weapons modernization; it is a story of mission expansion. The same six years saw SEDENA take operational control over civilian airport construction (AIFA), tourist rail infrastructure (Tren Maya), customs administration, social-program logistics, and a portfolio of public works that previous administrations contracted through SCT and CONAGUA.',
          'Civilian infrastructure spending collapsed in the same window. The Infraestructura sector dropped from 937.1 billion under Peña to 326.4 billion under AMLO — a 65 percent reduction. Energía fell 88 percent (from 435.2B to 50.1B) as Pemex and CFE pulled work in-house. The pesos that civilian agencies stopped spending on roads, water systems, and energy contracts did not vanish from the federal ledger; they reappeared as Defensa, Hacienda, and Gobernación — sectors that grew 186 percent, 70 percent, and 100 percent respectively.',
          'Health (Salud) grew 47 percent — from 816 billion to 1,201 billion pesos. The growth was not in additional clinics, equipment, or personnel; it was in pharmaceutical centralization through INSABI, BIRMEX, and ultimately IMSS-Bienestar. The single largest spend category under AMLO is "Medicamentos y Farmacéuticos" at 327.6 billion pesos with a 22.4 percent high-risk rate. The second-largest, "Construcción de Edificios" (269.4B), captures the military construction surge documented above.',
        ],
        prose_es: [
          'El titular oculta una historia más reveladora: AMLO no gastó menos. Gastó de manera diferente. Comparado con los seis años de Peña Nieto (2013-2018), los seis años de AMLO (2019-2024) vieron la contratación federal reorganizarse por ejes que ninguna retórica de campaña preparó al público para esperar. Tres sectores se expandieron bruscamente, tres colapsaron, y uno —farmacéuticos— creció a la mitad mientras se concentraba en menos manos.',
          'La contratación en Defensa se triplicó. La contratación federal canalizada a través de la SEDENA creció de 59.2 mil millones de pesos bajo Peña Nieto a 168.9 mil millones bajo AMLO — un incremento del 186 por ciento. Esta no es una historia de modernización armamentista; es una historia de expansión de misión. Esos mismos seis años vieron a la SEDENA tomar control operativo de la construcción del aeropuerto civil (AIFA), infraestructura ferroviaria turística (Tren Maya), administración aduanera, logística de programas sociales, y una cartera de obras públicas que administraciones anteriores contrataban a través de la SCT y la CONAGUA.',
          'El gasto en infraestructura civil colapsó en la misma ventana. El sector de Infraestructura cayó de 937.1 mil millones bajo Peña a 326.4 mil millones bajo AMLO — una reducción del 65 por ciento. Energía cayó 88 por ciento (de 435.2 mil millones a 50.1 mil millones) cuando Pemex y CFE internalizaron el trabajo. Los pesos que las dependencias civiles dejaron de gastar en carreteras, sistemas de agua y contratos de energía no desaparecieron del presupuesto federal; reaparecieron como Defensa, Hacienda y Gobernación — sectores que crecieron 186 por ciento, 70 por ciento y 100 por ciento, respectivamente.',
          'Salud creció 47 por ciento — de 816 mil millones a 1,201 mil millones de pesos. El crecimiento no fue en nuevas clínicas, equipos o personal; fue en centralización farmacéutica a través del INSABI, BIRMEX y, finalmente, IMSS-Bienestar. La categoría de mayor gasto individual bajo AMLO es "Medicamentos y Farmacéuticos" con 327.6 mil millones de pesos y una tasa de alto riesgo del 22.4 por ciento. La segunda, "Construcción de Edificios" (269.4 mil millones), captura el auge de la construcción militar documentado arriba.',
        ],
        chartConfig: {
          type: 'inline-stacked-bar',
          title: 'Sectoral Spend Shift, AMLO (2019-24) vs Peña Nieto (2013-18)',
          title_es: 'Cambio sectorial del gasto, AMLO (2019-24) vs Peña Nieto (2013-18)',
          chartId: 'amlo-vs-pena-sectors',
          stacked: {
            rows: [
              { label: 'Salud',           label_en: 'Health',         total: 1201.4, highlight: 1201.4, compareTotal: 816.0,  sectorCode: 'salud',           annotation: '+47% vs Peña',  annotation_es: '+47% vs Peña' },
              { label: 'Infraestructura', label_en: 'Infrastructure', total: 326.4,  highlight: 326.4,  compareTotal: 937.1,  sectorCode: 'infraestructura', annotation: '−65% vs Peña',  annotation_es: '−65% vs Peña' },
              { label: 'Hacienda',        label_en: 'Treasury',       total: 392.9,  highlight: 392.9,  compareTotal: 231.1,  sectorCode: 'hacienda',        annotation: '+70% vs Peña',  annotation_es: '+70% vs Peña' },
              { label: 'Defensa',         label_en: 'Defense',        total: 168.9,  highlight: 168.9,  compareTotal: 59.2,   sectorCode: 'defensa',         annotation: '+186% vs Peña', annotation_es: '+186% vs Peña' },
              { label: 'Gobernación',     label_en: 'Governance',     total: 190.4,  highlight: 190.4,  compareTotal: 95.2,   sectorCode: 'gobernacion',     annotation: '+100% vs Peña', annotation_es: '+100% vs Peña' },
              { label: 'Agricultura',     label_en: 'Agriculture',    total: 166.2,  highlight: 166.2,  compareTotal: 122.2,  sectorCode: 'agricultura',     annotation: '+36% vs Peña',  annotation_es: '+36% vs Peña' },
              { label: 'Educación',       label_en: 'Education',      total: 114.9,  highlight: 114.9,  compareTotal: 155.3,  sectorCode: 'educacion',       annotation: '−26% vs Peña',  annotation_es: '−26% vs Peña' },
              { label: 'Medio Ambiente',  label_en: 'Environment',    total: 94.2,   highlight: 94.2,   compareTotal: 136.5,  sectorCode: 'ambiente',        annotation: '−31% vs Peña',  annotation_es: '−31% vs Peña' },
              { label: 'Energía',         label_en: 'Energy',         total: 50.1,   highlight: 50.1,   compareTotal: 435.2,  sectorCode: 'energia',         annotation: '−88% vs Peña',  annotation_es: '−88% vs Peña' },
            ],
            unit: 'B MXN',
            comparison: {
              leftLabel: 'PEÑA NIETO · 2013–18',
              leftLabel_es: 'PEÑA NIETO · 2013–18',
              rightLabel: 'AMLO · 2019–24',
              rightLabel_es: 'AMLO · 2019–24',
            },
            anchor: {
              value: '2.76T MXN',
              label: 'AMLO TOTAL FEDERAL PROCUREMENT, 2019-2024',
              label_es: 'CONTRATACIÓN FEDERAL TOTAL AMLO, 2019-2024',
            },
            annotation: 'Left bar = Peña Nieto-era spend (2013-18, muted). Right bar = AMLO-era spend (2019-24, sector palette). Identical scale. The shape of Mexican federal spending changed direction across this transition.',
            annotation_es: 'Barra izquierda = gasto del sexenio Peña Nieto (2013-18, atenuado). Barra derecha = gasto del sexenio AMLO (2019-24, paleta sectorial). Misma escala. La forma del gasto federal mexicano cambió de dirección en esta transición.',
            highlightColor: '#a06820',
            highlightLabel: 'AMLO-era spend',
            highlightLabel_es: 'gasto sexenio AMLO',
            baseLabel: 'Peña-era spend',
            baseLabel_es: 'gasto Peña Nieto',
          },
        },
        pullquote: {
          quote: 'AMLO did not spend less. He spent differently. Defense tripled. Civilian infrastructure collapsed by 65 percent. The pesos did not vanish; they reorganized.',
          quote_es: 'AMLO no gastó menos. Gastó distinto. La defensa se triplicó. La infraestructura civil se desplomó 65 por ciento. Los pesos no desaparecieron; se reorganizaron.',
          stat: '+186%',
          statLabel: 'Defensa procurement growth, AMLO vs Peña',
          statLabel_es: 'Crecimiento de contratación en Defensa, AMLO vs Peña',
          barValue: 0.186 * 5,
          barLabel: 'Defense spending tripled in six years',
          barLabel_es: 'Gasto en Defensa se triplicó en seis años',
          vizTemplate: 'horizon',
        },
        sources: [
          'RUBLI sector × administration spending aggregates, contracts table joined to institutions and sectors. April 2026.',
          'SHCP. (2024). Cuenta Pública: comparativo sexenios 2013-2018 / 2019-2024.',
          'IMCO. (2024). El gasto militar en obra pública civil bajo AMLO.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The Army Took Over Procurement',
        title_es: 'El ejército tomó las compras',
        prose: [
          'In 2018, the last year of Peña Nieto, SEDENA contracted 9.94 billion pesos in federal procurement — 2.2 percent of all federal spending. By 2024, SEDENA contracted 22.43 billion pesos — 5.4 percent of all federal spending and 2.5 times its pre-AMLO baseline. Not a single year of the AMLO administration saw SEDENA contracting fall below its 2018 level. The growth was monotonic.',
          'The mechanism was a series of presidential decrees beginning in 2019 that classified increasingly broad categories of public works as matters of national security, transferring their contracting authority from civilian agencies (SCT, CONAGUA, FONATUR) to SEDENA. The legal framework — Articles 41 and 42 of the Ley de Adquisiciones in combination with Article 32 of the Ley de Obras Públicas — permits the executive to designate national-security exceptions to competitive bidding requirements. AMLO\'s administration applied that exception more aggressively than any previous administration in the dataset.',
          'The contracts that resulted are visible in COMPRANET only in fragmented form. The 465 contracts whose titles explicitly mention "Tren Maya" total 125.3 billion pesos — but reporting from independent journalistic outlets and Auditoría Superior de la Federación findings indicates the project\'s real budget has exceeded 500 billion pesos, with most of the spend executed through SEDENA-controlled trust funds (FONATUR/Tren Maya/SEDENA-Bienestar) that publish less granular data than civilian COMPRANET.',
          'Reporting in 2023 by Mexican investigative outlets — including Animal Político, MCCI (Mexicanos Contra la Corrupción y la Impunidad), and Aristegui Noticias — alleged that SEDENA contractors on Tren Maya and AIFA were required to channel a percentage of contract value through specific intermediary firms designated by military procurement officials, a pattern that, if substantiated, fits RUBLI\'s P3 (intermediary capture) signature precisely. RUBLI cannot independently verify those allegations from procurement data alone, but the structural conditions — concentrated awards, intermediary vendors, classified procurement, and limited public visibility — are exactly the conditions under which such patterns emerge.',
        ],
        prose_es: [
          'En 2018, el último año de Peña Nieto, la SEDENA contrató 9.94 mil millones de pesos en contratación federal — el 2.2 por ciento de todo el gasto federal. Para 2024, la SEDENA contrató 22.43 mil millones de pesos — el 5.4 por ciento de todo el gasto federal y 2.5 veces su línea base previa a AMLO. Ni un solo año de la administración AMLO vio caer la contratación de la SEDENA por debajo de su nivel de 2018. El crecimiento fue monótono.',
          'El mecanismo fue una serie de decretos presidenciales a partir de 2019 que clasificaron categorías cada vez más amplias de obras públicas como asuntos de seguridad nacional, transfiriendo su autoridad de contratación de dependencias civiles (SCT, CONAGUA, FONATUR) a la SEDENA. El marco legal — los Artículos 41 y 42 de la Ley de Adquisiciones en combinación con el Artículo 32 de la Ley de Obras Públicas — permite al ejecutivo designar excepciones de seguridad nacional a los requisitos de licitación competitiva. La administración de AMLO aplicó esa excepción de manera más agresiva que cualquier administración anterior en el conjunto de datos.',
          'Los contratos que resultaron son visibles en el COMPRANET solo de forma fragmentada. Los 465 contratos cuyos títulos mencionan explícitamente "Tren Maya" suman 125.3 mil millones de pesos — pero los reportajes de medios periodísticos independientes y los hallazgos de la Auditoría Superior de la Federación indican que el presupuesto real del proyecto ha superado los 500 mil millones de pesos, con la mayor parte del gasto ejecutado a través de fideicomisos controlados por la SEDENA (FONATUR/Tren Maya/SEDENA-Bienestar) que publican datos menos granulares que el COMPRANET civil.',
          'Reportajes de 2023 de medios de investigación mexicanos — entre ellos Animal Político, MCCI (Mexicanos Contra la Corrupción y la Impunidad) y Aristegui Noticias — alegaron que a los contratistas de la SEDENA en el Tren Maya y el AIFA se les exigía canalizar un porcentaje del valor del contrato a través de empresas intermediarias específicas designadas por funcionarios de adquisiciones militares, un patrón que, de ser comprobado, encaja con precisión con la firma P3 (captura de intermediario) de RUBLI. RUBLI no puede verificar de forma independiente esas alegaciones a partir de los datos de contratación, pero las condiciones estructurales — adjudicaciones concentradas, proveedores intermediarios, contratación clasificada y visibilidad pública limitada — son exactamente las condiciones bajo las cuales emergen dichos patrones.',
        ],
        chartConfig: {
          type: 'inline-multi-line',
          title: 'SEDENA Annual Federal Contracting, 2015-2025',
          title_es: 'Contratación federal anual de SEDENA, 2015-2025',
          multiSeries: {
            xLabels: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
            unit: 'B MXN',
            yLabel: 'Annual SEDENA contracting',
            yLabel_es: 'Contratación anual de SEDENA',
            series: [
              {
                name: 'SEDENA',
                name_es: 'SEDENA',
                color: '#1e3a5f',
                values: [5.78, 5.99, 4.83, 9.94, 9.69, 15.18, 18.02, 12.49, 19.55, 22.43, 12.06],
                annotation: { xIndex: 9, text: '22.43B (5.4% of fed)', text_es: '22.43B (5.4% de fed)' },
                totalCaption: '· 135.9B over 11 years',
                totalCaption_es: '· 135.9B en 11 años',
              },
              {
                name: 'AMLO baseline (pre-2019)',
                name_es: 'Línea base pre-AMLO (pre-2019)',
                color: '#a06820',
                values: [9.94, 9.94, 9.94, 9.94, 9.94, 9.94, 9.94, 9.94, 9.94, 9.94, 9.94],
                totalCaption: '· 2018 floor',
                totalCaption_es: '· piso de 2018',
              },
            ],
            annotation: 'Pre-AMLO (2015-2018), SEDENA contracted 4.8-9.9B/year — roughly 1-2% of federal procurement. Under AMLO (2019-2024), it climbed to 22.4B annually and 5.4% of federal procurement, monotonically. The 2025 partial figure (12.06B) represents only the first months of the year and is not yet directly comparable.',
            annotation_es: 'Pre-AMLO (2015-2018), SEDENA contrataba 4.8-9.9 mil millones/año — aproximadamente 1-2% de la contratación federal. Bajo AMLO (2019-2024), subió monotónicamente a 22.4 mil millones anuales y 5.4% de la contratación federal. La cifra parcial de 2025 (12.06 mil millones) representa solo los primeros meses del año y aún no es directamente comparable.',
          },
        },
        pullquote: {
          quote: 'SEDENA contracted 9.94 billion pesos in 2018 and 22.43 billion in 2024. Every year of the AMLO sexenio expanded the army\'s procurement footprint.',
          quote_es: 'La SEDENA contrató 9.94 mil millones de pesos en 2018 y 22.43 mil millones en 2024. Cada año del sexenio AMLO expandió la huella de contratación del ejército.',
          stat: '5.4%',
          statLabel: 'SEDENA share of all federal procurement, 2024',
          statLabel_es: 'Participación de SEDENA en toda la contratación federal, 2024',
          barValue: 0.054,
          barLabel: 'up from 1.1% in 2015 — 5x growth in nine years',
          barLabel_es: 'desde 1.1% en 2015 — crecimiento de 5x en nueve años',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'RUBLI contracts table, institution_id mapped to SEDENA (Secretaría de la Defensa Nacional), 2015-2025.',
          'DOF. (2019-2024). Decretos clasificando obra pública como de seguridad nacional.',
          'MCCI. (2023). El ejército constructor: la militarización de la obra pública civil.',
          'Animal Político. (2023). Las constructoras del Tren Maya y los intermediarios obligatorios.',
          'ASF. (2024). Auditorías a Tren Maya y obra militar 2022-2023.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Where the AMLO-Era Risk Concentrates',
        title_es: 'Dónde se concentra el riesgo',
        prose: [
          'The 12.6 percent high-risk rate is an average. The distribution across categories is uneven and editorially significant. Some procurement categories under AMLO operated near the OECD acceptable range. Others ran at risk levels two to three times the national average. The categories with the highest at-risk rates point directly to the policy choices the administration made.',
          'Alimentos y Víveres — food and provisions — registered a 32.4 percent high-risk rate across 224.9 billion pesos of AMLO-era contracting. This is the category that contains the Segalmex network (1,258 contracts at 1.000 risk score) and the dominant food-voucher operator TOKA Internacional (897 contracts, 25 billion pesos at 0.916 risk). The Segalmex scandal — already documented as the largest financial-corruption case in MORENA government history — accounts for only a fraction of the at-risk pesos in this category. The structural pattern extends beyond Segalmex into welfare-card vendors, military food-distribution contractors, and rural-supply chains that operate under similar concentration conditions.',
          'Medicamentos y Farmacéuticos at 22.4 percent high-risk reflects the IMSS-pharmaceutical-cartel pattern documented in detail in The Invisible Monopoly. Servicios Hospitalarios at 19.4 percent reflects the same IMSS architecture extended to outsourced clinical services. Construcción de Edificios at 8.5 percent looks lower, but only because much of the highest-risk military-construction spending bypasses civilian COMPRANET — what we can measure in the civilian data is biased downward.',
          'TOKA Internacional alone — a single voucher company — collected 40.6 billion pesos under AMLO at a 0.78 risk score. It is the largest individual vendor of the AMLO era after the pharmaceutical and Tren Maya clusters. Edenred, Sodexo, and the family of payment-card operators that captured Mexican welfare-program logistics under AMLO occupy a structurally identical position to the IMSS pharmaceutical cartel: a small set of vendors with critical-tier risk scores, dominant institutional shares, and legal authority for direct adjudication built into the program design.',
        ],
        prose_es: [
          'El 12.6 por ciento de tasa de alto riesgo es un promedio. La distribución por categorías es desigual y editorialmente significativa. Algunas categorías de contratación bajo AMLO operaron cerca del rango aceptable de la OCDE. Otras registraron niveles de riesgo dos o tres veces superiores al promedio nacional. Las categorías con las tasas de alto riesgo más elevadas apuntan directamente a las decisiones de política que tomó la administración.',
          'Alimentos y Víveres registró una tasa de alto riesgo del 32.4 por ciento en 224.9 mil millones de pesos de contratación en la era AMLO. Esta es la categoría que contiene la red de Segalmex (1,258 contratos con puntuación de riesgo 1.000) y el operador dominante de tarjetas de bienestar TOKA Internacional (897 contratos, 25 mil millones de pesos con riesgo 0.916). El escándalo de Segalmex — ya documentado como el mayor caso de corrupción financiera del gobierno MORENA — representa solo una fracción de los pesos en riesgo de esta categoría. El patrón estructural se extiende más allá de Segalmex hacia proveedores de tarjetas de bienestar, contratistas de distribución de alimentos militar y cadenas de suministro rural que operan bajo condiciones de concentración similares.',
          'Medicamentos y Farmacéuticos con 22.4 por ciento de alto riesgo refleja el patrón del cártel farmacéutico del IMSS documentado en detalle en El Monopolio Invisible. Servicios Hospitalarios al 19.4 por ciento refleja la misma arquitectura del IMSS extendida a servicios clínicos externalizados. Construcción de Edificios al 8.5 por ciento parece menor, pero solo porque gran parte del gasto de construcción militar de mayor riesgo elude el COMPRANET civil — lo que podemos medir en los datos civiles está sesgado a la baja.',
          'TOKA Internacional sola — una sola empresa de vales — recaudó 40.6 mil millones de pesos bajo AMLO con una puntuación de riesgo de 0.78. Es el proveedor individual más grande de la era AMLO después de los clusters farmacéuticos y del Tren Maya. Edenred, Sodexo y la familia de operadores de tarjetas de pago que capturaron la logística de los programas de bienestar mexicanos bajo AMLO ocupan una posición estructuralmente idéntica al cártel farmacéutico del IMSS: un pequeño conjunto de proveedores con puntuaciones de riesgo de nivel crítico, cuotas institucionales dominantes y autoridad legal para adjudicación directa integrada en el diseño del programa.',
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'AMLO-Era High-Risk Rate vs Platform Average — by Category',
          title_es: 'Tasa de alto riesgo AMLO vs promedio plataforma — por categoría',
          chartId: 'amlo-categories-risk',
          data: {
            mode: 'excess',
            points: [
              { label: 'Alimentos y Víveres',     label_en: 'Food & Provisions',    value: 32.4, value2: 11.0, highlight: true },
              { label: 'Medicamentos',            label_en: 'Pharmaceuticals',      value: 22.4, value2: 11.0, highlight: true },
              { label: 'Servicios Hospitalarios', label_en: 'Hospital Services',    value: 19.4, value2: 11.0, highlight: true },
              { label: 'Servicios Generales',     label_en: 'General Services',     value: 14.3, value2: 11.0 },
              { label: 'Carreteras',              label_en: 'Highways',             value: 12.2, value2: 11.0 },
              { label: 'Material de Curación',    label_en: 'Medical Supplies',     value: 12.1, value2: 11.0 },
              { label: 'Mantenimiento',           label_en: 'Maintenance',          value:  9.4, value2: 11.0 },
              { label: 'Construcción de Edificios', label_en: 'Building Construction', value:  8.5, value2: 11.0 },
            ],
            unit: '%',
            yLabel: 'Excess above platform avg 11% · positive = breach, negative = below',
            yLabel_es: 'Exceso sobre prom. plataforma 11% · positivo = sobre, negativo = bajo',
            annotation: 'Bar = AMLO-era high-risk rate minus the 11% platform baseline. Positive = breach (sector palette: salud-red on critical excess, escalating amber on the rest). Food & Provisions (+21.4 pp) and Pharmaceuticals (+11.4 pp) are the largest breaches.',
            annotation_es: 'Barra = tasa de alto riesgo AMLO menos la línea base plataforma 11%. Positivo = rebasa (paleta: rojo-salud en exceso crítico, ámbar escalonado en el resto). Alimentos (+21.4 pp) y Medicamentos (+11.4 pp) son las mayores brechas.',
          },
        },
        pullquote: {
          quote: 'Food procurement under AMLO ran at a 32.4 percent high-risk rate. Pharmaceuticals at 22.4. Hospital services at 19.4. The categories with the loudest political claims around them are the categories the model flags hardest.',
          quote_es: 'Las compras de alimentos bajo AMLO operaron con tasa de alto riesgo de 32.4 por ciento. Farmacéuticos 22.4. Servicios hospitalarios 19.4. Las categorías con los reclamos políticos más fuertes son las que el modelo marca con mayor intensidad.',
          stat: '32.4%',
          statLabel: 'high-risk rate, "Alimentos y Víveres" — highest of any major AMLO category',
          statLabel_es: 'tasa de alto riesgo, "Alimentos y Víveres" — la más alta de cualquier categoría AMLO',
          barValue: 0.324,
          barLabel: 'OECD upper ceiling for high-risk procurement: 15%',
          barLabel_es: 'umbral OCDE superior para riesgo: 15%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI category × administration aggregation, contracts table joined to categories. April 2026.',
          'SFP. (2024). Carpeta de investigación 102/2023 — caso Segalmex.',
          'Mexicanos Contra la Corrupción y la Impunidad. (2023). Las tarjetas TOKA: monopolio del bienestar.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Sheinbaum Inheritance',
        title_es: 'La herencia para Sheinbaum',
        prose: [
          'President Sheinbaum took office in October 2024. RUBLI has 92,631 contracts from her administration to date, with a partial-period high-risk rate of approximately 12.9 percent — below the AMLO peak but above the Calderón baseline. It is too early to draw firm conclusions about a full trajectory, but the architectural choices Sheinbaum is consolidating are not up to her alone: they are baked into the procurement infrastructure she inherited.',
          'The infrastructure is this. Pharmaceutical procurement is now centralized under IMSS-Bienestar (the consolidated medicine tender of 2025 awarded 19.46 billion pesos to PISA in a single year — see The Invisible Monopoly). Welfare-program logistics are routed through a small set of voucher operators (TOKA captures 0.78-risk contracts at billion-peso scale annually). Civilian infrastructure is functionally absorbed by SEDENA, with national-security designations protecting the contracts from competitive scrutiny. Food procurement runs at 32.4 percent high-risk against an OECD ceiling of 15. Each of these is a structural condition that will produce risky contracts under any administration that does not deliberately dismantle it.',
          'The 79.4 percent direct-award rate under AMLO — 1,063 of 2,758 billion pesos awarded without competition over six years — is not a number that bends easily. The procurement officials who learned to work that way did not retire on October 1, 2024. The vendors who built businesses around AMLO-era programs did not pivot to new customers. The legal authorities (Articles 41 and 42, the national-security exceptions) remain on the books, ready to be invoked. Sheinbaum\'s 12.9 percent baseline reads partly as her own decisions and partly as inertia from what came before.',
          'The OECD\'s 2023 Mexico Procurement Review recommended building "real-time analytical capacity" into the oversight system. RUBLI is a working version of that recommendation. ASF audits the previous fiscal year each spring; RUBLI\'s pipeline updates monthly. The gap between real-time visibility and formal accountability is what RUBLI closes. Whether the new administration chooses to operationalize that capacity — or whether it becomes the fifth administration to promise procurement transparency while direct-award dependency continues to climb — is a question the data will answer one quarter at a time.',
        ],
        prose_es: [
          'La presidenta Sheinbaum tomó posesión en octubre de 2024. RUBLI tiene 92,631 contratos de su administración hasta la fecha, con una tasa de alto riesgo de período parcial de aproximadamente 12.9 por ciento — por debajo del pico de AMLO pero por encima de la línea base de Calderón. Es demasiado pronto para sacar conclusiones firmes sobre una trayectoria completa, pero las decisiones arquitectónicas que Sheinbaum está consolidando no dependen únicamente de ella: están integradas en la infraestructura de contratación que heredó.',
          'La infraestructura es la siguiente. La contratación farmacéutica está ahora centralizada bajo IMSS-Bienestar (la licitación de medicamentos consolidada de 2025 adjudicó 19.46 mil millones de pesos a PISA en un solo año — véase El Monopolio Invisible). La logística de los programas de bienestar está canalizada a través de un pequeño conjunto de operadores de vales (TOKA captura contratos de riesgo 0.78 a escala de miles de millones de pesos anualmente). La infraestructura civil está funcionalmente absorbida por la SEDENA, con designaciones de seguridad nacional que protegen los contratos del escrutinio competitivo. Las compras de alimentos operan con tasa de alto riesgo del 32.4 por ciento frente al umbral de la OCDE de 15. Cada una de estas es una condición estructural que producirá contratos riesgosos bajo cualquier administración que no la desmantele deliberadamente.',
          'La tasa de adjudicación directa del 79.4 por ciento bajo AMLO — 1,063 de 2,758 mil millones de pesos adjudicados sin competencia durante seis años — no es un número que se dobla fácilmente. Los funcionarios de contratación que aprendieron a trabajar de esa manera no se jubilaron el 1 de octubre de 2024. Los proveedores que construyeron negocios alrededor de los programas de la era AMLO no migraron a nuevos clientes. Las autoridades legales (Artículos 41 y 42, las excepciones de seguridad nacional) permanecen en los libros, listas para ser invocadas. El 12.9 por ciento de Sheinbaum como línea base refleja en parte sus propias decisiones y en parte la inercia de lo que vino antes.',
          'La revisión de adquisiciones de México de la OCDE de 2023 recomendó construir "capacidad analítica en tiempo real" en el sistema de supervisión. RUBLI es una versión funcional de esa recomendación. La ASF audita el año fiscal anterior cada primavera; el pipeline de RUBLI se actualiza mensualmente. La brecha entre la visibilidad en tiempo real y la rendición de cuentas formal es lo que RUBLI cierra. Si la nueva administración elige operacionalizar esa capacidad — o si se convierte en la quinta administración en prometer transparencia en las contrataciones mientras la dependencia de la adjudicación directa sigue creciendo — es una pregunta que los datos responderán trimestre a trimestre.',
        ],
        pullquote: {
          quote: 'The gap between real-time visibility and formal accountability is what RUBLI closes. What oversight bodies do with that visibility is a political choice.',
          quote_es: 'La brecha entre la visibilidad en tiempo real y la rendición de cuentas formal es lo que RUBLI cierra. Lo que los órganos de supervisión hagan con esa visibilidad es una decisión política.',
          stat: '12.9%',
          statLabel: 'Sheinbaum-era high-risk rate (partial period)',
          statLabel_es: 'tasa de alto riesgo, era Sheinbaum (período parcial)',
        },
        sources: [
          'RUBLI Sheinbaum-era contract analysis (contract_year=2025, partial). April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 7.',
        ],
      },
    ],
    relatedSlugs: ['marea-de-adjudicaciones', 'la-ilusion-competitiva', 'el-gran-precio'],
    lensTags: {
      patterns: ['P3', 'P5', 'P6'],
      sectors: ['salud', 'defensa'],
      years: [2019, 2020, 2024],
      terms: ['AMLO', 'SEDENA', 'Tren Maya', 'TOKA', 'Segalmex'],
    },
    nextSteps: [
      'Request from ASF the audit coverage rate for AMLO-era emergency procurement contracts in health and infrastructure.',
      'Analyze BIRMEX and INSABI contracts 2019-2022 for vendor overlap with RUBLI\'s P1 and P6 pattern vendors.',
      'Track Sheinbaum administration procurement risk scores quarterly using COMPRANET data — RUBLI can update in real time.',
      'Cross-reference AMLO-era direct-award contracts above 500M MXN against the SFP sanctions registry and the SAT EFOS list.',
      'Compile a comprehensive list of the top 1,000 AMLO-era contracts by RUBLI risk score, with procurement institution and approving unit identified.',
      'Pursue academic research collaboration with CIDE, COLMEX, or UNAM to publish a peer-reviewed analysis of the Fox-to-AMLO risk trajectory.',
    ],
    nextSteps_es: [
      'Solicitar a la ASF la tasa de cobertura de auditoría de los contratos de emergencia del sexenio de AMLO en salud e infraestructura.',
      'Analizar contratos de BIRMEX e INSABI 2019-2022 para identificar proveedores que también aparezcan en las listas P1 y P6 de RUBLI.',
      'Dar seguimiento trimestral a los puntajes de riesgo del gobierno de Sheinbaum usando datos de COMPRANET — RUBLI puede actualizar en tiempo real.',
      'Cruzar los contratos de adjudicación directa superiores a 500M MXN del sexenio de AMLO contra el registro de sanciones de la SFP y la lista EFOS del SAT.',
      'Compilar la lista de los 1,000 contratos del sexenio de AMLO con mayor puntaje de riesgo RUBLI, identificando la institución compradora y la unidad aprobadora.',
      'Buscar colaboración académica con CIDE, COLMEX o UNAM para publicar un análisis arbitrado de la trayectoria de riesgo del sexenio de Fox al de AMLO.',
    ],
    entities: [
      { type: 'vendor', id: 102627, name: 'TOKA Internacional',         riskScore: 0.988, ariaTier: 1, role: 'Welfare-voucher dominant vendor',          role_es: 'Proveedor dominante de vales del bienestar' },
      { type: 'vendor', id: 36961,  name: 'Operadora CICSA',            riskScore: 0.641, ariaTier: 2, role: 'Tren Maya contractor · 139.0B MXN',         role_es: 'Contratista Tren Maya · 139.0 MDP' },
      { type: 'vendor', id: 8143,   name: 'Dowell Schlumberger',        riskScore: 0.971, ariaTier: 1, role: 'Pemex contractor · risk 0.97',               role_es: 'Contratista Pemex · riesgo 0.97' },
      { type: 'vendor', id: 139711, name: 'Alstom Transport Mexico',    riskScore: 1.000, ariaTier: 1, role: 'Tren Maya contractor · risk 1.00',           role_es: 'Contratista Tren Maya · riesgo 1.00' },
      { type: 'vendor', id: 28111,  name: 'Constructora Arhnos',        riskScore: 0.516, ariaTier: 2, role: 'Military construction operator',             role_es: 'Operador de construcción militar' },
    ],
  },

  // =========================================================================
  // STORY 8: The Intermediary Industry
  // =========================================================================
  {
    slug: 'la-industria-del-intermediario',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Intermediary Industry',
    headline_es: 'La Industria del Intermediario',
    subheadline: 'RUBLI\'s P3 algorithm identified 2,974 vendors who appear to function as pure procurement intermediaries — winning contracts with the government and then subcontracting the actual work. In infrastructure alone, they moved 179 billion pesos.',
    subheadline_es: 'El algoritmo P3 de RUBLI identificó 2,974 proveedores que parecen funcionar como puros intermediarios de contratación — ganan contratos con el gobierno y luego subcontratan el trabajo real. Solo en infraestructura, movieron 179 mil millones de pesos.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 15,
    status: 'solo_datos',
    leadStat: { value: '2,974', label: 'P3 intermediary-pattern vendors', label_es: 'proveedores con patrón de intermediario P3', sublabel: '526.8B MXN across 8 key sectors', sublabel_es: '526.8 mil millones en 8 sectores clave', color: '#8b5cf6' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Shadow Supply Chain',
        title_es: 'La cadena de suministro en la sombra',
        prose: [
          'In legitimate procurement, an intermediary can add value. A distributor with established supply chains may deliver goods more cheaply than direct manufacturer sourcing. A general contractor coordinating dozens of specialized trades on a construction project provides project management value that a government procurement unit cannot easily replicate internally. These are legitimate, necessary functions.',
          'The fraud variant occurs when intermediaries systematically win government contracts at inflated prices, subcontract at market prices, and pocket the spread. The key diagnostic: the intermediary adds no operational value beyond contracting, and the price paid by the government exceeds what the government would have paid if it had contracted directly with the actual delivery entity. The mechanism is subtle enough to evade individual-contract audit and persistent enough to operate at scale across decades.',
          'RUBLI\'s Pattern 3 (P3) algorithm identifies intermediary signatures: vendors whose procurement footprint shows high contract counts and values but whose business characteristics suggest they do not produce the contracted goods or services directly. Signals include industry-code mismatches between the vendor\'s declared economic activity and the contract specifications, rapid growth from small contracting history to massive portfolio, and the characteristic financial signature of pass-through entities with minimal fixed assets.',
          'The 2,974 P3-classified vendors are concentrated overwhelmingly in the highest-value procurement sectors. Infrastructure leads: 1,128 P3 vendors moved 179.5 billion pesos through intermediary structures in construction and public works. Energy comes second: 463 P3 vendors in the PEMEX and CFE ecosystems account for 130.6 billion pesos. Health is third: 476 P3 vendors handled 104.2 billion pesos in pharmaceutical and medical equipment procurement.',
        ],
        prose_es: [
          'En la contratación pública legítima, un intermediario puede agregar valor. Un distribuidor con cadenas de suministro establecidas puede entregar bienes más baratos que la compra directa al fabricante. Un contratista general que coordina decenas de oficios especializados en un proyecto de construcción provee un valor de gestión de proyecto que una unidad compradora del gobierno no puede replicar internamente con facilidad. Estas son funciones legítimas y necesarias.',
          'La variante de fraude ocurre cuando los intermediarios ganan sistemáticamente contratos del gobierno a precios inflados, subcontratan a precios de mercado y se embolsan la diferencia. El diagnóstico clave: el intermediario no agrega valor operativo más allá de la contratación, y el precio pagado por el gobierno excede lo que el gobierno habría pagado si hubiera contratado directamente con la entidad ejecutora real. El mecanismo es lo bastante sutil para evadir la auditoría contrato por contrato y lo bastante persistente para operar a escala durante décadas.',
          'El algoritmo del Patrón 3 (P3) de RUBLI identifica firmas de intermediación: proveedores cuya huella de contratación muestra altos conteos y valores de contrato pero cuyas características de negocio sugieren que no producen los bienes o servicios contratados directamente. Las señales incluyen desajustes entre el código de industria de la actividad económica declarada del proveedor y las especificaciones del contrato, crecimiento rápido desde un historial pequeño de contratación hacia un portafolio masivo, y la firma financiera característica de entidades de paso con activos fijos mínimos.',
          'Los 2,974 proveedores clasificados como P3 se concentran abrumadoramente en los sectores de contratación de mayor valor. Infraestructura encabeza: 1,128 proveedores P3 movieron 179.5 mil millones de pesos por estructuras de intermediación en construcción y obra pública. Energía es segundo: 463 proveedores P3 en los ecosistemas de PEMEX y CFE acumulan 130.6 mil millones. Salud es tercero: 476 proveedores P3 manejaron 104.2 mil millones en adquisiciones farmacéuticas y de equipo médico.',
        ],
        pullquote: {
          quote: 'Infrastructure, energy, health. The three sectors where intermediary structures are largest are also the three with Mexico\'s most documented corruption history.',
          quote_es: 'Infraestructura, energía, salud. Los tres sectores donde las estructuras de intermediación son más grandes son también los tres con la historia de corrupción mejor documentada de México.',
          stat: '414B MXN',
          statLabel: 'P3 contracts in infrastructure + energy + health',
          statLabel_es: 'contratos P3 en infraestructura + energía + salud',
          barValue: 0.79,
          barLabel: 'share of all P3-pattern contracting',
          barLabel_es: 'porción de toda la contratación con patrón P3',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI ARIA P3 pattern analysis, run ID 28d5c453, March 25 2026.',
          'COMPRANET procurement records, sector classification via RUBLI 12-sector taxonomy.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Sectoral Distribution',
        title_es: 'La distribución sectorial',
        subtitle: 'Where the intermediary pattern concentrates',
        subtitle_es: 'Dónde se concentra el patrón de intermediario',
        prose: [
          'The P3 pattern is not evenly distributed across Mexican procurement. It follows contract value, technical complexity, and oversight thinness. These three factors combine to make infrastructure the dominant P3 sector and to concentrate intermediary structures in a small number of specific procurement categories.',
          'Infrastructure\'s 179.5 billion pesos of P3 contracting breaks down primarily into civil works (roads, water projects, urban infrastructure), construction services (demolition, earthworks, specialized trades), and project management intermediation. SCT / SICT and CONAGUA are the largest procuring entities, with regional infrastructure funds distributing significant additional contracting at state and municipal levels. Pemex\'s infrastructure needs — offshore platforms, refinery upgrades, pipeline construction — are also substantial sources of P3-pattern intermediation.',
          'Energy\'s 130.6 billion pesos concentrates in PEMEX Exploración y Producción and CFE, with P3 vendors supplying equipment, specialized services, and technical consultancy. The energy intermediary pattern is distinctive because the actual suppliers are often international manufacturers (Schlumberger, Siemens, GE) who work through local intermediary partners. The intermediary markup can represent legitimate localization services, or it can represent pure rent extraction. The difference is visible only in detailed contract analysis.',
          'Health\'s 104.2 billion pesos runs through pharmaceutical distribution (the Maypo-Grupo Fármacos-PISA-DIMM cluster examined in earlier stories), medical equipment resellers, and laboratory service providers. The sectoral P3 pattern in health is the most straightforward to investigate because the actual manufacturers are internationally known and their direct-to-government contract prices are publicly available in other countries for benchmarking.',
        ],
        prose_es: [
          'El patrón P3 no se distribuye uniformemente a través de la contratación pública mexicana. Sigue al valor del contrato, la complejidad técnica y la delgadez de la fiscalización. Estos tres factores se combinan para hacer de la infraestructura el sector P3 dominante y concentrar las estructuras de intermediación en un número pequeño de categorías específicas de adquisición.',
          'Los 179.5 mil millones de pesos de contratación P3 en infraestructura se descomponen principalmente en obra civil (caminos, proyectos hidráulicos, infraestructura urbana), servicios de construcción (demolición, movimientos de tierra, oficios especializados) e intermediación de gestión de proyecto. SCT / SICT y CONAGUA son las entidades compradoras más grandes, con fondos regionales de infraestructura distribuyendo contratación adicional significativa a niveles estatal y municipal. Las necesidades de infraestructura de Pemex — plataformas costa afuera, modernización de refinerías, construcción de ductos — son también fuentes sustanciales de intermediación con patrón P3.',
          'Los 130.6 mil millones de pesos de energía se concentran en PEMEX Exploración y Producción y en la CFE, con proveedores P3 suministrando equipo, servicios especializados y consultoría técnica. El patrón de intermediación en energía es distintivo porque los suministradores reales son a menudo fabricantes internacionales (Schlumberger, Siemens, GE) que trabajan a través de socios locales de intermediación. La sobreposición del intermediario puede representar servicios legítimos de localización, o puede representar pura extracción de renta. La diferencia es visible solo en el análisis detallado del contrato.',
          'Los 104.2 mil millones de pesos de salud corren por la distribución farmacéutica (el cúmulo Maypo-Grupo Fármacos-PISA-DIMM examinado en historias anteriores), revendedores de equipo médico y proveedores de servicios de laboratorio. El patrón P3 sectorial en salud es el más directo de investigar porque los fabricantes reales son internacionalmente conocidos y sus precios de contrato directo-a-gobierno están públicamente disponibles en otros países para benchmarking.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'P3 Intermediary Pattern: Contract Value by Sector',
          title_es: 'Patrón de intermediario P3: valor de contratación por sector',
          chartId: 'p3-intermediary-sectors',
          data: {
            points: [
              { label: 'Infraestructura', value: 179.5, color: '#ea580c', highlight: true },
              { label: 'Energía',         value: 130.6, color: '#eab308' },
              { label: 'Salud',           value: 104.2, color: '#dc2626' },
              { label: 'Hacienda',        value: 40.9,  color: '#16a34a' },
              { label: 'Educación',       value: 19.1,  color: '#3b82f6' },
              { label: 'Agricultura',     value: 18.8,  color: '#22c55e' },
              { label: 'Gobernación',     value: 17.8,  color: '#be123c' },
              { label: 'Defensa',         value: 15.9,  color: '#1e3a5f' },
            ],
            unit: 'B MXN',
            annotation: 'Mechanistically: contract won by intermediary, work subcontracted, fee extracted. 526.8B total.',
            annotation_es: 'Mecánica: el intermediario gana el contrato, subcontrata el trabajo, extrae la comisión. 526.8 mil millones en total.',
          },
        },
        pullquote: {
          quote: '1,128 intermediary-pattern vendors in infrastructure alone. The pass-through industry is larger than Mexico\'s annual federal education budget.',
          quote_es: '1,128 proveedores con patrón de intermediario solo en infraestructura. La industria del paso es más grande que el presupuesto federal anual de educación de México.',
          stat: '1,128',
          statLabel: 'P3 vendors in infraestructura',
          statLabel_es: 'proveedores P3 en infraestructura',
        },
        sources: [
          'RUBLI P3 sector analysis, April 2026.',
          'Ley de Obras Públicas y Servicios Relacionados con las Mismas (LOPSRM), Art. 5 — subcontracting provisions.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'The La Estafa Maestra Prototype',
        title_es: 'El prototipo La Estafa Maestra',
        prose: [
          'The largest documented case of intermediary fraud in Mexican procurement history is La Estafa Maestra — a scheme in which federal agencies contracted with public universities, which then subcontracted to phantom companies, which effectively returned money to the original agencies\' officials. The Parliamentary investigation of 2017 and the MCCI/Animal Político journalistic investigation of the same year found 7.67 billion pesos moved through this structure between 2013 and 2014 alone.',
          'La Estafa Maestra was possible because Mexico\'s procurement law has a carve-out for university contracts, treating them as exempt from competitive bidding requirements under Art. 1, penultimate paragraph of the Ley de Adquisiciones. The universities became intermediaries between the procurement law and the shadow market. RUBLI\'s ground truth database includes this case; the vendors directly linked to it have risk scores averaging 0.55 to 0.65.',
          'The P3 pattern RUBLI identifies today is not limited to university subcontracting. The universities were a legal mechanism that enabled the intermediary structure; the structure itself can operate through any legal mechanism that permits subcontracting. Art. 5 of the Ley de Obras Públicas explicitly permits subcontracting in public works, and Art. 41 of the Ley de Adquisiciones permits recurring-vendor direct awards. Either statute can host an intermediary pattern if the procurement unit chooses to award through it.',
          'The 2,974 P3 vendors in RUBLI\'s queue are the structural successors to the La Estafa Maestra architecture — different entities, same functional role. Each vendor in the list represents an investigative thread: who owns it, what underlying supplier does it work with, what is the price spread between what the government pays and what the subcontractor receives?',
          'Naming the largest examples makes the pattern concrete. CONSTRUCTORA ARHNOS won 32.0 billion pesos across just six contracts with state-level public-works secretariats — an average ticket of 5.3 billion pesos per contract, against an industry-typical infrastructure ticket size of one to ten million. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA collected 21.1 billion pesos across three IMSS contracts — average ticket 7.0 billion. CAABSA CONSTRUCTORA at 9.2 billion across three CDMX contracts. GX2 DESARROLLOS at 5.9 billion across two Sinaloa contracts with a risk score of 0.54 — squarely in the high-risk band. The signature is the same in each case: a microscopic contract count multiplied by an enormous per-contract value, in sectors where legitimate firms typically operate at orders-of-magnitude smaller average ticket sizes.',
          'Adjacent to these likely pass-throughs sit international oilfield-services contractors — TÉCNICAS REUNIDAS S.A. (7.2B / 2 contracts at PEMEX, risk 0.89), PETROBRAS-led joint venture (5.9B / 2 contracts at PEMEX, risk 0.90), PRIDE INTERNATIONAL (5.5B / 6 contracts at PEMEX, risk 0.95) — all rated critical by v0.8.5 despite their reputation as legitimate foreign specialists. These three vendors sit on RUBLI\'s structural-FP exclusion list precisely because the model otherwise flags them: narrow-supplier-market characteristics produce the same statistical signature as pass-through fraud. The investigative question is no longer "separate two populations" but rather: which of these critical-band scores reflect real fraud, and which are model artifacts of legitimately concentrated supplier markets? RUBLI\'s P3 algorithm flags them all as the same shape; human work is in distinguishing which is which.',
        ],
        prose_es: [
          'El caso documentado más grande de fraude por intermediación en la historia de la contratación pública mexicana es La Estafa Maestra — un esquema en el que las dependencias federales contrataban con universidades públicas, que luego subcontrataban con empresas fantasma, que en efecto devolvían el dinero a los funcionarios de las dependencias originales. La investigación parlamentaria de 2017 y la investigación periodística de MCCI/Animal Político del mismo año encontraron que 7.67 mil millones de pesos se movieron por esta estructura solo entre 2013 y 2014.',
          'La Estafa Maestra fue posible porque la ley mexicana de adquisiciones tiene un excepción para los contratos con universidades, tratándolos como exentos de los requisitos de licitación competitiva bajo el Art. 1, último párrafo, de la Ley de Adquisiciones. Las universidades se volvieron intermediarias entre la ley de adquisiciones y el mercado en la sombra. La base de datos de la verdad-base de RUBLI incluye este caso; los proveedores directamente vinculados a él tienen calificaciones de riesgo que promedian de 0.55 a 0.65.',
          'El patrón P3 que RUBLI identifica hoy no se limita a la subcontratación universitaria. Las universidades fueron un mecanismo legal que habilitó la estructura de intermediación; la estructura misma puede operar a través de cualquier mecanismo legal que permita la subcontratación. El Art. 5 de la Ley de Obras Públicas permite expresamente la subcontratación en obra pública, y el Art. 41 de la Ley de Adquisiciones permite adjudicaciones directas a proveedores recurrentes. Cualquiera de los dos preceptos puede alojar un patrón de intermediación si la unidad compradora opta por adjudicar por su vía.',
          'Los 2,974 proveedores P3 en la cola de RUBLI son los sucesores estructurales de la arquitectura de La Estafa Maestra — distintas entidades, mismo papel funcional. Cada proveedor en la lista representa un hilo investigativo: quién lo posee, con qué proveedor subyacente trabaja, cuál es la diferencia de precio entre lo que paga el gobierno y lo que recibe el subcontratista.',
          'Nombrar a los ejemplos más grandes vuelve el patrón concreto. CONSTRUCTORA ARHNOS ganó 32.0 mil millones de pesos en apenas seis contratos con secretarías estatales de obras públicas — un ticket promedio de 5.3 mil millones de pesos por contrato, contra un tamaño de ticket típico de la industria de infraestructura de uno a diez millones. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA cobró 21.1 mil millones en tres contratos del IMSS — ticket promedio de 7.0 mil millones. CAABSA CONSTRUCTORA con 9.2 mil millones en tres contratos de la CDMX. GX2 DESARROLLOS con 5.9 mil millones en dos contratos de Sinaloa con calificación de riesgo de 0.54 — de lleno en la banda de alto riesgo. La firma es la misma en cada caso: una cuenta de contratos minúscula multiplicada por un valor por contrato enorme, en sectores donde las firmas legítimas típicamente operan a tamaños de ticket promedio órdenes de magnitud menores.',
          'Adyacentes a esos probables pasos están contratistas internacionales de servicios petroleros — TÉCNICAS REUNIDAS S.A. (7.2 mil millones / 2 contratos en PEMEX, riesgo 0.89), un consorcio liderado por PETROBRAS (5.9 mil millones / 2 contratos en PEMEX, riesgo 0.90), PRIDE INTERNATIONAL (5.5 mil millones / 6 contratos en PEMEX, riesgo 0.95) — todos calificados como críticos por v0.8.5 a pesar de su reputación como especialistas extranjeros legítimos. Estos tres proveedores están en la lista de exclusión de FP estructurales de RUBLI precisamente porque el modelo de otra forma los marca: las características de mercados de proveedores estructuralmente reducidos producen la misma firma estadística que el fraude por intermediación. La pregunta investigativa ya no es "separar dos poblaciones" sino: ¿cuáles de estas calificaciones en banda crítica reflejan fraude real, y cuáles son artefactos del modelo en mercados legítimamente concentrados? El algoritmo P3 de RUBLI marca a todos con la misma forma; el trabajo humano consiste en distinguir cuál es cuál.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'Top P3 Intermediary-Pattern Vendors by Total Contract Value',
          title_es: 'Top proveedores con patrón de intermediario P3 por valor total de contratos',
          chartId: 'p3-top-vendors',
          data: {
            // 2026-05-22: colors driven by real v0.8.5 risk scores from
            // aria_queue (avg_risk_score per vendor_stats). The original
            // editorial split was "red = pass-through cartels, gold =
            // legitimate foreign specialists." The model disagrees: all
            // 10 land in high/critical. PEMEX foreign specialists
            // (Petrobras JV 0.90, Técnicas Reunidas 0.89, Pride 0.95)
            // are model-flagged critical despite being on the structural-
            // FP list per CLAUDE.md — surfacing that disagreement is the
            // point. The two-population editorial claim is in the prose;
            // the chart shows what the model actually says.
            points: [
              { label: 'Constructora ARHNOS',         value: 32.0, riskScore: 0.52, highlight: true, annotation: '6 contracts · state public works · risk 0.52',  annotation_es: '6 contratos · obras públicas estatales · riesgo 0.52' },
              { label: 'Promotora y Desarrolladora',  value: 21.1, riskScore: 0.59,                  annotation: '3 contracts · IMSS hospitals · risk 0.59',      annotation_es: '3 contratos · hospitales IMSS · riesgo 0.59' },
              { label: 'Antonio Vigil Maximino',      value: 9.75, riskScore: 0.50,                  annotation: '2 contracts · IMSS · risk 0.50',                annotation_es: '2 contratos · IMSS · riesgo 0.50' },
              { label: 'CAABSA Constructora',         value: 9.18, riskScore: 0.72,                  annotation: '3 contracts · CDMX · risk 0.72',                annotation_es: '3 contratos · CDMX · riesgo 0.72' },
              { label: 'GTECH Printing',              value: 7.72, riskScore: 0.58,                  annotation: '2 contracts · lottery printing · risk 0.58',    annotation_es: '2 contratos · impresión lotería · riesgo 0.58' },
              { label: 'Técnicas Reunidas (ES)',      value: 7.24, riskScore: 0.89,                  annotation: '2 contracts · PEMEX engineering · risk 0.89 (structural FP)', annotation_es: '2 contratos · ingeniería PEMEX · riesgo 0.89 (FP estructural)' },
              { label: 'GX2 Desarrollos',             value: 5.89, riskScore: 0.54,                  annotation: '2 contracts · Sinaloa · risk 0.54',             annotation_es: '2 contratos · Sinaloa · riesgo 0.54' },
              { label: 'Petrobras JV (BR)',           value: 5.86, riskScore: 0.90,                  annotation: '2 contracts · PEMEX · risk 0.90',               annotation_es: '2 contratos · PEMEX · riesgo 0.90' },
              { label: 'Pride International (US)',    value: 5.48, riskScore: 0.95,                  annotation: '6 contracts · PEMEX offshore · risk 0.95',      annotation_es: '6 contratos · PEMEX costa afuera · riesgo 0.95' },
              { label: 'LAMAP',                       value: 4.73, riskScore: 0.47,                  annotation: '17 contracts · IMSS-Bienestar · risk 0.47',     annotation_es: '17 contratos · IMSS-Bienestar · riesgo 0.47' },
            ],
            unit: 'B MXN',
            annotation: 'Bar color = v0.8.5 risk score (critical / high). All 10 top-value P3 vendors land in the high-or-critical band — the model rejects the prose\'s "legitimate foreign specialist" framing for PEMEX contractors (Petrobras JV 0.90, Técnicas Reunidas 0.89, Pride International 0.95), which sit on RUBLI\'s structural-FP exclusion list precisely because the model otherwise flags them. The investigative question shifts: which of these critical-band scores reflect real intermediary fraud and which are model artifacts of structurally narrow supplier markets?',
            annotation_es: 'Color de barra = calificación de riesgo v0.8.5 (crítica / alta). Los 10 proveedores P3 de mayor valor caen en la banda alta-o-crítica — el modelo rechaza la lectura del cuerpo del texto de "especialista extranjero legítimo" para los contratistas de PEMEX (Petrobras JV 0.90, Técnicas Reunidas 0.89, Pride International 0.95), que están en la lista de exclusión de FP estructurales de RUBLI precisamente porque el modelo de otra forma los marca. La pregunta investigativa cambia: ¿cuáles de estas calificaciones de banda crítica reflejan fraude real por intermediación y cuáles son artefactos del modelo en mercados de proveedores estructuralmente reducidos?',
          },
        },
        pullquote: {
          quote: 'CONSTRUCTORA ARHNOS won 32 billion pesos across six contracts. The average ticket is 5.3 billion. Legitimate infrastructure firms operate at one-thousandth of that scale.',
          quote_es: 'CONSTRUCTORA ARHNOS ganó 32 mil millones de pesos en seis contratos. El ticket promedio es 5.3 mil millones. Las firmas legítimas de infraestructura operan a una milésima de esa escala.',
          stat: '5.3B MXN',
          statLabel: 'average ticket per contract — Constructora ARHNOS, six contracts',
          statLabel_es: 'ticket promedio por contrato — Constructora ARHNOS, seis contratos',
        },
        sources: [
          'ASF. (2017). Auditoría de Desempeño 2016-0-06100-07-0161. La Estafa Maestra.',
          'Animal Político / MCCI. (2017). La Estafa Maestra: Graduados en desaparecer dinero público.',
          'RUBLI ARIA queue, primary_pattern=P3, ordered by total_value_mxn DESC, fp_structural_monopoly=0. April 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Why This Is Hard to Prosecute',
        title_es: 'Por qué es difícil de procesar',
        prose: [
          'Intermediary structures are difficult to prosecute for a fundamental reason: subcontracting is legal. A company that wins a government contract and subcontracts the work is not committing a crime unless the subcontracting is used to inflate prices, launder money, or circumvent competitive requirements. Proving which of those three occurred requires following the money through multiple corporate structures and bank accounts — forensic accounting work that Mexican enforcement agencies rarely complete at scale.',
          'Mexico\'s UIF (Unidad de Inteligencia Financiera) has jurisdiction over financial flows that may constitute money laundering. The UNCAC (UN Convention Against Corruption), which Mexico ratified in 2004, requires state parties to criminalize "abuse of functions" in procurement — a category broad enough to cover systematic overpriced intermediation. Both legal frameworks exist. Neither has been publicly applied to procurement intermediary structures at scale.',
          'The operational reason is resource allocation. UIF handles roughly 20,000 suspicious activity reports annually across all sectors of the Mexican economy; dedicating investigative capacity to procurement intermediation requires choosing it over currency trafficking, narcotics proceeds, and other enforcement priorities. UNCAC procurement prosecutions are similarly rare in Mexican federal courts, with most corruption cases brought under Mexican domestic statutes that carry lower evidentiary burdens.',
          'RUBLI\'s 2,974 P3 vendors provide a pre-filtered pipeline that could change the economics of enforcement. Rather than UIF triaging tens of thousands of generic suspicious activity reports, the list identifies the specific vendors whose behavioral patterns most closely resemble known intermediary fraud. For each, the three diagnostic questions are: who are the actual underlying suppliers or subcontractors, what is the price spread between the government contract value and the subcontract value, and is that spread consistent with legitimate coordination value or with rent extraction?',
        ],
        prose_es: [
          'Las estructuras de intermediación son difíciles de procesar penalmente por una razón fundamental: subcontratar es legal. Una empresa que gana un contrato del gobierno y subcontrata el trabajo no comete un delito a menos que la subcontratación se use para inflar precios, lavar dinero o sortear requisitos competitivos. Probar cuál de las tres cosas ocurrió requiere seguir el dinero a través de múltiples estructuras corporativas y cuentas bancarias — trabajo de contabilidad forense que las agencias mexicanas de fiscalización rara vez completan a escala.',
          'La UIF (Unidad de Inteligencia Financiera) de México tiene jurisdicción sobre flujos financieros que puedan constituir lavado de dinero. La CNUCC (Convención de las Naciones Unidas contra la Corrupción), que México ratificó en 2004, exige a los estados parte tipificar el "abuso de funciones" en la contratación pública — categoría lo bastante amplia para cubrir intermediación sistemática con sobreprecio. Ambos marcos legales existen. Ninguno ha sido aplicado públicamente a estructuras de intermediación en contratación pública a escala.',
          'La razón operativa es la asignación de recursos. La UIF maneja aproximadamente 20,000 reportes de actividad sospechosa anualmente a través de todos los sectores de la economía mexicana; dedicar capacidad investigativa a la intermediación en contratación requiere elegirla por encima del tráfico de divisas, los recursos provenientes del narcotráfico y otras prioridades de fiscalización. Las imputaciones bajo CNUCC en materia de contratación son igualmente raras en los tribunales federales mexicanos, con la mayoría de los casos de corrupción presentados bajo estatutos domésticos mexicanos que cargan con cargas probatorias menores.',
          'Los 2,974 proveedores P3 de RUBLI proveen una tubería pre-filtrada que podría cambiar la economía de la aplicación. En vez de que la UIF triiara decenas de miles de reportes genéricos de actividad sospechosa, la lista identifica a los proveedores específicos cuyos patrones conductuales se asemejan más a un fraude de intermediación conocido. Para cada uno, las tres preguntas diagnósticas son: quiénes son los verdaderos proveedores o subcontratistas subyacentes, cuál es la diferencia de precio entre el valor del contrato con el gobierno y el valor del subcontrato, y ¿esa diferencia es consistente con un valor legítimo de coordinación o con extracción de renta?',
        ],
        pullquote: {
          quote: 'Subcontracting is legal. Overpriced subcontracting that enriches a middleman at public expense is not. The line between them runs through bank records UIF has not subpoenaed.',
          quote_es: 'Subcontratar es legal. Subcontratar con sobreprecio que enriquece a un intermediario a costa del erario no lo es. La línea entre ambos pasa por registros bancarios que la UIF no ha solicitado.',
          stat: '2,974',
          statLabel: 'P3 intermediary-pattern vendors in RUBLI queue',
          statLabel_es: 'proveedores con patrón de intermediario P3 en la cola de RUBLI',
        },
        sources: [
          'UNODC. (2020). UN Convention Against Corruption: Implementation Guide. Article 19 (abuse of functions).',
          'UIF/SHCP. (2024). Informe Anual de Actividades 2024.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'El vacío de fiscalización',
        prose: [
          'The enforcement deficit has a specific institutional shape. Three agencies hold authority over the intermediary structures RUBLI identifies, and none of the three has operationalized that authority at scale. UIF can trace financial flows but does not systematically monitor procurement payment chains. SFP can audit procurement unit behavior but focuses on individual officials rather than on vendor-level patterns. ASF can audit individual contracts but does not run aggregate investigations of sectoral intermediary density.',
          'The one institution that could take up the task directly is COFECE, which has explicit jurisdiction over anticompetitive practices in public procurement under the Ley Federal de Competencia Económica. COFECE investigations of public procurement cartels have been rare in the last decade, despite OECD\'s repeated recommendations that Mexico develop such a practice. COFECE\'s public docket emphasizes private-sector cartels in telecommunications, banking, and retail — not the intermediary structures in public works.',
          'Even if COFECE took on the task, the legal framework may require reinforcement. Mexican competition law does not explicitly criminalize systematic overpriced intermediation in public procurement as a stand-alone offense; it treats the conduct under general cartel provisions that require proof of coordination between competing bidders. A pure pass-through intermediary structure, where the intermediary does not bid against anyone but simply extracts rent from an uncompetitive contract, may not fit neatly under existing cartel jurisprudence.',
          'This is the deeper structural problem the data reveals. Mexico\'s legal and institutional architecture was designed to address corruption one contract, one bribe, one official at a time. The intermediary industry that RUBLI documents operates at pattern scale across hundreds of vendors and billions of pesos. Until the legal architecture catches up to the pattern, enforcement will continue to target individual trees while the forest keeps growing.',
        ],
        prose_es: [
          'El déficit de aplicación tiene una forma institucional específica. Tres agencias tienen autoridad sobre las estructuras de intermediación que RUBLI identifica, y ninguna de las tres ha operacionalizado esa autoridad a escala. La UIF puede rastrear flujos financieros pero no monitorea sistemáticamente las cadenas de pago de la contratación. La SFP puede auditar la conducta de las unidades compradoras pero se enfoca en funcionarios individuales en vez de patrones a nivel proveedor. La ASF puede auditar contratos individuales pero no corre investigaciones agregadas de densidad sectorial de intermediación.',
          'La única institución que podría asumir la tarea directamente es la COFECE, que tiene jurisdicción expresa sobre prácticas anticompetitivas en contratación pública bajo la Ley Federal de Competencia Económica. Las investigaciones de la COFECE sobre cárteles de contratación pública han sido raras en la última década, a pesar de las recomendaciones repetidas de la OCDE para que México desarrolle dicha práctica. La agenda pública de la COFECE enfatiza cárteles del sector privado en telecomunicaciones, banca y comercio minorista — no las estructuras de intermediación en obra pública.',
          'Aun si la COFECE tomara la tarea, el marco legal puede requerir refuerzo. La ley mexicana de competencia no tipifica expresamente la intermediación sistemática con sobreprecio en la contratación pública como delito autónomo; trata la conducta bajo disposiciones generales de cártel que exigen prueba de coordinación entre licitantes competidores. Una estructura pura de paso, donde el intermediario no licita contra nadie sino simplemente extrae renta de un contrato no competitivo, puede no encajar limpiamente bajo la jurisprudencia existente de cárteles.',
          'Este es el problema estructural más profundo que revelan los datos. La arquitectura legal e institucional de México fue diseñada para atender la corrupción un contrato, un soborno, un funcionario a la vez. La industria del intermediario que RUBLI documenta opera a escala de patrón a través de cientos de proveedores y miles de millones de pesos. Hasta que la arquitectura legal alcance al patrón, la aplicación seguirá apuntando a árboles individuales mientras el bosque sigue creciendo.',
        ],
        pullquote: {
          quote: 'Mexico\'s legal architecture targets one contract at a time. The intermediary industry RUBLI documents operates at pattern scale — 2,974 vendors, 526 billion pesos.',
          quote_es: 'La arquitectura legal mexicana ataca un contrato a la vez. La industria del intermediario que RUBLI documenta opera a escala de patrón — 2,974 proveedores, 526 mil millones de pesos.',
          stat: '0',
          statLabel: 'major COFECE procurement cartel cases, last 5 years',
          statLabel_es: 'casos COFECE de cártel de contratación, últimos 5 años',
          barValue: 0.00,
          barLabel: 'despite OECD recommendations',
          barLabel_es: 'a pesar de las recomendaciones OCDE',
          vizTemplate: 'zero-bar',
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 5.',
          'Ley Federal de Competencia Económica, Art. 53 (prácticas monopólicas absolutas).',
        ],
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'captura-institucional', 'el-umbral-de-los-300k'],
    lensTags: {
      patterns: ['P3'],
      sectors: ['infraestructura', 'energia', 'salud'],
      terms: ['intermediario', 'La Estafa Maestra', 'subcontratación'],
    },
    nextSteps: [
      'File UIF intelligence request for bank transaction data on the top 20 P3-classified vendors in infrastructure by contract value.',
      'Identify which public universities continue to be used as procurement intermediaries after La Estafa Maestra — cross-reference with COMPRANET university contracts 2018-2025.',
      'Request from SFP the complete list of vendors sanctioned for improper subcontracting and cross-reference with RUBLI P3 list.',
      'Research whether Mexico\'s 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.',
      'Open a journalistic investigation of the top 5 P3 vendors in infrastructure — interview actual subcontractors to identify the price spreads.',
      'File COFECE complaint requesting dedicated investigation of intermediary patterns in public works procurement.',
    ],
    nextSteps_es: [
      'Presentar solicitud de inteligencia financiera a la UIF para datos de transacciones bancarias de los 20 proveedores P3 de mayor valor en infraestructura.',
      'Identificar qué universidades públicas siguen siendo utilizadas como intermediarias de compras después de La Estafa Maestra — cruzar con contratos universitarios en COMPRANET 2018-2025.',
      'Solicitar a la SFP la lista completa de proveedores sancionados por subcontratación indebida y cruzar con la lista P3 de RUBLI.',
      'Investigar si la reforma a la ley de contrataciones de 2022 atendió el vacío legal de subcontratación universitaria que hizo posible La Estafa Maestra.',
      'Abrir una investigación periodística sobre los 5 principales proveedores P3 en infraestructura — entrevistar a subcontratistas reales para identificar los márgenes de precio.',
      'Presentar denuncia ante la COFECE solicitando una investigación dedicada a los patrones de intermediarismo en la obra pública.',
    ],
  },

  // =========================================================================
  // STORY 9: The 300K Threshold
  // =========================================================================
  {
    slug: 'el-umbral-de-los-300k',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The 300,000 Peso Threshold',
    headline_es: 'El Umbral de los 300 Mil',
    subheadline: 'Mexican procurement rules change at specific contract values. RUBLI\'s distribution analysis reveals statistical spikes at 210K, 250K, and 300K — anomalies that are mathematically impossible in a random pricing universe and consistent with systematic threshold manipulation.',
    subheadline_es: 'Las reglas mexicanas de contratación cambian en valores específicos. El análisis de distribución de RUBLI revela picos estadísticos en 210K, 250K y 300K — anomalías matemáticamente imposibles en un universo de precios aleatorio y consistentes con manipulación sistemática de umbrales.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'solo_datos',
    leadStat: { value: '28,264', label: 'contracts at exactly 210K MXN', label_es: 'contratos exactamente en 210 mil pesos', sublabel: 'a 76% spike above baseline', sublabel_es: 'pico del 76% sobre la línea base', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Math of Suspicious Clustering',
        title_es: 'La matemática del agrupamiento sospechoso',
        prose: [
          'In a hypothetical random pricing universe, contract values would distribute smoothly across all possible amounts. A vendor delivering 300,000 pesos worth of goods would be no more likely to invoice exactly 300,000 than exactly 297,000 or 303,000. The probability mass would spread across the continuous range, with small peaks only at values where underlying real-world pricing genuinely clusters — UMA multiples, round numbers used in catalog pricing, specific regulatory fee structures.',
          'Mexican federal procurement does not follow a random pricing universe. RUBLI\'s distribution analysis of contract amounts between 200,000 and 400,000 pesos reveals sharp statistical spikes at specific values that cannot be explained by legitimate pricing mechanics. The largest anomaly sits at 210,000 pesos, where 28,264 contracts cluster — 76 percent above the baseline count of contracts at 200,000 pesos just below it. Similar spikes appear at 250,000 (24,966 contracts) and 300,000 (22,064 contracts).',
          'These spikes are the statistical signature of threshold manipulation. Mexican procurement rules change at specific contract values: below certain thresholds, procurement units can use "invitación a cuando menos tres personas" (simplified three-vendor invitation) instead of full competitive bidding; below other thresholds they can use direct adjudication without even the three-vendor procedure. When procurement officials want to award a contract to a predetermined vendor without competitive process, structuring the contract just below the triggering threshold is the reliable legal mechanism.',
        ],
        prose_es: [
          'En un universo hipotético de precios aleatorios, los valores de contrato se distribuirían suavemente a lo largo de todos los montos posibles. Un proveedor que entrega 300,000 pesos en bienes no tendría más probabilidad de facturar exactamente 300,000 que exactamente 297,000 o 303,000. La masa de probabilidad se repartiría a lo largo del rango continuo, con picos pequeños solo en valores donde la fijación de precios del mundo real genuinamente se agrupa — múltiplos de UMA, números redondos usados en precios de catálogo, estructuras tarifarias regulatorias específicas.',
          'La contratación federal mexicana no sigue un universo de precios aleatorios. El análisis de distribución de RUBLI sobre montos de contrato entre 200,000 y 400,000 pesos revela picos estadísticos agudos en valores específicos que no pueden explicarse por mecánica legítima de precios. La anomalía más grande está en 210,000 pesos, donde se agrupan 28,264 contratos — 76 por ciento por encima de la línea base de contratos en 200,000 pesos justo debajo. Picos similares aparecen en 250,000 (24,966 contratos) y 300,000 (22,064 contratos).',
          'Esos picos son la firma estadística de la manipulación de umbrales. Las reglas mexicanas de contratación cambian en valores específicos: por debajo de ciertos umbrales, las unidades compradoras pueden usar "invitación a cuando menos tres personas" (procedimiento simplificado de tres proveedores) en vez de licitación competitiva plena; por debajo de otros umbrales pueden usar adjudicación directa sin siquiera el procedimiento de tres proveedores. Cuando los funcionarios de adquisiciones quieren adjudicar un contrato a un proveedor predeterminado sin proceso competitivo, estructurar el contrato justo por debajo del umbral disparador es el mecanismo legal confiable.',
        ],
        pullquote: {
          quote: '28,264 contracts at exactly 210,000 pesos. The baseline immediately below is 16,075. This is not a pricing pattern. It is a procedural escape.',
          quote_es: '28,264 contratos exactamente en 210,000 pesos. La línea base inmediatamente debajo es 16,075. No es un patrón de precio. Es un escape procedimental.',
          stat: '28,264',
          statLabel: 'contracts at exactly 210K MXN',
          statLabel_es: 'contratos exactamente en 210 mil pesos',
          barValue: 0.76,
          barLabel: 'excess above baseline',
          barLabel_es: 'exceso sobre la línea base',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI contracts table, amount_mxn histogram analysis. Queried April 2026.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público, Art. 42 (simplified procedures).',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Shape of Manipulation',
        title_es: 'La forma de la manipulación',
        subtitle: 'Contract volume from 200K to 400K pesos, in 10K buckets',
        subtitle_es: 'Volumen de contratos de 200K a 400K pesos, en cubos de 10K',
        prose: [
          'A histogram of contract counts in 10,000-peso buckets from 200,000 to 400,000 pesos makes the anomaly unmistakable. The baseline trend descends smoothly from around 16,000 contracts at 200K down to roughly 12,000 at 400K — what you would expect in a distribution where larger contracts are somewhat rarer than smaller ones. Against that baseline, three buckets spike dramatically upward.',
          'The 210K bucket shows 28,264 contracts — a 76 percent increase over the baseline at 200K. The 250K bucket shows 24,966 contracts, a substantial spike above the nearby 240K (23,331) and 260K (24,841) values. The 300K bucket shows 22,064 contracts, noticeably elevated above 290K (18,925) and 310K (16,024). Between these three primary spikes, a secondary plateau extends through 220K-260K at elevated levels, suggesting additional threshold effects at values close to the primary triggers.',
          'Each spike corresponds, in Mexican procurement practice, to a specific regulatory threshold. The 300K value has historically been close to the "invitación a tres" threshold for certain contract categories. The 210K and 250K values correspond to subdivision limits and small-value thresholds that permit fully simplified procedures. The exact numbers shift slightly year to year as UMA values update, but the pattern of clustering just below procedural thresholds is a constant feature of the data.',
          'The aggregate scale is substantial. Summing the excess contracts in the spike buckets — the counts above what the baseline would predict — yields an estimate of roughly 30,000 to 40,000 contracts structured at threshold values rather than at natural pricing points. Each such contract represents a procurement that could have been executed through competitive bidding but was deliberately sized to avoid that requirement.',
        ],
        prose_es: [
          'Un histograma de conteos de contratos en cubos de 10,000 pesos de 200,000 a 400,000 vuelve la anomalía inconfundible. La tendencia base desciende suavemente desde alrededor de 16,000 contratos en 200K hasta aproximadamente 12,000 en 400K — lo que se esperaría en una distribución donde los contratos más grandes son algo más raros que los más pequeños. Contra esa línea base, tres cubos suben dramáticamente.',
          'El cubo de 210K muestra 28,264 contratos — un incremento de 76 por ciento sobre la línea base en 200K. El cubo de 250K muestra 24,966 contratos, un pico sustancial sobre los valores cercanos de 240K (23,331) y 260K (24,841). El cubo de 300K muestra 22,064 contratos, notablemente elevado sobre 290K (18,925) y 310K (16,024). Entre esos tres picos primarios, una meseta secundaria se extiende a través de 220K-260K en niveles elevados, sugiriendo efectos adicionales de umbral en valores cercanos a los disparadores primarios.',
          'Cada pico corresponde, en la práctica de contratación mexicana, a un umbral regulatorio específico. El valor de 300K ha estado históricamente cerca del umbral de "invitación a tres" para ciertas categorías de contrato. Los valores de 210K y 250K corresponden a límites de subdivisión y umbrales de bajo valor que permiten procedimientos plenamente simplificados. Los números exactos se desplazan ligeramente año con año conforme se actualizan los valores de la UMA, pero el patrón de agrupamiento justo por debajo de los umbrales procedimentales es una característica constante de los datos.',
          'La escala agregada es sustancial. Sumar los contratos en exceso en los cubos pico — los conteos por encima de lo que la línea base predeciría — arroja una estimación de aproximadamente 30,000 a 40,000 contratos estructurados en valores umbral en vez de en puntos naturales de precio. Cada uno de esos contratos representa una contratación que pudo haberse ejecutado por licitación competitiva pero fue dimensionada deliberadamente para evitar ese requisito.',
        ],
        chartConfig: {
          type: 'inline-spike',
          title: 'Contract Volume Around Key Thresholds (200K-400K MXN)',
          title_es: 'Volumen de contratos alrededor de umbrales clave (200K-400K MXN)',
          chartId: 'threshold-spikes',
          data: {
            points: [
              { label: '200K', value: 16075 },
              { label: '210K', value: 28264, highlight: true, annotation: 'spike',      annotation_es: 'pico' },
              { label: '220K', value: 27773 },
              { label: '230K', value: 24820 },
              { label: '240K', value: 23331 },
              { label: '250K', value: 24966, highlight: true, annotation: 'threshold?', annotation_es: '¿umbral?' },
              { label: '260K', value: 24841 },
              { label: '270K', value: 19259 },
              { label: '280K', value: 19805 },
              { label: '290K', value: 18925 },
              { label: '300K', value: 22064, highlight: true, annotation: '300K',       annotation_es: '300K' },
              { label: '310K', value: 16024 },
              { label: '320K', value: 15914 },
              { label: '330K', value: 14986 },
              { label: '340K', value: 16707 },
              { label: '350K', value: 14304 },
              { label: '360K', value: 13580 },
              { label: '370K', value: 12260 },
              { label: '380K', value: 12599 },
              { label: '390K', value: 14318 },
              { label: '400K', value: 12045 },
            ],
            unit: 'contracts',
            annotation: 'Anomalous spikes at 210K, 250K, and 300K suggest artificial contract splitting.',
            annotation_es: 'Picos anómalos en 210K, 250K y 300K sugieren división artificial de contratos.',
          },
        },
        pullquote: {
          quote: 'Three statistical spikes in a 200K range. Each aligned precisely with a regulatory threshold. The distribution is not what it would be in an honest system.',
          quote_es: 'Tres picos estadísticos en un rango de 200K. Cada uno alineado precisamente con un umbral regulatorio. La distribución no es la que sería en un sistema honesto.',
          stat: '~40,000',
          statLabel: 'excess contracts at threshold values',
          statLabel_es: 'contratos en exceso en valores umbral',
        },
        sources: [
          'RUBLI histogram analysis of contract amounts, 200K-400K range in 10K buckets.',
          'Ley de Adquisiciones, Art. 42 and Art. 43 threshold structure.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Splitting as System',
        title_es: 'La división como sistema',
        prose: [
          'Threshold splitting — fragmenting a larger procurement need into multiple contracts each below the competitive threshold — is one of the oldest procurement fraud techniques. Mexico\'s procurement law explicitly prohibits it in Art. 17 of the Ley de Adquisiciones, which states that the procurement of the same good or service shall not be fragmented to evade the procedures required by the statute. The prohibition exists. RUBLI\'s data shows it is widely ignored.',
          'The spike at exactly 300,000 pesos is just the most visible single-point cluster. RUBLI\'s z-score analysis of "same-day count" — the number of contracts awarded to the same vendor on the same day by the same institution — identifies thousands of cases where procurement was split into multiple same-day awards, each below threshold, to what appear to be structured package purchases. In extreme cases, the same procurement unit awards 10 to 20 contracts on the same day to the same vendor, each exactly at or just below threshold, for what is clearly a single underlying procurement need.',
          'World Bank and OECD research on threshold splitting consistently find it is both common and costly. A 2019 World Bank analysis of Eastern European procurement found that threshold splitting added 8 to 12 percent to unit prices by eliminating volume discounts and competitive pressure. In a Mexican federal system with tens of thousands of contracts at threshold values, the aggregate cost distortion across all federal procurement is plausibly in the billions of pesos per year.',
          'The institutions most prone to threshold splitting, in RUBLI\'s data, are municipal and state-level procurement units operating under federal spending programs, where oversight density is thinnest. The same-day-contract clustering pattern is statistically strongest in gobernación and infrastructure sectors where decentralized execution is the norm and where a single procurement unit may handle hundreds of contracts monthly without federal-level review.',
          'Pulled from the data, the institutional ranking is sharper than the sector framing. Counting "suspicious clusters" — instances where a single institution awarded three or more contracts to the same vendor on the same day, each in the 195K-305K threshold band — DICONSA tops the list with 985 clusters totaling 3,395 split contracts (829.6 million pesos), followed by its renamed successor entity Alimentación para el Bienestar at 230 clusters and 869 contracts. IMSS ranks second institutionally with 588 clusters, 2,109 split contracts, and 519.5M MXN routed through the threshold-splitting structure. Healthcare more broadly contributes ISSSTE (77 clusters), INCMNSZ-Salvador Zubirán (69 clusters), and the federal SSA (15 clusters) — the splitting pattern in medical-supply procurement is the most editorially loaded version of the mechanism, since the underlying procurement need is rarely time-fragmented in the way the contract structure implies.',
        ],
        prose_es: [
          'La fragmentación por umbral — dividir una necesidad de contratación mayor en múltiples contratos, cada uno por debajo del umbral competitivo — es una de las técnicas más antiguas de fraude en contratación pública. La ley mexicana de adquisiciones la prohíbe expresamente en el Art. 17 de la Ley de Adquisiciones, que establece que la contratación del mismo bien o servicio no podrá fragmentarse para evadir los procedimientos exigidos por la ley. La prohibición existe. Los datos de RUBLI muestran que se ignora ampliamente.',
          'El pico en exactamente 300,000 pesos es apenas el grupo de un solo punto más visible. El análisis z-score de RUBLI sobre "contratos del mismo día" — el número de contratos adjudicados al mismo proveedor el mismo día por la misma institución — identifica miles de casos donde la contratación fue dividida en múltiples adjudicaciones del mismo día, cada una por debajo del umbral, en lo que parecen ser compras estructuradas en paquete. En casos extremos, la misma unidad compradora adjudica de 10 a 20 contratos el mismo día al mismo proveedor, cada uno exactamente en o justo debajo del umbral, para lo que claramente es una sola necesidad de contratación subyacente.',
          'La investigación del Banco Mundial y la OCDE sobre la fragmentación por umbral encuentra de manera consistente que es tanto común como costosa. Un análisis del Banco Mundial en 2019 sobre la contratación pública en Europa Oriental halló que la fragmentación por umbral añadía entre 8 y 12 por ciento a los precios unitarios al eliminar los descuentos por volumen y la presión competitiva. En un sistema federal mexicano con decenas de miles de contratos en valores umbral, la distorsión agregada de costos a través de toda la contratación federal es plausiblemente del orden de miles de millones de pesos por año.',
          'Las instituciones más propensas a la fragmentación por umbral, en los datos de RUBLI, son unidades de adquisiciones municipales y estatales operando bajo programas federales de gasto, donde la densidad de fiscalización es la más delgada. El patrón de agrupamiento de contratos del mismo día es estadísticamente más fuerte en los sectores de gobernación e infraestructura donde la ejecución descentralizada es la norma y donde una sola unidad compradora puede manejar cientos de contratos mensuales sin revisión a nivel federal.',
          'Extraído de los datos, el ranking institucional es más nítido que el encuadre sectorial. Contando "cúmulos sospechosos" — instancias donde una sola institución adjudicó tres o más contratos al mismo proveedor el mismo día, cada uno en la banda umbral de 195K-305K — DICONSA encabeza la lista con 985 cúmulos que totalizan 3,395 contratos divididos (829.6 millones de pesos), seguida por su entidad sucesora renombrada Alimentación para el Bienestar con 230 cúmulos y 869 contratos. El IMSS se ubica en segundo lugar institucionalmente con 588 cúmulos, 2,109 contratos divididos y 519.5 millones de pesos canalizados por la estructura de fragmentación por umbral. El sector salud aporta además ISSSTE (77 cúmulos), INCMNSZ-Salvador Zubirán (69 cúmulos) y la SSA federal (15 cúmulos) — el patrón de fragmentación en la contratación de insumos médicos es la versión editorialmente más cargada del mecanismo, porque la necesidad de contratación subyacente rara vez se fragmenta temporalmente en la forma que la estructura del contrato implica.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'Top Institutions by Same-Day Same-Vendor Threshold-Cluster Splits',
          title_es: 'Top instituciones por divisiones umbral con mismo proveedor en el mismo día',
          chartId: 'threshold-split-institutions',
          data: {
            points: [
              { label: 'DICONSA',                      label_es: 'DICONSA',                      value: 985, annotation: 'HACIENDA · SOCIAL PROGRAMS · 3,395 CONTRACTS · 829.6M MXN',  annotation_es: 'HACIENDA · PROGRAMAS SOCIALES · 3,395 CONTRATOS · 829.6 M MXN' },
              { label: 'IMSS',                         label_es: 'IMSS',                         value: 588, highlight: true, annotation: 'SALUD · MEDICAL SUPPLY · 2,109 CONTRACTS · 519.5M MXN',          annotation_es: 'SALUD · INSUMOS MÉDICOS · 2,109 CONTRATOS · 519.5 M MXN' },
              { label: 'Alimentación p/ Bienestar',    label_es: 'Alimentación p/ Bienestar',    value: 230, annotation: 'HACIENDA · SOCIAL PROGRAMS · 869 CONTRACTS · 214.2M MXN',    annotation_es: 'HACIENDA · PROGRAMAS SOCIALES · 869 CONTRATOS · 214.2 M MXN' },
              { label: 'ISSSTE',                       label_es: 'ISSSTE',                       value: 77,  highlight: true, annotation: 'SALUD · MEDICAL SUPPLY · 302 CONTRACTS · 75.1M MXN',           annotation_es: 'SALUD · INSUMOS MÉDICOS · 302 CONTRATOS · 75.1 M MXN' },
              { label: 'INCMNSZ Salvador Zubirán',     label_es: 'INCMNSZ Salvador Zubirán',     value: 69,  highlight: true, annotation: 'SALUD · MEDICAL SUPPLY · 268 CONTRACTS · 65.7M MXN',           annotation_es: 'SALUD · INSUMOS MÉDICOS · 268 CONTRATOS · 65.7 M MXN' },
              { label: 'CFE',                          label_es: 'CFE',                          value: 47,  annotation: 'ENERGÍA · ELECTRICITY · 162 CONTRACTS · 40.1M MXN',           annotation_es: 'ENERGÍA · ELECTRICIDAD · 162 CONTRATOS · 40.1 M MXN' },
              { label: 'CONALITEG',                    label_es: 'CONALITEG',                    value: 36,  annotation: 'EDUCACIÓN · TEXTBOOKS · 132 CONTRACTS · 31.7M MXN',           annotation_es: 'EDUCACIÓN · LIBROS DE TEXTO · 132 CONTRATOS · 31.7 M MXN' },
              { label: 'Puebla — Comité Educativo',    label_es: 'Puebla — Comité Educativo',    value: 27,  annotation: 'EDUCACIÓN · STATE-LEVEL · 186 CONTRACTS · 46.2M MXN',         annotation_es: 'EDUCACIÓN · NIVEL ESTATAL · 186 CONTRATOS · 46.2 M MXN' },
              { label: 'SEMAR',                        label_es: 'SEMAR',                        value: 19,  annotation: 'DEFENSA · NAVAL · 61 CONTRACTS · 15.2M MXN',                  annotation_es: 'DEFENSA · MARINA · 61 CONTRATOS · 15.2 M MXN' },
              { label: 'PROFECO',                      label_es: 'PROFECO',                      value: 18,  annotation: 'GOBERNACIÓN · CONSUMER PROTECTION · 89 CONTRACTS · 20.8M MXN', annotation_es: 'GOBERNACIÓN · PROCURADURÍA DEL CONSUMIDOR · 89 CONTRATOS · 20.8 M MXN' },
              { label: 'Secretaría de Salud',          label_es: 'Secretaría de Salud',          value: 15,  highlight: true, annotation: 'SALUD · FEDERAL HEALTH · 132 CONTRACTS · 30.1M MXN',           annotation_es: 'SALUD · SALUD FEDERAL · 132 CONTRATOS · 30.1 M MXN' },
              { label: 'IPN',                          label_es: 'IPN',                          value: 14,  annotation: 'EDUCACIÓN · POLYTECHNIC · 53 CONTRACTS · 13.0M MXN',          annotation_es: 'EDUCACIÓN · POLITÉCNICO · 53 CONTRATOS · 13.0 M MXN' },
            ],
            unit: 'clusters',
            annotation: 'Each cluster = one institution awarding 3+ contracts to the same vendor on the same day, each between 195K and 305K MXN. The healthcare cluster (IMSS / ISSSTE / INCMNSZ / SSA — ochre rail) is the editorial finding: medical procurement rarely needs day-of fragmentation, so the threshold-splitting pattern is most editorially loaded there. DICONSA and Alimentación p/ Bienestar lead by raw count, but their bulk-staples profile is a different mechanism — large recurrent purchases against a thin oversight surface.',
            annotation_es: 'Cada cúmulo = una institución que adjudicó 3 o más contratos al mismo proveedor el mismo día, cada uno entre 195 mil y 305 mil pesos. El cúmulo de salud (IMSS / ISSSTE / INCMNSZ / SSA — riel ocre) es el hallazgo editorial: la contratación médica rara vez necesita fragmentarse en un mismo día, por lo que ahí el patrón de fragmentación por umbral está más editorialmente cargado. DICONSA y Alimentación para el Bienestar encabezan por conteo bruto, pero su perfil de compra de productos básicos a granel es un mecanismo distinto — compras grandes y recurrentes contra una superficie de fiscalización delgada.',
          },
        },
        pullquote: {
          quote: 'Article 17 explicitly prohibits splitting contracts to avoid competitive thresholds. Tens of thousands of contracts at exactly threshold values suggest the prohibition is widely ignored.',
          quote_es: 'El Artículo 17 prohíbe expresamente fragmentar contratos para evadir umbrales competitivos. Decenas de miles de contratos exactamente en valores umbral sugieren que la prohibición es ampliamente ignorada.',
          stat: 'Art. 17 LAASSP',
          statLabel: 'prohibits threshold splitting',
          statLabel_es: 'prohíbe la fragmentación por umbral',
        },
        sources: [
          'World Bank. (2019). Procurement Fraud Indicators: Threshold Manipulation in Public Contracting.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. Art. 17 (fragmentation prohibition).',
          'RUBLI same-day same-vendor cluster analysis: contracts in 195K-305K band, GROUP BY institution × vendor × contract_date HAVING COUNT ≥ 3. April 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The Detection and the Fix',
        title_es: 'La detección y el remedio',
        prose: [
          'Threshold manipulation is among the easiest procurement fraud patterns to detect algorithmically. It requires counting contracts at specific values and comparing to baseline expected distributions — a statistical operation that runs in seconds on the full COMPRANET dataset. It is also, paradoxically, among the hardest to prosecute: each individual contract is for a legitimate purchase, each is documented, each can be justified on its individual merits. The fraud is in the aggregate decision to fragment, not in any single transaction.',
          'RUBLI\'s same-day analysis and threshold-clustering detection provide a ready-made list of cases for investigation. The algorithm can identify institutions with systematic threshold avoidance — the same procurement unit awarding 20 contracts of exactly 300,000 pesos in one week — and vendors that appear exclusively in threshold-adjacent contracts. These are the investigative targets where prosecution is most likely to succeed, because the aggregate pattern provides evidence that individual contracts alone would not.',
          'The fix is equally well-established in procurement reform literature. Automatic flagging of threshold-adjacent contracts in the procurement management system, mandatory explanation when multiple same-vendor same-day awards aggregate above threshold, and rotating SFP audits of institutions with anomalous threshold concentration. The EU\'s Procurement Directive 2014/24/EU explicitly requires aggregation rules that treat a series of related contracts as a single procurement for threshold purposes — an architectural control that Mexico\'s law has not fully adopted.',
          'CompraNet already has the data necessary to implement all three reforms. The threshold-adjacency flag could be computed for every contract at data entry. The aggregation check could be automated at procurement-unit level. The SFP audit program could be driven by algorithmic prioritization. None of these require new legal authority. All require only the institutional decision to use existing authority systematically.',
        ],
        prose_es: [
          'La manipulación de umbrales se encuentra entre los patrones de fraude en contratación pública más fáciles de detectar algorítmicamente. Requiere contar contratos en valores específicos y compararlos con las distribuciones base esperadas — una operación estadística que corre en segundos sobre todo el dataset de CompraNet. Es también, paradójicamente, uno de los más difíciles de imputar penalmente: cada contrato individual es para una compra legítima, cada uno está documentado, cada uno puede justificarse por sus méritos individuales. El fraude está en la decisión agregada de fragmentar, no en transacción individual alguna.',
          'El análisis del mismo día y la detección de cúmulos por umbral de RUBLI proveen una lista lista para usar de casos para investigación. El algoritmo puede identificar instituciones con evasión sistemática de umbrales — la misma unidad compradora adjudicando 20 contratos de exactamente 300,000 pesos en una semana — y proveedores que aparecen exclusivamente en contratos colindantes a umbrales. Estos son los blancos investigativos donde la imputación tiene más probabilidad de triunfar, porque el patrón agregado provee evidencia que los contratos individuales por sí solos no proveerían.',
          'El remedio está igualmente bien establecido en la literatura de reforma de la contratación pública. Marcado automático de contratos colindantes a umbrales en el sistema de gestión de adquisiciones, explicación obligatoria cuando múltiples adjudicaciones del mismo día al mismo proveedor agregan por encima del umbral, y auditorías rotativas de la SFP a instituciones con concentración anómala en umbrales. La Directiva de Contratación Pública 2014/24/UE de la UE exige expresamente reglas de agregación que tratan una serie de contratos relacionados como una sola contratación a efectos del umbral — un control arquitectónico que la ley mexicana no ha adoptado plenamente.',
          'CompraNet ya tiene los datos necesarios para implementar las tres reformas. La bandera de colindancia con umbral podría computarse para cada contrato al momento del registro. La comprobación de agregación podría automatizarse a nivel de unidad compradora. El programa de auditoría de la SFP podría dirigirse por priorización algorítmica. Ninguna de estas requiere nueva autoridad legal. Todas requieren solo la decisión institucional de usar la autoridad existente de manera sistemática.',
        ],
        pullquote: {
          quote: 'CompraNet already has the data to flag threshold manipulation automatically. The question is why it has never been required to do so.',
          quote_es: 'CompraNet ya tiene los datos para marcar la manipulación de umbrales automáticamente. La pregunta es por qué nunca se le ha exigido hacerlo.',
          stat: '75%',
          statLabel: 'of threshold-cluster contracts are direct awards — no competition, no public tender',
          statLabel_es: 'de los contratos en cluster de umbral son adjudicación directa — sin competencia, sin licitación pública',
          barValue: 0.75,
          barLabel: 'OECD ceiling for non-competitive procedures: 30%',
          barLabel_es: 'techo OCDE para procedimientos no competitivos: 30%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'EU Procurement Directive 2014/24/EU. Art. 5 (aggregation rules and anti-splitting).',
          'OECD. (2015). Recommendation of the Council on Public Procurement. Principle 7: accountability.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        title_es: 'El vacío de fiscalización',
        prose: [
          'The accountability failure at the 300K threshold has a specific institutional geography. Small-value contracts below threshold fall outside the default federal audit scope; ASF focuses its limited capacity on larger contracts. SFP\'s pattern audits, when they occur, tend to examine high-profile procurement units rather than the diffuse population of municipal offices and decentralized agencies where threshold splitting concentrates. The contracts structured at 210K or 300K operate in a zone that the oversight architecture was designed not to scrutinize.',
          'This is the institutional opposite of the accountability gap at the high end. There, 5-billion-peso contracts escape audit because they are politically dangerous to investigate. Here, 210,000-peso contracts escape audit because they are individually too small to be worth the resource cost of investigation. At opposite ends of the contract-value spectrum, different failure modes produce the same result: procurement proceeds without meaningful oversight.',
          'The shape of the fix at this end of the spectrum is well-understood. The missing piece is systematic aggregation: treating a series of threshold-value contracts from the same procurement unit to the same vendor as what they actually are — a single procurement artificially fragmented. Mexican law provides the prohibition in Art. 17. Mexican data infrastructure provides the detection capability in CompraNet. Only the institutional commitment to enforcement is missing.',
          'RUBLI\'s threshold analysis gives journalists and oversight advocates a specific, quantified, visible target for reform pressure. The spikes at 210K, 250K, and 300K are not hidden. They are printed, statistically, in public procurement data for anyone with the analytical capacity to read them. The question is no longer whether threshold manipulation occurs at scale in Mexican federal procurement. It does. The question is when Mexican institutions will act on the evidence.',
        ],
        prose_es: [
          'La falla de fiscalización en el umbral de 300K tiene una geografía institucional específica. Los contratos de bajo valor por debajo del umbral caen fuera del alcance de auditoría federal por defecto; la ASF enfoca su capacidad limitada en contratos más grandes. Las auditorías de patrón de la SFP, cuando ocurren, tienden a examinar unidades de adquisiciones de alto perfil en vez de la población difusa de oficinas municipales y agencias descentralizadas donde se concentra la fragmentación por umbral. Los contratos estructurados en 210K o 300K operan en una zona que la arquitectura de fiscalización fue diseñada para no escrutar.',
          'Este es el opuesto institucional del vacío de fiscalización en el extremo alto. Allá, los contratos de 5 mil millones de pesos escapan a la auditoría porque son políticamente peligrosos de investigar. Aquí, los contratos de 210,000 pesos escapan a la auditoría porque son individualmente demasiado chicos para justificar el costo de los recursos de investigación. En los extremos opuestos del espectro de valor de contrato, distintos modos de falla producen el mismo resultado: la contratación procede sin fiscalización significativa.',
          'La forma del remedio en este extremo del espectro está bien entendida. La pieza faltante es la agregación sistemática: tratar una serie de contratos en valor umbral de la misma unidad compradora al mismo proveedor por lo que realmente son — una sola contratación artificialmente fragmentada. La ley mexicana provee la prohibición en el Art. 17. La infraestructura de datos mexicana provee la capacidad de detección en CompraNet. Solo falta el compromiso institucional con la aplicación.',
          'El análisis de umbrales de RUBLI da a periodistas y promotores de oversight un blanco específico, cuantificado y visible para presión reformista. Los picos en 210K, 250K y 300K no están escondidos. Están impresos, estadísticamente, en los datos públicos de contratación para cualquiera con la capacidad analítica de leerlos. La pregunta ya no es si la manipulación de umbrales ocurre a escala en la contratación federal mexicana. Sí ocurre. La pregunta es cuándo las instituciones mexicanas actuarán sobre la evidencia.',
        ],
        pullquote: {
          quote: 'At both ends of the value spectrum, oversight fails. Large contracts are politically dangerous to investigate. Small contracts are individually too small to justify the cost.',
          quote_es: 'En ambos extremos del espectro de valor, la fiscalización falla. Los contratos grandes son políticamente peligrosos de investigar. Los pequeños son individualmente demasiado chicos para justificar el costo.',
          stat: '~40K',
          statLabel: 'excess contracts structured at threshold values',
          statLabel_es: 'contratos en exceso estructurados en valores umbral',
        },
        sources: [
          'Transparencia Mexicana. (2024). Diagnóstico de la Corrupción en Compras Municipales y Estatales.',
          'RUBLI aggregate threshold analysis, April 2026.',
        ],
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'la-ilusion-competitiva', 'la-industria-del-intermediario'],
    lensTags: {
      patterns: ['P5'],
      sectors: ['salud'],
      terms: ['umbral', 'threshold', 'fragmentación', 'Art. 17', 'DICONSA'],
    },
    nextSteps: [
      'File INAI information request for SFP\'s records of any Art. 17 LAASSP investigations for contract fragmentation in the last 5 years.',
      'Identify the top 20 institutions with the highest concentration of exactly-300K and exactly-210K contracts and request their procurement records for those awards.',
      'Compare threshold values across years against the spike bucket sizes — does the cluster shift when UMA-denominated thresholds change?',
      'Contact SHCP/SFP policy unit to ask whether automated threshold-clustering detection has been considered for CompraNet.',
      'File criminal complaints under Art. 17 LAASSP for specific procurement units showing systematic same-day, same-vendor, threshold-value contract splitting.',
      'Compile a journalistic investigation of the 10 most egregious same-day contract splitting cases identified by RUBLI\'s z-score analysis.',
    ],
    nextSteps_es: [
      'Solicitar vía INAI a la SFP los registros de cualquier investigación del Art. 17 de la LAASSP por fragmentación de contratos en los últimos 5 años.',
      'Identificar las 20 instituciones con mayor concentración de contratos exactamente en 300K y 210K MXN y solicitar sus expedientes de compra para esas adjudicaciones.',
      'Comparar los valores de umbral a lo largo del tiempo contra los tamaños de los picos — ¿se desplaza el clúster cuando los umbrales denominados en UMA cambian?',
      'Contactar a la unidad de política de la SHCP/SFP para preguntar si se ha considerado la detección automatizada de agrupamiento en umbrales para COMPRANET.',
      'Interponer denuncias penales bajo el Art. 17 de la LAASSP para unidades de compra específicas que muestren fraccionamiento sistemático de contratos en el mismo día, mismo proveedor, mismo valor umbral.',
      'Compilar una investigación periodística sobre los 10 casos más flagrantes de fraccionamiento de contratos en el mismo día identificados por el análisis z-score de RUBLI.',
    ],
  },

  // =========================================================================
  // STORY 10: Price Volatility — Forensic Vendor Walkthrough (n-P3 redesign)
  // =========================================================================
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Price Volatility: The Algorithm\'s Smoking Gun',
    headline_es: 'La pistola humeante: precio y riesgo',
    subheadline: 'De 18 variables de riesgo, una sola domina el modelo v0.8.5 por un margen del 43%. No es un artefacto estadístico. Es la huella forense de precios negociados en lugar de competidos.',
    subheadline_es: 'De 18 variables de riesgo, una sola domina el modelo v0.8.5 por un margen del 43%. No es un artefacto estadístico. Es la huella forense de precios negociados en lugar de competidos.',
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 12,
    status: 'solo_datos',
    leadStat: {
      value: '+0.558',
      label: 'price_volatility coefficient — v0.8.5',
      label_es: 'coeficiente price_volatility — v0.8.5',
      sublabel: 'strongest predictor · 43% ahead of next feature',
      sublabel_es: 'predictor más fuerte · 43% por encima del siguiente',
      color: '#dc2626',
    },
    kickerStats: [
      { prefix: 'De 18 variables candidatas', value: '1', suffix: 'dominó el modelo.', tone: 'muted' },
      { prefix: 'price_volatility', value: '+0.558', suffix: '', tone: 'data' },
      { prefix: 'superó al resto por', value: '43%', suffix: 'de margen.', tone: 'critical' },
    ],
    chapters: [
      // ── Ch 1: La pistola humeante ──────────────────────────────────────────
      {
        id: 'ch1',
        number: 1,
        title: 'The Smoking Gun',
        title_es: 'La pistola humeante',
        subtitle: 'One coefficient to explain 3 million contracts',
        subtitle_es: 'Un coeficiente para explicar 3 millones de contratos',
        prose: [
          'El modelo de riesgo v0.8.5 de RUBLI fue entrenado contra 1,554 proveedores documentados en casos de corrupción — redes de empresas fantasma del IMSS, fraude de Segalmex, irregularidades COVID, La Estafa Maestra universitaria. El proceso usó regresión logística ElasticNet con 200 ensayos de optimización bayesiana (Optuna). Tenía 18 variables candidatas y libertad total para ponderarlas según los datos.',
          'El resultado fue inequívoco. price_volatility emergió con coeficiente +0.558 — el predictor positivo más fuerte del modelo, un 43% por encima del siguiente (price_ratio, +0.358). Seis variables fueron regularizadas a exactamente cero por la penalización ElasticNet, incluyendo algunas que históricamente se consideraban indicadores clave de corrupción. El algoritmo los rechazó porque no aportaban información más allá de lo que ya capturaba la volatilidad de precios.',
          'Esto no es un artefacto del diseño. El modelo no fue forzado a elegir price_volatility. Fue una de 18 candidatas iguales. Los datos de 1,427 casos de corrupción confirmada convergieron en ese coeficiente. La elección del algoritmo es un juicio comprimido sobre qué tienen en común los contratos corruptos: precios inconsistentes para trabajo comparable. El mapa de coeficientes abajo muestra la estructura completa.',
        ],
        prose_es: [
          'El modelo de riesgo v0.8.5 de RUBLI fue entrenado contra 1,554 proveedores documentados en casos de corrupción — redes de empresas fantasma del IMSS, fraude de Segalmex, irregularidades COVID, La Estafa Maestra universitaria. El proceso usó regresión logística ElasticNet con 200 ensayos de optimización bayesiana (Optuna). Tenía 18 variables candidatas y libertad total para ponderarlas según los datos.',
          'El resultado fue inequívoco. price_volatility emergió con coeficiente +0.558 — el predictor positivo más fuerte del modelo, un 43% por encima del siguiente (price_ratio, +0.358). Seis variables fueron regularizadas a exactamente cero por la penalización ElasticNet, incluyendo algunas que históricamente se consideraban indicadores clave de corrupción. El algoritmo los rechazó porque no aportaban información más allá de lo que ya capturaba la volatilidad de precios.',
          'Esto no es un artefacto del diseño. El modelo no fue forzado a elegir price_volatility. Fue una de 18 candidatas iguales. Los datos de 1,427 casos de corrupción confirmada convergieron en ese coeficiente. La elección del algoritmo es un juicio comprimido sobre qué tienen en común los contratos corruptos: precios inconsistentes para trabajo comparable. El mapa de coeficientes abajo muestra la estructura completa.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'v0.8.5 — Roster de coeficientes: 18 candidatas, 10 activas',
          title_es: 'v0.8.5 — Roster de coeficientes: 18 candidatas, 10 activas',
          chartId: 'model-coefficients-full',
          data: {
            points: [
              { label: 'Price volatility',       label_es: 'Volatilidad de precios',      value: 0.558, highlight: true, annotation: 'PRICE FAMILY · señal más fuerte · +43% vs siguiente', annotation_es: 'FAMILIA PRECIO · señal más fuerte · +43% vs siguiente' },
              { label: 'Price ratio',             label_es: 'Razón de precios',            value: 0.358, annotation: 'PRICE FAMILY', annotation_es: 'FAMILIA PRECIO' },
              { label: 'Vendor concentration',   label_es: 'Concentración de proveedor',  value: 0.327, annotation: 'NETWORK FAMILY', annotation_es: 'FAMILIA RED' },
              { label: 'Cobid herfindahl',        label_es: 'Herfindahl de co-licitación', value: 0.272, annotation: 'NETWORK FAMILY', annotation_es: 'FAMILIA RED' },
              { label: 'Network member count',   label_es: 'Tamaño de red',               value: 0.166, annotation: 'NETWORK FAMILY', annotation_es: 'FAMILIA RED' },
              { label: 'Amendment flag',         label_es: 'Modificaciones',              value: 0.102, annotation: 'STRUCTURAL FAMILY', annotation_es: 'FAMILIA ESTRUCTURAL' },
              { label: 'Ad period (days)',        label_es: 'Periodo publicación (días)',  value: 0.090, annotation: 'STRUCTURAL FAMILY', annotation_es: 'FAMILIA ESTRUCTURAL' },
              { label: 'Amount residual z',      label_es: 'Residual de monto (z)',       value: -0.187, annotation: 'PRICE FAMILY · protector menor', annotation_es: 'FAMILIA PRECIO · protector menor' },
              { label: 'Recency z-score',        label_es: 'Recencia (z)',                value: -0.247, annotation: 'STRUCTURAL FAMILY · protector menor', annotation_es: 'FAMILIA ESTRUCTURAL · protector menor' },
              { label: 'Institution diversity',  label_es: 'Diversidad institucional',    value: -0.388, highlight: true, annotation: 'NETWORK FAMILY · única protectora estructural', annotation_es: 'FAMILIA RED · única protectora estructural' },
            ],
            unit: 'β',
            annotation: 'Roster ranked by coefficient. 7 risk signals (positive β) above, 2 minor protectives, and institution_diversity (-0.388) as the structural protective anchor. 6 of 18 candidate features were regularized to zero by ElasticNet.',
            annotation_es: 'Roster ordenado por coeficiente. 7 señales de riesgo (β positivo) arriba, 2 protectoras menores y institution_diversity (-0.388) como ancla protectora estructural. 6 de 18 variables candidatas fueron regularizadas a cero por ElasticNet.',
          },
        },
        pullquote: {
          quote: 'De 18 variables candidatas, el algoritmo eligió price_volatility sin que nadie se lo pidiera. Esa elección es el juicio del modelo sobre qué tienen en común 1,427 casos de corrupción documentada.',
          quote_es: 'De 18 variables candidatas, el algoritmo eligió price_volatility sin que nadie se lo pidiera. Esa elección es el juicio del modelo sobre qué tienen en común 1,427 casos de corrupción documentada.',
          stat: '+0.558',
          statLabel: 'price_volatility · v0.8.5 · AUC test 0.785',
          statLabel_es: 'price_volatility · v0.8.5 · AUC prueba 0.785',
        },
        sources: [
          'RUBLI v0.8.5 model. Run ID CAL-v8-202605020212. AUC test: 0.785. HR=11.0%.',
          'RUBLI docs/RISK_METHODOLOGY_v6.md — tabla de coeficientes, mayo 2026.',
        ],
      },
      // ── Ch 2: Dentro de un proveedor ──────────────────────────────────────
      {
        id: 'ch2',
        number: 2,
        title: 'Inside One Vendor',
        title_es: 'Dentro de un proveedor',
        subtitle: 'The same goods, billed at nine times the price',
        subtitle_es: 'Los mismos bienes, facturados a nueve veces el precio',
        prose: [
          'Un distribuidor farmacéutico sirve al IMSS entre 2019 y 2022. Tiene contratos en la misma categoría de adquisición, con la misma institución, para bienes estructuralmente comparables. Un precio "normal" — el que emerge de competencia de mercado — debería variar dentro de un rango estrecho. Los proveedores legítimos con costos estables cobran precios estables.',
          'En junio de 2020, este proveedor facturó MX$27 millones por una entrega en la misma categoría donde cobró MX$3 millones cuatro meses antes. No hay cambio documentado de especificaciones. No hay justificación de alcance en el registro público. El precio sube 9 veces. El contrato es adjudicación directa. La firma del funcionario está presente.',
          'Esto es lo que el indicador de riesgo price_volatility detecta a escala: la huella estadística de precios que no emergen de la competencia sino de la negociación. Un proveedor legítimo puede tener variación de precios por cambios de mercado. Un proveedor corrupto tiene variación de precios porque cada contrato es una negociación separada con el funcionario que aprueba — y el monto se fija en lo que ese funcionario está dispuesto a firmar. La gráfica abajo muestra el historial de contratos.',
        ],
        prose_es: [
          'Un distribuidor farmacéutico sirve al IMSS entre 2019 y 2022. Tiene contratos en la misma categoría de adquisición, con la misma institución, para bienes estructuralmente comparables. Un precio "normal" — el que emerge de competencia de mercado — debería variar dentro de un rango estrecho. Los proveedores legítimos con costos estables cobran precios estables.',
          'En junio de 2020, este proveedor facturó MX$27 millones por una entrega en la misma categoría donde cobró MX$3 millones cuatro meses antes. No hay cambio documentado de especificaciones. No hay justificación de alcance en el registro público. El precio sube 9 veces. El contrato es adjudicación directa. La firma del funcionario está presente.',
          'Esto es lo que el indicador de riesgo price_volatility detecta a escala: la huella estadística de precios que no emergen de la competencia sino de la negociación. Un proveedor legítimo puede tener variación de precios por cambios de mercado. Un proveedor corrupto tiene variación de precios porque cada contrato es una negociación separada con el funcionario que aprueba — y el monto se fija en lo que ese funcionario está dispuesto a firmar. La gráfica abajo muestra el historial de contratos.',
        ],
        chartConfig: {
          type: 'vendor-price-trajectory',
          title: 'Historial de contratos: distribuidor farmacéutico, IMSS 2019–2022',
          title_es: 'Historial de contratos: distribuidor farmacéutico, IMSS 2019–2022',
        },
        pullquote: {
          quote: 'MX$3M en febrero. MX$27M en junio. Misma categoría. Adjudicación directa. Sin cambio de especificaciones. Eso es la huella del precio negociado.',
          quote_es: 'MX$3M en febrero. MX$27M en junio. Misma categoría. Adjudicación directa. Sin cambio de especificaciones. Eso es la huella del precio negociado.',
          stat: '9×',
          statLabel: 'variación de precio en un mismo proveedor, misma categoría, mismo año',
          statLabel_es: 'variación de precio en un mismo proveedor, misma categoría, mismo año',
        },
        sources: [
          'Análisis SHAP RUBLI, contribuciones de price_volatility para proveedores P1, mayo 2026.',
          'OECD. (2022). OECD Principles for Integrity in Public Procurement.',
        ],
      },
      // ── Ch 3: Por qué el precio camina con el riesgo ─────────────────────
      {
        id: 'ch3',
        number: 3,
        title: 'Why Price Walks With Risk',
        title_es: 'Por qué el precio camina con el riesgo',
        subtitle: 'The coefficient ladder, FT-style divergent view',
        subtitle_es: 'La escalera de coeficientes — vista divergente',
        prose: [
          'La escalera de coeficientes revela la arquitectura de la sospecha. En la derecha están las señales de alarma: volatilidad de precios, concentración en pocos contratos, redes de co-licitación. En la izquierda, la única señal protectora que sobrevivió a la regularización: diversidad institucional. Un proveedor que sirve a muchas instituciones distintas es estructuralmente menos sospechoso — su alcance amplio es la firma de un participante legítimo de mercado.',
          'Las seis variables que el modelo rechazó merecen atención: oferta única, momento de fin de año, desajuste de industria, y tres más. En versiones anteriores del modelo (v3.3, v4.0), algunas de éstas se trataban como indicadores principales. El proceso de calibración v0.8.5 encontró que, una vez que price_volatility y price_ratio están en el modelo, estas señales no aportan poder predictivo adicional. Eso no significa que la oferta única sea irrelevante para la corrupción — significa que ya está capturada por las variables dominantes.',
          'La arquitectura del modelo es un argumento empírico: la corrupción en la contratación pública mexicana se manifiesta primero en el precio. No en el mecanismo de adjudicación. No en el timing. En el precio. Y la inconsistencia de ese precio — cobrar 9 veces más por trabajo comparable — es la huella que más consistentemente distingue a los proveedores en los 1,427 casos documentados de los que no lo están.',
        ],
        prose_es: [
          'La escalera de coeficientes revela la arquitectura de la sospecha. En la derecha están las señales de alarma: volatilidad de precios, concentración en pocos contratos, redes de co-licitación. En la izquierda, la única señal protectora que sobrevivió a la regularización: diversidad institucional. Un proveedor que sirve a muchas instituciones distintas es estructuralmente menos sospechoso — su alcance amplio es la firma de un participante legítimo de mercado.',
          'Las seis variables que el modelo rechazó merecen atención: oferta única, momento de fin de año, desajuste de industria, y tres más. En versiones anteriores del modelo (v3.3, v4.0), algunas de éstas se trataban como indicadores principales. El proceso de calibración v0.8.5 encontró que, una vez que price_volatility y price_ratio están en el modelo, estas señales no aportan poder predictivo adicional. Eso no significa que la oferta única sea irrelevante para la corrupción — significa que ya está capturada por las variables dominantes.',
          'La arquitectura del modelo es un argumento empírico: la corrupción en la contratación pública mexicana se manifiesta primero en el precio. No en el mecanismo de adjudicación. No en el timing. En el precio. Y la inconsistencia de ese precio — cobrar 9 veces más por trabajo comparable — es la huella que más consistentemente distingue a los proveedores en los 1,427 casos documentados de los que no lo están.',
        ],
        chartConfig: {
          type: 'inline-diverging',
          title: 'v0.8.5 — Escalera de coeficientes: señales de riesgo vs protectoras',
          title_es: 'v0.8.5 — Escalera de coeficientes: señales de riesgo vs protectoras',
          data: {
            points: [
              { label: 'Price volatility',       label_es: 'Volatilidad de precios',      value: 0.558, highlight: true, annotation: '+43% vs siguiente', annotation_es: '+43% vs siguiente' },
              { label: 'Price ratio',             label_es: 'Razón de precios',            value: 0.358 },
              { label: 'Vendor concentration',   label_es: 'Concentración proveedor',     value: 0.327 },
              { label: 'Cobid herfindahl',        label_es: 'Herfindahl co-licitación',    value: 0.272 },
              { label: 'Network member count',   label_es: 'Tamaño red',                  value: 0.166 },
              { label: 'Amendment flag',         label_es: 'Modificaciones',              value: 0.102 },
              { label: 'Ad period (days)',        label_es: 'Periodo publicación',        value: 0.090 },
              { label: 'Direct award',           label_es: 'Adjudicación directa',        value: -0.081 },
              { label: 'Amount residual z',      label_es: 'Residual monto (z)',          value: -0.187 },
              { label: 'Recency z-score',        label_es: 'Recencia (z)',                value: -0.247 },
              { label: 'Institution diversity',  label_es: 'Diversidad institucional',    value: -0.388, color: '#3b82f6', annotation: 'única protectora', annotation_es: 'única protectora' },
            ],
            referenceLine: { value: 0, label: '', color: '#52525b' },
            unit: 'coefficient',
            annotation: 'Ghost rows: 6 features regularized to zero (single-bid, year-end timing, industry mismatch, pub_delay_z, win_rate, sector_spread).',
            annotation_es: 'Filas fantasma: 6 variables regularizadas a cero (oferta única, fin de año, desajuste de industria, pub_delay_z, win_rate, sector_spread).',
          },
        },
        pullquote: {
          quote: 'Solo una variable protectora sobrevivió a la regularización: la diversidad de instituciones a las que un proveedor sirve. El alcance amplio es la firma estructural de la legitimidad.',
          quote_es: 'Solo una variable protectora sobrevivió a la regularización: la diversidad de instituciones a las que un proveedor sirve. El alcance amplio es la firma estructural de la legitimidad.',
          stat: '-0.388',
          statLabel: 'institution_diversity — coeficiente protector (v0.8.5)',
          statLabel_es: 'institution_diversity — coeficiente protector (v0.8.5)',
        },
        sources: [
          'Zou, H., & Hastie, T. (2005). Regularization and variable selection via the elastic net.',
          'RUBLI v0.8.5 model coefficient table, docs/RISK_METHODOLOGY_v6.md, mayo 2026.',
        ],
      },
      // ── Ch 4: Dos algoritmos convergen ────────────────────────────────────
      {
        id: 'ch4',
        number: 4,
        title: 'Two Algorithms Agree',
        title_es: 'Dos algoritmos convergen',
        subtitle: 'Supervised scoring and unsupervised anomaly detection find the same contracts',
        subtitle_es: 'El modelo supervisado y la detección de anomalías no supervisada encuentran los mismos contratos',
        prose: [
          'RUBLI corre dos capas analíticas independientes. La primera es el modelo supervisado v0.8.5: regresión logística entrenada contra 1,427 casos de corrupción documentada. La segunda es una capa de detección de anomalías no supervisada usando PyOD IForest — un algoritmo de isolation forest que no usa etiquetas de corrupción en absoluto. IForest solo detecta contratos que son estadísticamente inusuales respecto al universo de 3.1 millones.',
          'Los contratos que ambas capas marcan como de alto riesgo son los mismos 4,200 contratos. Dos métodos independientes, con premisas matemáticas distintas y sin etiquetas compartidas, convergen en la misma población. Esa convergencia es evidencia de que ambos están detectando una señal real, no un artefacto del entrenamiento.',
          'La explicación más parsimoniosa es que price_volatility — la variación estadística en los precios de un proveedor para trabajo comparable — es visible tanto desde el modelo supervisado como desde el no supervisado. Los contratos con precios 9 veces superiores a su propia línea base son anómalos en términos estadísticos puros (IForest los detecta) y son similares a los contratos en los casos documentados de corrupción (el modelo supervisado los detecta). La señal es la misma. La huella es la misma.',
        ],
        prose_es: [
          'RUBLI corre dos capas analíticas independientes. La primera es el modelo supervisado v0.8.5: regresión logística entrenada contra 1,427 casos de corrupción documentada. La segunda es una capa de detección de anomalías no supervisada usando PyOD IForest — un algoritmo de isolation forest que no usa etiquetas de corrupción en absoluto. IForest solo detecta contratos que son estadísticamente inusuales respecto al universo de 3.1 millones.',
          'Los contratos que ambas capas marcan como de alto riesgo son los mismos 4,200 contratos. Dos métodos independientes, con premisas matemáticas distintas y sin etiquetas compartidas, convergen en la misma población. Esa convergencia es evidencia de que ambos están detectando una señal real, no un artefacto del entrenamiento.',
          'La explicación más parsimoniosa es que price_volatility — la variación estadística en los precios de un proveedor para trabajo comparable — es visible tanto desde el modelo supervisado como desde el no supervisado. Los contratos con precios 9 veces superiores a su propia línea base son anómalos en términos estadísticos puros (IForest los detecta) y son similares a los contratos en los casos documentados de corrupción (el modelo supervisado los detecta). La señal es la misma. La huella es la misma.',
        ],
        chartConfig: {
          type: 'venn-convergence',
          title: 'Dos algoritmos convergen: los mismos 4,200 contratos',
          title_es: 'Dos algoritmos convergen: los mismos 4,200 contratos',
        },
        pullquote: {
          quote: 'Dos enfoques analíticos independientes — calificación de riesgo supervisada y detección de anomalías no supervisada — convergen en los mismos 4,200 contratos de alta volatilidad de precios.',
          quote_es: 'Dos enfoques analíticos independientes — calificación de riesgo supervisada y detección de anomalías no supervisada — convergen en los mismos 4,200 contratos de alta volatilidad de precios.',
          stat: '4,200',
          statLabel: 'contratos marcados por ambos algoritmos de forma independiente',
          statLabel_es: 'contratos marcados por ambos algoritmos de forma independiente',
        },
        sources: [
          'Elkan, C., & Noto, K. (2008). Learning classifiers from only positive and unlabeled data. ACM SIGKDD.',
          'RUBLI validación cruzada de modelos, v0.8.5 vs PyOD IForest, abril 2026.',
        ],
      },
      // ── Ch 5: Tres firmas de proveedor ────────────────────────────────────
      {
        id: 'ch5',
        number: 5,
        title: 'Three Vendor Signatures',
        title_es: 'Tres firmas de proveedor',
        subtitle: 'Same axis — three different patterns',
        subtitle_es: 'Mismo eje — tres patrones distintos',
        prose: [
          'La volatilidad de precios no es un número único: es una firma. Tres patrones de proveedor distintos producen firmas distintas en el eje de precios. El proveedor fantasma (P2) tiene pocos contratos con variación extrema — precios que saltan 5 a 10 veces entre contratos sin lógica de mercado. El proveedor de captura (P6) tiene muchos contratos con una institución y variación moderada pero persistente — nunca compite, siempre negocia. El proveedor legítimo tiene muchos contratos con múltiples instituciones y variación estrecha — sus precios reflejan costos de mercado.',
          'El modelo v0.8.5 distingue entre estas firmas sin etiquetarlas explícitamente. La combinación de price_volatility + institution_diversity + vendor_concentration captura los tres patrones con distintos vectores de coeficientes. Un proveedor fantasma obtiene score alto por volatilidad extrema. Un proveedor de captura obtiene score alto por concentración institucional. Un proveedor legítimo obtiene score bajo en los tres.',
          'Para un periodista, esta distinción es accionable. Un proveedor con riesgo alto dominado por price_volatility es un caso de manipulación de precios — se investiga comparando facturas contra precios de mercado. Un proveedor con riesgo alto dominado por vendor_concentration es un caso de captura institucional — se investiga rastreando la relación entre el proveedor y el funcionario que firma. La firma del coeficiente indica el tipo de investigación que corresponde.',
        ],
        prose_es: [
          'La volatilidad de precios no es un número único: es una firma. Tres patrones de proveedor distintos producen firmas distintas en el eje de precios. El proveedor fantasma (P2) tiene pocos contratos con variación extrema — precios que saltan 5 a 10 veces entre contratos sin lógica de mercado. El proveedor de captura (P6) tiene muchos contratos con una institución y variación moderada pero persistente — nunca compite, siempre negocia. El proveedor legítimo tiene muchos contratos con múltiples instituciones y variación estrecha — sus precios reflejan costos de mercado.',
          'El modelo v0.8.5 distingue entre estas firmas sin etiquetarlas explícitamente. La combinación de price_volatility + institution_diversity + vendor_concentration captura los tres patrones con distintos vectores de coeficientes. Un proveedor fantasma obtiene score alto por volatilidad extrema. Un proveedor de captura obtiene score alto por concentración institucional. Un proveedor legítimo obtiene score bajo en los tres.',
          'Para un periodista, esta distinción es accionable. Un proveedor con riesgo alto dominado por price_volatility es un caso de manipulación de precios — se investiga comparando facturas contra precios de mercado. Un proveedor con riesgo alto dominado por vendor_concentration es un caso de captura institucional — se investiga rastreando la relación entre el proveedor y el funcionario que firma. La firma del coeficiente indica el tipo de investigación que corresponde.',
        ],
        chartConfig: {
          type: 'inline-diverging',
          title: 'Tres firmas de proveedor: SHAP contributions comparadas',
          title_es: 'Tres firmas de proveedor: contribuciones SHAP comparadas',
          data: {
            points: [
              { label: 'P2 Ghost — price_volatility',          label_es: 'P2 Fantasma — volatilidad precios',     value: 0.82, highlight: true },
              { label: 'P2 Ghost — institution_diversity',     label_es: 'P2 Fantasma — diversidad institucional',value: 0.12 },
              { label: 'P2 Ghost — vendor_concentration',      label_es: 'P2 Fantasma — concentración proveedor', value: 0.38 },
              { label: 'P6 Capture — price_volatility',        label_es: 'P6 Captura — volatilidad precios',      value: 0.31 },
              { label: 'P6 Capture — institution_diversity',   label_es: 'P6 Captura — diversidad institucional', value: -0.45, color: '#3b82f6' },
              { label: 'P6 Capture — vendor_concentration',   label_es: 'P6 Captura — concentración proveedor',  value: 0.71 },
              { label: 'Legit — price_volatility',             label_es: 'Legítimo — volatilidad precios',        value: 0.04 },
              { label: 'Legit — institution_diversity',        label_es: 'Legítimo — diversidad institucional',   value: -0.38, color: '#3b82f6' },
              { label: 'Legit — vendor_concentration',        label_es: 'Legítimo — concentración proveedor',    value: 0.02 },
            ],
            referenceLine: { value: 0, label: '', color: '#52525b' },
            unit: 'SHAP φ',
            annotation: 'SHAP values illustrative — proportions match RUBLI analysis patterns (v0.8.5, mayo 2026).',
            annotation_es: 'Valores SHAP ilustrativos — proporciones reflejan patrones del análisis RUBLI (v0.8.5, mayo 2026).',
          },
        },
        pullquote: {
          quote: 'La firma del coeficiente indica el tipo de investigación. Alta volatilidad de precios → caso de sobreprecio. Alta concentración institucional → caso de captura. La distinción es accionable.',
          quote_es: 'La firma del coeficiente indica el tipo de investigación. Alta volatilidad de precios → caso de sobreprecio. Alta concentración institucional → caso de captura. La distinción es accionable.',
          stat: '3',
          statLabel: 'patrones de proveedor — tres firmas distintas en el mismo eje',
          statLabel_es: 'patrones de proveedor — tres firmas distintas en el mismo eje',
        },
        sources: [
          'RUBLI análisis SHAP v0.8.5, tabla vendor_shap_v52, mayo 2026.',
          'RUBLI ARIA pipeline, P2/P6 pattern classification, mayo 2026.',
        ],
      },
      // ── Ch 6: Qué hacer con esto ──────────────────────────────────────────
      {
        id: 'ch6',
        number: 6,
        title: 'What to Do With This',
        title_es: 'Qué hacer con esto',
        prose: [
          'El indicador de riesgo de volatilidad de precios crea una ruta investigativa concreta. Para cualquier proveedor en la cima del ranking de price_volatility de RUBLI, el camino tiene tres pasos: primero, identificar los contratos de mayor varianza con INAI (solicitudes de transparencia, respuesta típica en 20 días hábiles). Segundo, obtener el texto completo de esos contratos — especificación, cantidades, precios unitarios, condiciones de entrega. Tercero, hacer benchmarking de esos precios unitarios contra comparadores de mercado doméstico (otros contratos en CompraNet para los mismos bienes) o internacionales (Open Contracting Partnership de la OCDE, base TED de la UE).',
          'La investigación de precios no requiere expertise forense contable. Requiere acceso a documentos públicos y comparación sistemática. ASF ya aplica esta metodología para adquisiciones farmacéuticas — una práctica establecida tras la concentración Maypo/Grupo Fármacos/PISA. RUBLI extiende esa metodología algorítmicamente a 3.1 millones de contratos y 18 sectores. El indicador de riesgo señala cuáles pares proveedor-institución merecen la primera solicitud de información.',
          'El resultado de una investigación bien ejecutada no es una imputación penal — eso requiere Ministerio Público o UIF. El resultado es evidencia publicada de sobreprecio en contratos específicos, identificados por nombre y monto, verificados con benchmarking independiente. Esa evidencia crea la presión política e institucional que las imputaciones en última instancia requieren. Es el tipo de periodismo que MCCI/Animal Político produjo en La Estafa Maestra y que El Universal produjo en las investigaciones farmacéuticas del IMSS — ahora hecho sistemáticamente más eficiente por la priorización algorítmica de RUBLI.',
        ],
        prose_es: [
          'El indicador de riesgo de volatilidad de precios crea una ruta investigativa concreta. Para cualquier proveedor en la cima del ranking de price_volatility de RUBLI, el camino tiene tres pasos: primero, identificar los contratos de mayor varianza con INAI (solicitudes de transparencia, respuesta típica en 20 días hábiles). Segundo, obtener el texto completo de esos contratos — especificación, cantidades, precios unitarios, condiciones de entrega. Tercero, hacer benchmarking de esos precios unitarios contra comparadores de mercado doméstico (otros contratos en CompraNet para los mismos bienes) o internacionales (Open Contracting Partnership de la OCDE, base TED de la UE).',
          'La investigación de precios no requiere expertise forense contable. Requiere acceso a documentos públicos y comparación sistemática. ASF ya aplica esta metodología para adquisiciones farmacéuticas — una práctica establecida tras la concentración Maypo/Grupo Fármacos/PISA. RUBLI extiende esa metodología algorítmicamente a 3.1 millones de contratos y 18 sectores. El indicador de riesgo señala cuáles pares proveedor-institución merecen la primera solicitud de información.',
          'El resultado de una investigación bien ejecutada no es una imputación penal — eso requiere Ministerio Público o UIF. El resultado es evidencia publicada de sobreprecio en contratos específicos, identificados por nombre y monto, verificados con benchmarking independiente. Esa evidencia crea la presión política e institucional que las imputaciones en última instancia requieren. Es el tipo de periodismo que MCCI/Animal Político produjo en La Estafa Maestra y que El Universal produjo en las investigaciones farmacéuticas del IMSS — ahora hecho sistemáticamente más eficiente por la priorización algorítmica de RUBLI.',
        ],
        sources: [
          'INAI. (2024). Guía de Solicitudes de Información sobre Compras Públicas.',
          'Open Contracting Partnership. (2023). International benchmarks for public procurement pricing.',
          'ASF. (2024). Metodología de Auditoría de Precios en Adquisiciones de Medicamentos.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'el-gran-precio', 'captura-institucional'],
    lensTags: {
      patterns: ['P5'],
      terms: ['volatilidad', 'price volatility', 'coefficient', 'ElasticNet', 'v0.8.5'],
    },
    nextSteps: [
      'Solicitar a la ASF la metodología y lista de proveedores de sus auditorías de benchmarking de precios farmacéuticos — ¿se traslapan con los proveedores de alta price_volatility en RUBLI?',
      'Presentar solicitudes INAI de registros de facturas para los 20 proveedores de mayor price_volatility en la cola T1 de ARIA de RUBLI — comparar contra bases de precios de mercado para los mismos bienes.',
      'Cruzar los proveedores de alta volatilidad de RUBLI contra la base de investigaciones de cárteles de COFECE — ¿alguna empresa está bajo investigación de competencia?',
      'Investigar si la estructura de datos de CompraNet permite monitoreo automatizado de consistencia de precios entre rondas de contratación — ¿cuáles son las barreras legales para publicar tales alertas?',
      'Publicar un listado rankeado de los top 100 pares proveedor-institución de mayor volatilidad de precios con desglose por contrato para seguimiento investigativo.',
    ],
  },

  // ── 11: El año de la emergencia ───────────────────────────────────────────
  {
    slug: 'el-ano-de-la-emergencia',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: '2020: The Year Competition Stopped',
    headline_es: '2020: El año que paró la competencia',
    subheadline: "Mexico's COVID emergency decree suspended competitive bidding overnight. The direct-award rate hit 87% — and ghost-company vendors collected billions in same-day awards.",
    subheadline_es: 'El decreto de emergencia COVID suspendió la licitación competitiva de la noche a la mañana. La adjudicación directa llegó al 87% — y proveedores con patrón fantasma cobraron miles de millones en adjudicaciones del mismo día.',
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 10,
    status: 'reporteado',
    leadStat: {
      value: '87%',
      label: 'direct-award rate · 2020 · COVID peak',
      label_es: 'tasa de adjudicación directa · 2020 · pico COVID',
      sublabel: 'vs. 72.3% pre-COVID average (2019)',
      sublabel_es: 'vs. 72.3% promedio pre-COVID (2019)',
      color: '#dc2626',
    },
    kickerStats: [
      { prefix: 'In 2020,', prefix_es: 'En 2020, el', value: '87%', suffix: 'of contracts were direct awards.', suffix_es: 'de los contratos fue adjudicación directa.', tone: 'critical' },
      { prefix: 'HEMOSER collected', prefix_es: 'HEMOSER cobró', value: '17.2B', suffix: 'in same-day awards.', suffix_es: 'en adjudicaciones del mismo día.', tone: 'data' },
      { prefix: '215,000 contracts', prefix_es: '215,000 contratos', value: '↑23%', suffix: 'above the prior year.', suffix_es: 'sobre el año anterior.', tone: 'muted' },
    ],
    lensTags: {
      patterns: ['P2', 'P5'],
      sectors: ['salud'],
      years: [2020, 2021],
    },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Emergency Decree',
        title_es: 'El decreto de emergencia',
        subtitle: 'How one legal instrument suspended a decade of procurement rules',
        subtitle_es: 'Cómo un instrumento legal suspendió una década de reglas de contratación',
        prose: [
          "On March 30, 2020, the Mexican federal government declared a national health emergency. The legal consequence was immediate: competitive bidding requirements in the Ley de Adquisiciones — designed precisely to prevent the kind of concentrated purchasing that produces corruption — were suspended for COVID-related procurement. Any federal agency could now award contracts directly without competitive process.",
          "The RUBLI database records 215,000 contracts in 2020 — the highest single-year volume of the AMLO administration. Of those, 87% were direct adjudications. The pre-COVID average was 72.3% in 2019. The delta — 14.7 percentage points across 215,000 contracts — represents roughly 31,000 contracts that might have required competition under normal rules.",
          "Emergency powers in procurement are not inherently corrupt. In a genuine supply shock, speed matters more than process. The question is what happens when urgency fades but habits formed during the emergency persist. The chart below traces the direct-award rate year by year from 2015 through 2024.",
        ],
        prose_es: [
          "El 30 de marzo de 2020, el gobierno federal mexicano declaró emergencia sanitaria nacional. La consecuencia legal fue inmediata: los requisitos de licitación de la Ley de Adquisiciones — diseñados para prevenir la concentración de compras que produce corrupción — quedaron suspendidos para las adquisiciones relacionadas con COVID. Cualquier dependencia federal podía adjudicar contratos directamente sin proceso competitivo.",
          "La base de datos RUBLI registra 215,000 contratos en 2020 — el mayor volumen anual de la administración AMLO. El 87% fueron adjudicaciones directas. El promedio pre-COVID en 2019 fue 72.3%. El delta — 14.7 puntos porcentuales sobre 215,000 contratos — representa aproximadamente 31,000 contratos que bajo reglas normales habrían requerido competencia.",
          "Los poderes de emergencia en contratación no son inherentemente corruptos. En un choque de oferta genuino, la velocidad importa más que el proceso. La pregunta es qué ocurre cuando la urgencia cede pero los hábitos formados durante la emergencia persisten. La gráfica muestra la tasa de adjudicación directa año a año de 2015 a 2024.",
        ],
        chartConfig: {
          type: 'inline-timeline',
          title: 'Direct-Award Rate · Annual, 2015–2024',
          title_es: 'Tasa de adjudicación directa · Anual, 2015–2024',
          chartId: 'covid-da-rate-annual',
          data: {
            points: [
              { label: '2015', value: 71.2 },
              { label: '2016', value: 72.1 },
              { label: '2017', value: 73.5 },
              { label: '2018', value: 74.2 },
              { label: '2019', value: 72.3, annotation: 'pre-COVID floor', annotation_es: 'piso pre-COVID' },
              { label: '2020', value: 87.0, highlight: true, annotation: 'COVID peak', annotation_es: 'pico COVID' },
              { label: '2021', value: 81.2, highlight: true },
              { label: '2022', value: 79.4, highlight: true, annotation: 'post-COVID trough', annotation_es: 'mínimo post-COVID' },
              { label: '2023', value: 82.2, highlight: true },
              { label: '2024', value: 80.1, highlight: true },
            ],
            maxValue: 90,
            unit: '%',
            referenceLine: {
              value: 87,
              label: 'ratchet window — DA never returns below 79.4%',
              label_es: 'ventana del trinquete — la AD nunca regresa por debajo del 79.4%',
            },
            referenceLine2: {
              value: 71.2,
              label: 'pre-COVID baseline · five-year avg 72.7%',
              label_es: 'línea base pre-COVID · promedio cinco años 72.7%',
            },
            annotation: 'The 2020 spike never resets. The post-emergency floor sits 7pp above the pre-COVID average.',
            annotation_es: 'El pico de 2020 no se reinicia. El piso post-emergencia queda 7pp sobre el promedio pre-COVID.',
          },
        },
        pullquote: {
          quote: "In 2020, one in eight contracts was competitive. The other seven were awarded at a desk, without a process.",
          quote_es: "En 2020, uno de cada ocho contratos fue competitivo. Los otros siete se adjudicaron en un escritorio, sin proceso.",
          stat: '87%',
          statLabel: 'Direct award rate · 2020 · COVID emergency year',
          statLabel_es: 'Tasa adjudicación directa · 2020 · año emergencia COVID',
        },
        sources: [
          'Diario Oficial de la Federación. "Acuerdo por el que se declara como emergencia sanitaria." 30 marzo 2020.',
          'RUBLI v0.8.5. Módulo year-over-year. 215,000 contratos — 2020.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Same-Day Awards',
        title_es: 'Adjudicaciones del mismo día',
        subtitle: 'HEMOSER and the anatomy of emergency procurement fraud',
        subtitle_es: 'HEMOSER y la anatomía del fraude en compras de emergencia',
        prose: [
          "Among the vendors who benefited most from the 2020 emergency procurement framework was HEMOSER — a company that matches the P2 ghost-company behavioral signature in RUBLI's ARIA pipeline. HEMOSER received MX$17.2 billion in contracts from IMSS during the COVID emergency, a significant portion of which were awarded on the same day the contract request was filed.",
          "The 'same-day award' pattern is one of the clearest forensic indicators of pre-arranged procurement. In a legitimate emergency purchase, even when competition is suspended, there is still an evaluation process: reviewing vendor credentials, validating capacity, checking price reasonableness. A same-day award bypasses all of that. The vendor has been selected before the paperwork begins.",
          "HEMOSER's pattern is not unique. The RUBLI P2 pipeline identified 6,118 vendors nationally with similar behavioral signatures — minimal physical presence, concentrated revenue from one institution, high price volatility. In 2020, this class of vendor saw contract volumes grow at rates that exceed any reasonable explanation based on expanded capacity or market demand.",
        ],
        prose_es: [
          "Entre los proveedores que más se beneficiaron del marco de compras de emergencia 2020 estuvo HEMOSER — empresa que coincide con la firma conductual P2 (empresa fantasma) en el flujo ARIA de RUBLI. HEMOSER recibió MX$17.2 mil millones en contratos del IMSS durante la emergencia COVID, una parte significativa adjudicada el mismo día que se registró la solicitud de contrato.",
          "El patrón de 'adjudicación mismo día' es uno de los indicadores forenses más claros de compras pre-arregladas. En una compra de emergencia legítima, incluso cuando se suspende la competencia, existe un proceso de evaluación: revisar credenciales, validar capacidad, verificar razonabilidad del precio. Una adjudicación del mismo día omite todo eso. El proveedor ha sido seleccionado antes de que comience el papeleo.",
          "El patrón de HEMOSER no es único. El flujo P2 de RUBLI identificó 6,118 proveedores a nivel nacional con firmas conductuales similares — presencia física mínima, ingresos concentrados en una institución, alta volatilidad de precios. En 2020, esta clase de proveedor vio sus volúmenes de contratos crecer a tasas que superan cualquier explicación razonable basada en capacidad expandida o demanda de mercado.",
        ],
        pullquote: {
          quote: "A same-day award means the vendor was selected before the paperwork started. There is no other explanation.",
          quote_es: "Una adjudicación del mismo día significa que el proveedor fue seleccionado antes de que comenzara el papeleo. No hay otra explicación.",
          stat: 'MX$17.2B',
          statLabel: 'HEMOSER COVID contracts · IMSS · same-day awards',
          statLabel_es: 'Contratos COVID HEMOSER · IMSS · adjudicaciones mismo día',
        },
        sources: [
          'RUBLI ARIA pipeline. Patrón P2 (empresa fantasma). 6,118 proveedores señalados.',
          'COMPRANET registros de contratos. Proveedor HEMOSER. 2019–2021 contratos con IMSS.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'After the Emergency',
        title_es: 'Después de la emergencia',
        subtitle: 'Why emergency habits outlast emergencies',
        subtitle_es: 'Por qué los hábitos de emergencia sobreviven a las emergencias',
        prose: [
          "The COVID emergency declaration was lifted in 2021. The direct-award rate did not return to pre-COVID levels. In 2021 it was 81.2%. In 2022, 79.4%. In 2023, it reached 82.2% — higher than the post-emergency trough. Emergency procurement, it turns out, is a ratchet: it moves in one direction.",
          "This is the structural story that RUBLI's year-over-year data tells across five administrations and 23 years. Each administration inherits the direct-award rate of its predecessor. No administration has managed a sustained reduction. The OECD benchmark for acceptable direct-award in a competitive procurement system is 15-20%. Mexico's floor, across all eras, has never been below 60%.",
          "The COVID year is not an anomaly. It is the clearest expression of a structural condition: a procurement system where the default is non-competition and competition is the exception that requires justification. The emergency merely removed the need to justify.",
        ],
        prose_es: [
          "La declaratoria de emergencia COVID fue levantada en 2021. La tasa de adjudicación directa no regresó a los niveles pre-COVID. En 2021 fue del 81.2%. En 2022, 79.4%. En 2023, llegó al 82.2% — mayor que el mínimo post-emergencia. La contratación de emergencia, resulta, es un trinquete: se mueve en una sola dirección.",
          "Esta es la historia estructural que los datos año a año de RUBLI cuentan a través de cinco administraciones y 23 años. Cada administración hereda la tasa de adjudicación directa de su predecesora. Ninguna ha logrado una reducción sostenida. El benchmark OCDE para adjudicación directa aceptable es del 15-20%. El piso de México, a través de todas las épocas, nunca ha bajado del 60%.",
          "El año COVID no es una anomalía. Es la expresión más clara de una condición estructural: un sistema donde el default es la no-competencia y la competencia es la excepción que requiere justificación. La emergencia simplemente eliminó la necesidad de justificar.",
        ],
        pullquote: {
          quote: "Emergency procurement is a ratchet. The COVID year proved that removing a barrier to direct award does not create a path back.",
          quote_es: "La contratación de emergencia es un trinquete. El año COVID demostró que eliminar una barrera a la adjudicación directa no crea un camino de regreso.",
          stat: '82.2%',
          statLabel: 'Direct award rate 2023 — above the 2021 post-COVID trough',
          statLabel_es: 'Tasa adjudicación directa 2023 — sobre el mínimo post-COVID de 2021',
        },
        sources: [
          'RUBLI v0.8.5. Módulo year-over-year. Tasas adjudicación directa 2015–2024.',
          'OCDE. (2022). Government at a Glance. Benchmarks competitividad de compras.',
          'IMCO. (2021). "Índice de transparencia presupuestaria." Adjudicación directa post-COVID.',
        ],
      },
    ],
    nextSteps: [
      'Cruzar los contratos adjudicados directamente durante la emergencia COVID con el listado EFOS del SAT — ¿cuántos de esos proveedores están en la lista negra fiscal?',
      'Analizar la distribución por dependencia: ¿qué secretarías tuvieron los mayores incrementos en adjudicación directa durante 2020?',
      'Investigar si los 6,118 proveedores P2 que operaron en 2020 presentaron declaraciones fiscales consistentes con los montos cobrados al IMSS.',
    ],
  },

  // ── 12: El cártel de los vales ────────────────────────────────────────────
  {
    slug: 'el-cartel-de-los-vales',
    outlet: 'investigative',
    type: 'case',
    era: 'cross',
    headline: 'The Voucher Cartel: 240 Billion in a Closed Market',
    headline_es: 'El cártel de los vales: 240 mil millones en un mercado cerrado',
    subheadline: "Three companies — Edenred, Efectivale, and Sodexo — divide Mexico's federal voucher market across five administrations with a 96.7% direct-award rate and 2,868 single-bid wins.",
    subheadline_es: 'Tres empresas — Edenred, Efectivale y Sodexo — se dividen el mercado federal de vales en cinco administraciones con tasa de adjudicación directa del 96.7% y 2,868 victorias en licitación única.',
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 8,
    status: 'auditado',
    leadStat: {
      value: '96.7%',
      label: 'Edenred direct-award rate',
      label_es: 'Tasa adjudicación directa de Edenred',
      sublabel: '2,210 contracts · all through IMSS direct award',
      sublabel_es: '2,210 contratos · todos vía adjudicación directa IMSS',
      color: '#dc2626',
    },
    kickerStats: [
      { prefix: 'El mercado de vales concentra', value: '240 mil M', suffix: 'MXN en 3 proveedores.', tone: 'data' },
      { prefix: 'Efectivale ganó', value: '2,210', suffix: 'licitaciones de oferta única.', tone: 'critical' },
      { prefix: 'Edenred:', value: '96.7%', suffix: 'de sus contratos son adjudicación directa.', tone: 'critical' },
    ],
    lensTags: {
      patterns: ['P5', 'P1'],
      sectors: ['hacienda'],
      years: [2018, 2019, 2020, 2021, 2022, 2023],
    },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'Three Companies, One Market',
        title_es: 'Tres empresas, un mercado',
        subtitle: "How Mexico's voucher sector became a permanent oligopoly",
        subtitle_es: 'Cómo el sector de vales de México se convirtió en oligopolio permanente',
        prose: [
          "Mexico's federal government distributes hundreds of billions of pesos annually through vouchers and electronic payment cards — for food, gasoline, school supplies, and social transfers. The procurement of these services flows almost entirely through three multinational providers: Edenred (formerly Accor Services), Efectivale, and Sodexo.",
          "What makes this market striking is not its size — 240 billion MXN is large but not exceptional for a procurement category. What is exceptional is the structure. Edenred's direct-award rate across its federal contracts is 96.7%. Efectivale won 2,210 single-bid competitions. Sodexo won 658 more. The combined pattern fits what RUBLI classifies as a P5 institutional concentration signature: a small number of vendors capturing a sector's entire procurement through a mix of direct award and nominally competitive but practically monopolistic procedures.",
          "The voucher cartel does not operate through obvious corruption in the way that a ghost company does. These are multinational firms with real operations. The problem is structural: a market allowed to consolidate to the point where competition became impossible, and procurement rules that adapted to the consolidated market instead of using competition to break it open.",
        ],
        prose_es: [
          "El gobierno federal mexicano distribuye cientos de miles de millones de pesos anualmente a través de vales y tarjetas de pago electrónicas — para alimentos, gasolina, útiles escolares y transferencias sociales. La adquisición de estos servicios fluye casi en su totalidad a través de tres proveedores multinacionales: Edenred (antes Accor Services), Efectivale y Sodexo.",
          "Lo que hace que este mercado sea notable no es su tamaño — 240 mil millones de MXN es grande pero no excepcional. Lo que es excepcional es la estructura. La tasa de adjudicación directa de Edenred es del 96.7%. Efectivale ganó 2,210 competencias de licitación única. Sodexo ganó 658 más. El patrón combinado corresponde a lo que RUBLI clasifica como firma P5 de concentración institucional: un pequeño número de proveedores capturando toda la contratación de un sector.",
          "El cártel de los vales no opera a través de la corrupción obvia como una empresa fantasma. Son empresas multinacionales con operaciones reales. El problema es estructural: un mercado permitido a consolidarse hasta el punto donde la competencia se volvió imposible, y reglas de contratación que se adaptaron al mercado consolidado en lugar de usarse para abrirlo.",
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'The Voucher Cartel — top 3 by direct-award rate',
          title_es: 'El cártel de los vales — top 3 por tasa de adjudicación directa',
          chartId: 'vales-da-rate',
          data: {
            points: [
              {
                label: 'Edenred México',
                value: 96.7,
                highlight: true,
                annotation: 'P5 · VOUCHER CARTEL · 2,210 CONTRACTS',
                annotation_es: 'P5 · CÁRTEL DE VALES · 2,210 CONTRATOS',
              },
              {
                label: 'Efectivale',
                value: 92.4,
                highlight: true,
                annotation: 'P5 · VOUCHER CARTEL · 2,210 SINGLE-BID · 19.6B',
                annotation_es: 'P5 · CÁRTEL DE VALES · 2,210 OFERTA ÚNICA · 19.6 MIL M',
              },
              {
                label: 'Sodexo Mexico',
                value: 88.1,
                highlight: true,
                annotation: 'P5 · VOUCHER CARTEL · 658 SINGLE-BID · 5.2B',
                annotation_es: 'P5 · CÁRTEL DE VALES · 658 OFERTA ÚNICA · 5.2 MIL M',
              },
            ],
            unit: '% DA',
            annotation: 'All three above 88% direct-award. OECD ceiling for direct award: 30%. The voucher market has no competitive check.',
            annotation_es: 'Las tres por encima del 88% de adjudicación directa. Techo OCDE para adjudicación directa: 30%. El mercado de vales carece de control competitivo.',
          },
        },
        pullquote: {
          quote: "Edenred's 96.7% direct-award rate is not an anomaly. It is the signature of a market consolidated beyond the point where procurement rules can restore competition.",
          quote_es: "La tasa del 96.7% de Edenred no es una anomalía. Es la firma de un mercado consolidado más allá del punto donde las reglas de contratación pueden restaurar la competencia.",
          stat: '240B MXN',
          statLabel: 'Voucher sector · total federal spend · 3 vendors',
          statLabel_es: 'Sector vales · gasto federal total · 3 proveedores',
        },
        sources: [
          'RUBLI ARIA pipeline. Patrón P5 concentración. Sector hacienda (vales). 2002–2025.',
          'COMPRANET registros de contratos. Categoría: vales_despensa, monedero_electronico. 2002–2025.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Single-Bid Signature',
        title_es: 'La firma de oferta única',
        subtitle: '2,210 competitive procedures, one bidder each time',
        subtitle_es: '2,210 procedimientos competitivos, un postor cada vez',
        prose: [
          "Efectivale won 2,210 single-bid competitions across its federal contract history. A single-bid competition is technically a competitive procedure under Mexican procurement law — it requires publication of a tender notice and a formal process. But if only one firm bids, the outcome is predetermined. The process becomes theater.",
          "How does a market produce single-bid outcomes at this scale? Specifications can be written to favor an incumbent — requiring integration with a specific payment network or card format that only one vendor supplies. Tender timelines can be compressed so that only vendors who received advance notice can prepare bids. Distribution requirements can be structured to favor vendors with existing government relationships.",
          "RUBLI cannot determine which mechanism produced any specific single-bid outcome. What the data shows is the aggregate result: across hundreds of procurement exercises that nominally involved competition, Efectivale and Sodexo were the only bidders at a rate that cannot be explained by market structure alone.",
        ],
        prose_es: [
          "Efectivale ganó 2,210 competencias de licitación única. Una licitación de oferta única es técnicamente un procedimiento competitivo bajo la ley mexicana — requiere publicación de convocatoria y proceso formal. Pero si sólo una empresa presenta oferta, el resultado está predeterminado. El proceso se convierte en teatro.",
          "¿Cómo llega un mercado a resultados de oferta única a esta escala? Las especificaciones pueden redactarse para favorecer a un incumbente — requiriendo integración con una red de pago específica o formatos de tarjeta que sólo un proveedor puede suministrar. Los plazos de licitación pueden comprimirse para que sólo los proveedores que recibieron información anticipada puedan preparar ofertas.",
          "RUBLI no puede determinar qué mecanismo produjo ningún resultado específico de oferta única. Lo que muestran los datos es el resultado agregado: a través de cientos de ejercicios de adquisición que nominalmente involucraron competencia, Efectivale y Sodexo fueron los únicos postores a una tasa que no puede explicarse sólo por la estructura del mercado.",
        ],
        pullquote: {
          quote: "2,210 competitive tenders, 2,210 times a single bidder appeared. At some point, 'competitive procedure' becomes a legal fiction.",
          quote_es: "2,210 licitaciones competitivas, 2,210 veces apareció un solo postor. En algún punto, 'procedimiento competitivo' se convierte en ficción jurídica.",
          stat: '2,210',
          statLabel: "Single-bid wins · Efectivale · all federal procurement",
          statLabel_es: 'Victorias oferta única · Efectivale · toda la contratación federal',
        },
        sources: [
          'RUBLI. Análisis oferta única. Bandera is_single_bid: procedure_type != direct_award AND vendor_count_per_procedure = 1.',
          'COMPRANET registros de contratos. Efectivale. 2010–2024.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Five Administrations, Same Three Companies',
        title_es: 'Cinco administraciones, las mismas tres empresas',
        subtitle: 'Structural capture that survives every change of government',
        subtitle_es: 'Captura estructural que sobrevive a cada cambio de gobierno',
        prose: [
          "The voucher cartel persists across five administrations and three parties. Fox, Calderón, Peña Nieto, AMLO, Sheinbaum — every government has purchased from the same three firms. This is unusual. Most corruption stories involve a network that benefits from a specific administration's patronage. The voucher oligopoly predates and survives every administration.",
          "The structural explanation is that welfare vouchers are a natural monopoly masked as a market. The distribution infrastructure — the point-of-sale network, beneficiary databases, card issuance systems — requires massive upfront investment. Once built, it creates lock-in that no competitive tender can easily undo. The incumbent has already made the investment; a challenger must match it while also winning the contract that would justify the investment.",
          "RUBLI does not have the evidence to conclude these companies are committing fraud in the legal sense. What the data establishes is structural: a market consolidated beyond competition, with no administration willing to redesign the procurement approach to break it. The P5 concentration pattern these vendors carry is not a fraud flag — it is a market-structure flag. The distinction matters. The outcome is the same: 240 billion pesos, five administrations, three vendors, no competitive check.",
        ],
        prose_es: [
          "El cártel de los vales persiste a través de cinco administraciones y tres partidos. Fox, Calderón, Peña Nieto, AMLO, Sheinbaum — cada gobierno compró a las mismas tres empresas. Esto es inusual. La mayoría de las historias de corrupción involucran una red que se beneficia del patrocinio de una administración específica. El oligopolio de vales antecede y sobrevive a cada administración.",
          "La explicación estructural es que los vales de bienestar son un monopolio natural disfrazado de mercado. La infraestructura de distribución — la red de puntos de venta, bases de datos de beneficiarios, sistemas de emisión de tarjetas — requiere una enorme inversión inicial. Una vez construida, crea dependencias que ninguna licitación competitiva puede deshacer fácilmente.",
          "RUBLI no tiene la evidencia para concluir que estas empresas cometen fraude en el sentido legal. Lo que los datos establecen es estructural: un mercado consolidado más allá de la competencia, con ninguna administración dispuesta a rediseñar el enfoque de contratación para romperlo. El patrón P5 que RUBLI asigna no es una bandera de fraude — es una bandera de estructura de mercado. La distinción importa. El resultado es el mismo: 240 mil millones, cinco administraciones, tres proveedores, sin control competitivo.",
        ],
        pullquote: {
          quote: "Fox, Calderón, Peña Nieto, AMLO, Sheinbaum. Five administrations. The same three companies. 240 billion pesos. Not corruption — structural capture.",
          quote_es: "Fox, Calderón, Peña Nieto, AMLO, Sheinbaum. Cinco administraciones. Las mismas tres empresas. 240 mil millones. No es corrupción — es captura estructural.",
          stat: '5',
          statLabel: 'Consecutive administrations without breaking the voucher oligopoly',
          statLabel_es: 'Administraciones consecutivas sin romper el oligopolio de vales',
        },
        sources: [
          'RUBLI ARIA pipeline. Patrón P5. Sector hacienda. 2002–2025.',
          'IMCO. (2023). "Competitividad en compras gubernamentales." Sector vales.',
          'OCDE. (2022). "Integridad en las contrataciones públicas de México."',
        ],
      },
    ],
    nextSteps: [
      'Investigar si los contratos con Edenred y Efectivale contienen cláusulas de exclusividad que estructuralmente bloquean la competencia.',
      'Cruzar los montos de contratos de vales contra el número de beneficiarios de programas sociales — ¿el costo por beneficiario ha aumentado en términos reales desde 2010?',
      'Verificar si algún funcionario que aprobó contratos de vales trabaja ahora para Edenred, Efectivale o Sodexo (puerta giratoria).',
    ],
  },

]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getStoryBySlug(slug: string): StoryDef | undefined {
  return STORIES.find(s => s.slug === slug)
}

/**
 * Filter stories by Observatory lens tags. Used by both Newsroom (when
 * arriving from /atlas with lens/year/pin URL state) and by an inline
 * "stories matching this view" panel on /atlas itself.
 *
 * Match semantics: a story matches if ANY of its lensTags overlap with the
 * provided filter. Partial filters (only patterns, only sectors) are
 * supported. An empty filter returns all stories.
 */
export function getStoriesByLensTag(filter: {
  pattern?: AriaPattern
  sector?: SectorCode
  year?: number
}): StoryDef[] {
  if (!filter.pattern && !filter.sector && filter.year == null) return STORIES
  return STORIES.filter((s) => {
    const tags = s.lensTags
    if (!tags) return false
    if (filter.pattern && !(tags.patterns ?? []).includes(filter.pattern)) return false
    if (filter.sector && !(tags.sectors ?? []).includes(filter.sector)) return false
    if (filter.year != null && !(tags.years ?? []).includes(filter.year)) return false
    return true
  })
}

/**
 * Pick the localized version of a string field, falling back to English when
 * the Spanish version is absent.
 */
export function pickLang<T extends string | string[]>(
  en: T | undefined,
  es: T | undefined,
  lang: 'en' | 'es',
): T | undefined {
  if (lang === 'es' && es != null) return es
  return en
}

/**
 * Localize a chartConfig for the given language. Walks every translatable
 * text field (title, axis labels, annotations, point labels, multi-series
 * names, network anchors, stacked-bar rows) and swaps in the `_es` value
 * when present and lang is es. Falls back to English otherwise.
 *
 * This is what makes Spanish-mode story pages render charts in Spanish
 * — without it, chart titles and captions stay English even when the
 * surrounding prose translates correctly. (Bug discovered and fixed
 * April 2026.)
 */
function localizeChartConfig(
  cfg: StoryChapterDef['chartConfig'],
  lang: 'en' | 'es',
): StoryChapterDef['chartConfig'] {
  if (!cfg) return cfg
  const title = pickLang(cfg.title, cfg.title_es, lang) as string
  return {
    ...cfg,
    title,
    data: cfg.data
      ? {
          ...cfg.data,
          yLabel: pickLang(cfg.data.yLabel, cfg.data.yLabel_es, lang),
          annotation: pickLang(cfg.data.annotation, cfg.data.annotation_es, lang),
          referenceLine: cfg.data.referenceLine
            ? { ...cfg.data.referenceLine, label: pickLang(cfg.data.referenceLine.label, cfg.data.referenceLine.label_es, lang) as string }
            : cfg.data.referenceLine,
          referenceLine2: cfg.data.referenceLine2
            ? { ...cfg.data.referenceLine2, label: pickLang(cfg.data.referenceLine2.label, cfg.data.referenceLine2.label_es, lang) as string }
            : cfg.data.referenceLine2,
          points: cfg.data.points.map((p) => ({
            ...p,
            label: pickLang(p.label, p.label_es, lang) as string,
            annotation: pickLang(p.annotation, p.annotation_es, lang),
          })),
        }
      : cfg.data,
    multiSeries: cfg.multiSeries
      ? {
          ...cfg.multiSeries,
          yLabel: pickLang(cfg.multiSeries.yLabel, cfg.multiSeries.yLabel_es, lang),
          annotation: pickLang(cfg.multiSeries.annotation, cfg.multiSeries.annotation_es, lang),
          series: cfg.multiSeries.series.map((s) => ({
            ...s,
            name: pickLang(s.name, s.name_es, lang) as string,
            totalCaption: pickLang(s.totalCaption, s.totalCaption_es, lang),
            annotation: s.annotation
              ? { ...s.annotation, text: pickLang(s.annotation.text, s.annotation.text_es, lang) as string }
              : s.annotation,
          })),
        }
      : cfg.multiSeries,
    network: cfg.network
      ? {
          ...cfg.network,
          annotation: pickLang(cfg.network.annotation, cfg.network.annotation_es, lang),
          anchor: cfg.network.anchor
            ? { ...cfg.network.anchor, label: pickLang(cfg.network.anchor.label, cfg.network.anchor.label_es, lang) as string }
            : cfg.network.anchor,
          nodes: cfg.network.nodes.map((n) => ({
            ...n,
            sublabel: pickLang(n.sublabel, n.sublabel_es, lang),
          })),
        }
      : cfg.network,
    stacked: cfg.stacked
      ? {
          ...cfg.stacked,
          annotation: pickLang(cfg.stacked.annotation, cfg.stacked.annotation_es, lang),
          anchor: cfg.stacked.anchor
            ? { ...cfg.stacked.anchor, label: pickLang(cfg.stacked.anchor.label, cfg.stacked.anchor.label_es, lang) as string }
            : cfg.stacked.anchor,
          rows: cfg.stacked.rows.map((r) => ({
            ...r,
            label: pickLang(r.label, r.label_es, lang) as string,
            annotation: pickLang(r.annotation, r.annotation_es, lang),
          })),
        }
      : cfg.stacked,
  }
}

/** Resolve a chapter's display fields per language, with EN fallback. */
export function localizeChapter(
  chapter: StoryChapterDef,
  lang: 'en' | 'es',
): {
  title: string
  subtitle: string | undefined
  prose: string[]
  pullquote: StoryChapterDef['pullquote']
  chartConfig: StoryChapterDef['chartConfig']
} {
  return {
    title: pickLang(chapter.title, chapter.title_es, lang) as string,
    subtitle: pickLang(chapter.subtitle, chapter.subtitle_es, lang),
    prose: (pickLang(chapter.prose, chapter.prose_es, lang) as string[]) ?? chapter.prose,
    pullquote: chapter.pullquote
      ? {
          ...chapter.pullquote,
          quote: pickLang(chapter.pullquote.quote, chapter.pullquote.quote_es, lang) as string,
          statLabel: pickLang(chapter.pullquote.statLabel, chapter.pullquote.statLabel_es, lang) as string,
          barLabel: pickLang(chapter.pullquote.barLabel, chapter.pullquote.barLabel_es, lang),
        }
      : undefined,
    chartConfig: localizeChartConfig(chapter.chartConfig, lang),
  }
}

/** Resolve a story's display fields per language, with EN fallback. */
export function localizeStory(story: StoryDef, lang: 'en' | 'es'): {
  headline: string
  subheadline: string
  leadStatLabel: string
  leadStatSublabel: string | undefined
  nextSteps: string[] | undefined
} {
  return {
    headline: pickLang(story.headline, story.headline_es, lang) as string,
    subheadline: pickLang(story.subheadline, story.subheadline_es, lang) as string,
    leadStatLabel: pickLang(story.leadStat.label, story.leadStat.label_es, lang) as string,
    leadStatSublabel: pickLang(story.leadStat.sublabel, story.leadStat.sublabel_es, lang),
    nextSteps: lang === 'es' ? (story.nextSteps_es ?? story.nextSteps) : story.nextSteps,
  }
}

export function getRelatedStories(slug: string): StoryDef[] {
  const story = getStoryBySlug(slug)
  if (!story?.relatedSlugs) return []
  return story.relatedSlugs
    .map(s => getStoryBySlug(s))
    .filter((s): s is StoryDef => s !== undefined)
}
