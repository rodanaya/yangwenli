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
      | 'vendor-price-trajectory' // n-P3 Volatilidad ch.2
      | 'venn-convergence' // n-P3 Volatilidad ch.4
      | 'editorial-threshold' // P2 ThresholdDistribution
      | 'editorial-thermometer' // P2 AnnotatedThermometer
      | 'editorial-cleveland-pair' // P2 ClevelandPairChart
      | 'inline-roster' // n-ejercito ch3 — roster list of named ghost vendors
      | 'inline-timeline' // n-ejercito ch4 — detection-pipeline timeline
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
  // === STORY 1: The Man Who Won 370 Million Pesos and Disappeared ===
  {
    slug: 'el-ejercito-fantasma',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    byline: 'RUBLI Investigative Data Unit',
    status: 'solo_datos',
    estimatedMinutes: 15,
    headline: 'The Man Who Won 370 Million Pesos and Disappeared',
    headline_es: 'El Hombre Que Ganó 370 Millones de Pesos y Desapareció',
    subheadline:
      "Emilio Carranza Obersohn is one person — not a company — who holds two federal contracts worth roughly 370 million pesos, then leaves no trace in the procurement record. He is one of 6,118 vendors RUBLI's algorithm flags as matching ghost-company patterns across 23 years. Mexico's tax authority has officially confirmed 42 of them. The other 6,076 are still doing business with the government.",
    subheadline_es:
      'Emilio Carranza Obersohn es una persona — no una empresa — que tiene dos contratos federales por aproximadamente 370 millones de pesos, y luego no deja rastro en el registro de contratación. Es uno de los 6,118 proveedores que el algoritmo de RUBLI identifica con patrón de empresa fantasma a lo largo de 23 años. La autoridad fiscal confirmó oficialmente a 42. Los otros 6,076 siguen haciendo negocios con el gobierno.',
    leadStat: {
      value: '6,118',
      label: 'vendors matching the same pattern',
      label_es: 'proveedores con el mismo patrón',
      sublabel: '0.7% officially confirmed',
      sublabel_es: '0.7% confirmados oficialmente',
      color: '#f59e0b',
    },
    kickerStats: [
      {
        prefix: 'One person, not a company, won',
        prefix_es: 'Una persona, no una empresa, ganó',
        value: '370M',
        suffix: 'pesos — then vanished.',
        suffix_es: 'de pesos — y luego desapareció.',
        tone: 'critical',
      },
      {
        prefix: 'He is one of',
        prefix_es: 'Es uno de',
        value: '6,118',
        suffix: 'vendors flagged on the same pattern.',
        suffix_es: 'proveedores marcados con el mismo patrón.',
        tone: 'data',
      },
      {
        prefix: 'The tax authority has confirmed',
        prefix_es: 'La autoridad fiscal ha confirmado',
        value: '42',
        suffix: 'of them.',
        suffix_es: 'de ellos.',
        tone: 'muted',
      },
    ],
    relatedSlugs: [
      'el-umbral-de-los-300k',
      'la-industria-del-intermediario',
      'captura-institucional',
    ],
    lensTags: {
      patterns: ['P2'],
      terms: ['fantasma', 'ghost', 'SAT', 'Art. 69-B'],
    },
    nextSteps: [
      "File freedom-of-information requests to SFP for the complete vendor investigation queue — do any of RUBLI's 6,076 P2 vendors appear?",
      'Cross-reference the top 50 P2-pattern vendors by value against RUPC (Registro Único de Proveedores y Contratistas) to verify business registration and physical address.',
      "Request SAT disclosure of the Art. 69-B investigation pipeline — how many vendors are currently in provisional status and how does the pipeline's priority ranking compare to RUBLI's?",
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
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Vendor With No Past and No Future',
        title_es: 'El Proveedor Sin Pasado ni Futuro',
        subtitle: 'One name, two contracts, 370 million pesos, then nothing',
        subtitle_es: 'Un nombre, dos contratos, 370 millones de pesos, después nada',
        prose: [
          'Emilio Carranza Obersohn appears in the federal procurement record as a single line. He is a physical person — a persona física, not a company — and he holds two contracts worth approximately 370 million pesos, the equivalent of 18 to 25 million US dollars. There is no prior contracting history attached to his name. There is no subsequent contracting history. His activity is concentrated inside a single institution over a single year, and then it stops. One name, two contracts, 370 million pesos, and then nothing.',
          'Mexican procurement law permits individuals to hold federal contracts, and there are legitimate circumstances where a named individual is appropriate: specialized consulting, artistic commissions, small-scale local services. None of those circumstances explain a 370-million-peso individual contract. And Carranza is not alone. Arturo Pueblita Fernández appears with the identical profile — two contracts worth roughly 370 million pesos. Valeria Fernández Díaz follows the same pattern: 370 million pesos, two contracts, a single person rather than a company, gone from the record afterward.',
          "What these three rows describe has a name. Empresas fantasma — ghost companies — are the single most efficient form of procurement fraud ever documented in Mexico. A shell with a rented address, a rotating legal representative, and an RFC bought from a fixer wins a contract worth hundreds of millions of pesos. Payment is wired. Work is never delivered, or delivered by a completely different entity that pockets only a fraction of the invoice. The shell dissolves. The officials who approved the contract move on. Carranza's profile is what that definition looks like on a single row of data.",
          "He was found by a lens that does not read names or domiciles. RUBLI's Pattern 2 (P2) algorithm weighs behavior: a sudden single-year appearance, contract values 10 to 50 times the sector median, no prior activity, no subsequent activity, an RFC that resolves to nothing in the Registro Único de Proveedores y Contratistas, and bursts of activity measured in weeks rather than years. On every one of those axes, Emilio Carranza Obersohn reads as a textbook case.",
        ],
        prose_es: [
          'Emilio Carranza Obersohn aparece en el registro de contratación federal como una sola línea. Es una persona física — no una empresa — y tiene dos contratos por aproximadamente 370 MDP, el equivalente a 18 a 25 millones de dólares estadounidenses. No hay historial previo de contratación asociado a su nombre. No hay contratación posterior. Su actividad se concentra en una sola institución durante un solo año, y luego se detiene. Un nombre, dos contratos, 370 millones de pesos, y después nada.',
          'La ley mexicana de contratación pública permite que las personas físicas tengan contratos federales, y hay circunstancias legítimas en las que un contratista individual nominado es apropiado: consultoría especializada, comisiones artísticas, servicios locales de pequeña escala. Ninguna de esas circunstancias explica un contrato individual de 370 MDP. Y Carranza no está solo. Arturo Pueblita Fernández aparece con el perfil idéntico — dos contratos por aproximadamente 370 MDP. Valeria Fernández Díaz sigue el mismo patrón: 370 MDP, dos contratos, una sola persona en lugar de una empresa, ausente del registro después.',
          'Lo que describen estas tres filas tiene un nombre. Las empresas fantasma son la forma más eficiente de fraude en contratación pública jamás documentada en México. Una entidad de fachada con un domicilio rentado, un representante legal rotativo, y un RFC comprado a un coyote gana un contrato por cientos de millones de pesos. El pago se transfiere. El trabajo nunca se entrega, o lo entrega una entidad totalmente distinta que se queda con apenas una fracción de la factura. La empresa de fachada se disuelve. Los funcionarios que aprobaron el contrato siguen su carrera. El perfil de Carranza es lo que esa definición parece en una sola fila de datos.',
          'Lo encontró un lente que no lee nombres ni domicilios. El algoritmo del Patrón 2 (P2) de RUBLI pondera la conducta: una aparición súbita en un solo año, valores de contrato 10 a 50 veces la mediana sectorial, sin actividad previa, sin actividad posterior, un RFC que no resuelve a nada en el Registro Único de Proveedores y Contratistas, y ráfagas de actividad medidas en semanas más que en años. En cada uno de esos ejes, Emilio Carranza Obersohn se lee como un caso de manual.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'The roster Carranza belongs to: five named P2-pattern vendors',
          title_es: 'El grupo al que pertenece Carranza: cinco proveedores P2 nombrados',
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
            annotation:
              'Five named P2-pattern vendors, top by contract value. Rows 1–2 are foreign-domiciled incorporated entities; rows 3–5 are physical persons — not companies — each holding ≈370M-peso federal contracts and then disappearing from the procurement record entirely.',
            annotation_es:
              'Cinco proveedores P2 nombrados, principales por valor de contrato. Las filas 1–2 son entidades incorporadas con domicilio extranjero; las filas 3–5 son personas físicas — no empresas — cada una con contratos federales por ≈370 MDP, y luego desaparecen completamente del registro de contratación.',
          },
        },
        pullquote: {
          quote:
            'An individual person — not a company — winning federal contracts worth 370 million pesos, and then disappearing from the record entirely.',
          quote_es:
            'Una persona física — no una empresa — ganando contratos federales por 370 MDP, y luego desapareciendo completamente del registro.',
          stat: '370M',
          statLabel: 'won by one individual, two contracts, then gone',
          statLabel_es: 'ganados por una persona, dos contratos, después nada',
        },
        sources: [
          'RUBLI vendor_stats and aria_queue tables, queried April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025.',
          'RUBLI ARIA Pipeline v1.1. Pattern 2 (P2) classification, run ID 28d5c453, March 25 2026.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Pull Back the Camera',
        title_es: 'Abre el Plano',
        subtitle: 'From one anomaly to a population of 6,118',
        subtitle_es: 'De una anomalía a una población de 6,118',
        prose: [
          'Carranza is one row in a much larger field. When RUBLI ran P2 across the full 3,051,294 federal contracts from 2002 through 2025, the algorithm flagged 6,118 vendors representing 39.6 billion pesos in total contract value. Two of those rows are foreign-domiciled corporations — RAPISCAN SYSTEMS INC, registered in the United States, with two contracts totaling 2.5 billion pesos; APIS FOOD BV, registered in the Netherlands, with three contracts totaling 732 million pesos. The use of foreign suppliers is not inherently suspicious; Mexico contracts internationally as a matter of routine. The signature does not weigh domicile. It weighs behavior. Carranza is simply one of the more legible rows in a population that runs to the thousands.',
          "There is an official benchmark for that population. Mexico's Servicio de Administración Tributaria (SAT) maintains a definitive list of confirmed ghost companies under Article 69-B of the Código Fiscal de la Federación — the EFOS registry. As of April 2026 it contains 13,960 entities stretching back to 2014. That list took a decade to build and required investigators to prove each case individually, with simulated invoices and sworn testimony. It is the gold standard of ghost-company detection in Mexico, and it is catastrophically incomplete.",
          "Cross-checking RUBLI's 6,118 P2 vendors against the SAT Art. 69-B definitive registry produces a single, damning statistic: 42 matches. The detection rate of official Mexican ghost-company enforcement, measured against RUBLI's behavioral population, is 0.7 percent. One in 145 P2-flagged vendors has been officially confirmed. The other 144 are still contracting.",
          'The dot grid below is the visual audit. Each point is one vendor; 6,118 in all. The 42 SAT-confirmed are colored. The rest of the field is left uncolored, and the uncolored field is the problem. It is not a claim that every uncolored point represents fraud — P2 is a pattern classifier, and an uncolored point is not proven fraud. Some will turn out to be legitimate specialized suppliers, some foreign vendors with genuinely thin Mexican histories, some one-time subcontractors. But the baseline expectation in procurement fraud research is that 20 to 40 percent of P2-type behavioral signatures correspond to actual fraud. Applied to the 6,076 unconfirmed vendors, that implies a universe of 1,200 to 2,400 unrecognized ghost companies — roughly 1,200 as the structural minimum — operating in federal procurement right now. SAT has found 42.',
        ],
        prose_es: [
          'Carranza es una fila en un campo mucho más grande. Cuando RUBLI corrió el P2 sobre los 3,051,294 contratos federales completos de 2002 a 2025, el algoritmo identificó 6,118 proveedores que representan 39,600 MDP en valor total contratado. Dos de esas filas son corporaciones con domicilio extranjero — RAPISCAN SYSTEMS INC, registrada en Estados Unidos, con dos contratos por un total de 2,500 MDP; APIS FOOD BV, registrada en los Países Bajos, con tres contratos por 732 MDP. El uso de proveedores extranjeros no es inherentemente sospechoso; México contrata internacionalmente de manera rutinaria. La firma no pondera el domicilio. Pondera la conducta. Carranza es simplemente una de las filas más legibles de una población que llega a los miles.',
          'Existe un parámetro oficial para esa población. El Servicio de Administración Tributaria (SAT) mantiene un listado definitivo de empresas fantasma confirmadas conforme al Artículo 69-B del Código Fiscal de la Federación — el padrón EFOS. A abril de 2026 contiene 13,960 entidades que se remontan a 2014. Esa lista tomó una década en construirse y exigió que los investigadores demostraran cada caso individualmente, con facturas simuladas y testimonios bajo protesta. Es el estándar de oro de la detección de empresas fantasma en México, y está catastróficamente incompleta.',
          'Cruzar los 6,118 proveedores P2 de RUBLI contra el padrón definitivo del SAT bajo el Art. 69-B arroja una sola estadística devastadora: 42 coincidencias. La tasa de detección de la fiscalización oficial mexicana de empresas fantasma, medida contra la población conductual de RUBLI, es del 0.7 por ciento. Uno de cada 145 proveedores marcados por P2 ha sido confirmado oficialmente. Los otros 144 siguen contratando.',
          'La cuadrícula de puntos de abajo es la auditoría visual. Cada punto es un proveedor; 6,118 en total. Los 42 confirmados por el SAT están coloreados. El resto del campo permanece sin colorear, y ese campo sin colorear es el problema. No es una afirmación de que cada punto sin colorear represente fraude — P2 es un clasificador de patrones, y un punto sin colorear no es fraude probado. Algunos resultarán ser proveedores legítimos especializados, algunos proveedores extranjeros con historiales mexicanos genuinamente delgados, algunos subcontratistas únicos. Pero la expectativa base en la investigación del fraude en contratación pública es que entre el 20 y el 40 por ciento de las firmas conductuales tipo P2 corresponden a fraude real. Aplicado a los 6,076 proveedores no confirmados, eso sugiere un universo de entre 1,200 y 2,400 empresas fantasma no reconocidas — alrededor de 1,200 como mínimo estructural — operando en la contratación federal en este momento. El SAT ha encontrado 42.',
        ],
        chartConfig: {
          type: 'inline-dot-grid',
          title: 'Ghost-Pattern Vendors: Confirmed vs Undetected',
          title_es: 'Proveedores con patrón fantasma: Confirmados vs No Detectados',
          chartId: 'ghost-detection-grid',
          data: {
            points: [
              {
                label: 'EFOS confirmed ghost companies',
                label_es: 'EFOS — empresas fantasma confirmadas',
                value: 42,
                color: '#dc2626',
                highlight: true,
              },
              {
                label: 'P2-pattern, not on any official list',
                label_es: 'patrón P2, no en ningún padrón oficial',
                value: 6076,
                color: '#f59e0b',
              },
            ],
            annotation:
              'Each dot = 1 vendor. 6,118 total flagged by RUBLI P2 algorithm across 2002-2025.',
            annotation_es:
              'Cada punto = 1 proveedor. 6,118 marcados en total por el algoritmo P2 de RUBLI entre 2002-2025.',
          },
        },
        pullquote: {
          quote:
            'One in 145 vendors the algorithm suspects is ghost-patterned has been officially confirmed by SAT. The other 144 are still contracting with the government.',
          quote_es:
            'Uno de cada 145 proveedores que el algoritmo sospecha tiene patrón fantasma ha sido confirmado oficialmente por el SAT. Los otros 144 siguen contratando con el gobierno.',
          stat: '0.7%',
          statLabel: 'official detection rate against the P2 population',
          statLabel_es: 'tasa de detección oficial contra la población P2',
          barValue: 0.007,
          barLabel: '0.7% officially detected',
          barLabel_es: '0.7% detectados oficialmente',
          vizTemplate: 'mass-sliver',
        },
        sources: [
          'SAT. (2026). Listado definitivo de contribuyentes que facturaron operaciones simuladas (Art. 69-B LISR). Servicio de Administración Tributaria.',
          'RUBLI SAT EFOS cross-reference table, April 2026.',
          'RUBLI ARIA Pipeline v1.1. Pattern 2 (P2) classification, run ID 28d5c453, March 25 2026.',
          'OECD. (2023). Public Procurement Performance Report. Chapter 5: pattern-based anomaly detection.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Why the Official List Is Always Late',
        title_es: 'Por Qué el Padrón Oficial Siempre Llega Tarde',
        subtitle: 'Tax enforcement is retrospective; procurement fraud is prospective',
        subtitle_es: 'La fiscalización es retrospectiva; el fraude en contratación es prospectivo',
        prose: [
          'The 0.7 percent gap has a mechanism, and the mechanism is why a vendor like Carranza can extract 370 million pesos and be gone before any official list catches him. The SAT Art. 69-B process is procedurally rigorous, and that rigor is its failure mode. The law requires SAT to prove, using simulated invoices and operational records, that an entity has issued fiscal receipts without underlying economic activity. That proof requires access to bank records, third-party testimony, and on-site visits. Only once SAT is confident does a provisional listing publish in the Diario Oficial de la Federación, carrying a 30-day rebuttal period; only after the rebuttal expires does the definitive listing go live.',
          "The timeline follows from the procedure. The best case from initial detection to definitive listing is six months. The typical case is 12 to 18 months. The worst case, when vendors mount legal challenges, stretches to 36 months or more — three years and beyond. Throughout that entire window the vendor can keep contracting, because the definitive listing is the only trigger for procurement exclusion. Against operations engineered for short lifespans — appear, extract, dissolve — SAT's pace is irrelevant to the fraud cycle.",
          "This is not a Mexican peculiarity. The OECD's 2023 Public Procurement Performance Report diagnosed this precise gap as a structural feature of tax-authority-driven ghost-company detection worldwide. The Report recommended that procurement systems develop independent behavioral red-flag detection operating in parallel to tax enforcement, explicitly because tax processes are retrospective while procurement fraud is prospective. World Bank research on Eastern European procurement reached the same conclusion in 2019.",
          "RUBLI's P2 is that recommendation operationalized: pattern-based, procurement-native, running in roughly two weeks — the 0.5 months charted below — rather than years. It does not replace SAT. It complements SAT with the one thing tax enforcement cannot deliver at scale: speed.",
        ],
        prose_es: [
          'La brecha del 0.7 por ciento tiene un mecanismo, y ese mecanismo es la razón por la que un proveedor como Carranza puede extraer 370 MDP y desaparecer antes de que cualquier padrón oficial lo alcance. El proceso del Art. 69-B del SAT es procedimentalmente riguroso, y ese rigor es su modo de falla. La ley exige al SAT probar, mediante facturas simuladas y registros operativos, que una entidad ha emitido comprobantes fiscales sin actividad económica subyacente. Esa prueba requiere acceso a registros bancarios, testimonios de terceros, y visitas en sitio. Solo una vez que el SAT está convencido se publica un listado provisional en el Diario Oficial de la Federación, con un periodo de 30 días para presentar pruebas en contrario; solo después del vencimiento del plazo entra en vigor el listado definitivo.',
          'El plazo se desprende del procedimiento. El mejor caso desde la detección inicial hasta el listado definitivo es de seis meses. El caso típico va de 12 a 18 meses. El peor caso, cuando los proveedores presentan recursos legales, se extiende a 36 meses o más — tres años en adelante. A lo largo de toda esa ventana el proveedor puede seguir contratando, porque el listado definitivo es el único disparador de exclusión de contratación. Frente a operaciones diseñadas para vidas cortas — aparecer, extraer, disolver — el ritmo del SAT es irrelevante para el ciclo del fraude.',
          'Esto no es una peculiaridad mexicana. El Reporte de Desempeño en Contrataciones Públicas 2023 de la OCDE diagnosticó precisamente esta brecha como una característica estructural de la detección de empresas fantasma impulsada por autoridades fiscales en todo el mundo. El reporte recomendó que los sistemas de contratación desarrollen detección independiente de banderas rojas conductuales operando en paralelo a la fiscalización tributaria, explícitamente porque los procesos fiscales son retrospectivos mientras el fraude en contratación es prospectivo. La investigación del Banco Mundial sobre contratación en Europa del Este alcanzó la misma conclusión en 2019.',
          'El P2 de RUBLI es esa recomendación hecha operación: basado en patrones, nativo de la contratación, corriendo en aproximadamente dos semanas — los 0.5 meses graficados abajo — en lugar de años. No reemplaza al SAT. Complementa al SAT con lo único que la fiscalización tributaria no puede proveer a escala: velocidad.',
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
            annotation:
              "Months to definitive Art. 69-B listing versus a single ARIA P2 pipeline run. During SAT's window, flagged vendors keep contracting. Source: OECD 2023 Public Procurement Performance Report.",
            annotation_es:
              'Meses hasta listado definitivo bajo el Art. 69-B frente a una sola corrida del pipeline P2 de ARIA. Durante la ventana del SAT, los proveedores marcados siguen contratando. Fuente: OCDE, Reporte de Desempeño en Contrataciones Públicas 2023.',
          },
        },
        pullquote: {
          quote:
            'Official enforcement has confirmed 42 ghost companies. The other 6,076 flagged vendors are still doing business with the government.',
          quote_es:
            'La fiscalización oficial ha confirmado 42 empresas fantasma. Los otros 6,076 proveedores marcados siguen haciendo negocios con el gobierno.',
          stat: '6,076',
          statLabel: 'P2 vendors unconfirmed by any official list',
          statLabel_es: 'proveedores P2 no confirmados por ningún padrón oficial',
          barValue: 0.007,
          barLabel: '42 SAT-confirmed against 6,118 P2-flagged',
          barLabel_es: '42 confirmados SAT contra 6,118 marcados por P2',
          vizTemplate: 'mass-sliver',
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report. Organization for Economic Co-operation and Development.',
          'World Bank. (2019). Warning Signs of Fraud and Corruption in Procurement. Integrity Vice Presidency.',
          'Código Fiscal de la Federación, Art. 69-B. Procedimiento de operaciones simuladas.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: "The Name We Have, the Name We Don't",
        title_es: 'El Nombre Que Tenemos, el Que No',
        subtitle: 'The shell is named and excluded; the official who signed is anonymous',
        subtitle_es: 'La fachada es nombrada y excluida; el funcionario que firmó es anónimo',
        prose: [
          'If the detection rate is 0.7 percent, the accountability rate is lower still. Of the 42 confirmed EFOS vendors who appear in federal procurement records, public records show criminal prosecution for only a fraction; most receive fiscal sanctions and procurement exclusion, and nothing more. The officials who approved their contracts are rarely named, rarely investigated, almost never prosecuted.',
          "State the structural truth plainly: a ghost company is a two-sided transaction. Someone creates the shell. Someone inside the government signs the approval. RUBLI's data is silent on the second half, because COMPRANET does not reliably link individual approving officials to specific contracts — that linkage exists in internal procurement-unit records but is not systematically published. The Secretaría de la Función Pública (SFP) holds the legal authority to audit approvals and sanction officials. In practice, the SFP sanctions database shows just 1,954 vendor-level sanctions across the full 23-year dataset — a tiny fraction of 6,118, and almost none of the approving officials named.",
          'Return to where the story opened. The man who won 370 million pesos has a name in the record: Emilio Carranza Obersohn. The official who signed his two contracts does not. The shell is named and excluded; the signer is anonymous and unsanctioned. That asymmetry is the engine of the whole pattern, because it guarantees the next ghost faces no deterrent.',
          "What a reader can do with the list is concrete. The 6,076 unconfirmed vendors are ranked by ARIA's Integrated Priority Score, which weights risk-model output, financial scale, anomaly detection, and external-registry flags; the top 100 by IPS are the highest-yield targets. The fastest forensic confirmation runs three checks completable in days: verify RUPC business registration; verify the registered physical address against a real commercial location; and check whether the same procurement unit awarded multiple P2 vendors in the same period. When all three confirm suspicion, the case moves to UIF (Unidad de Inteligencia Financiera), which can subpoena bank records and trace funds today. What UIF lacks is a systematically generated pipeline of pre-investigated cases. RUBLI supplies it.",
          'The algorithm cannot prosecute and it cannot sanction. But it forces the question it cannot answer: of 6,118 vendors whose behavior mirrors documented ghost companies, which officials signed their contracts, and why have those officials never been investigated?',
        ],
        prose_es: [
          'Si la tasa de detección es del 0.7 por ciento, la tasa de rendición de cuentas es aún menor. De los 42 proveedores EFOS confirmados que aparecen en registros de contratación federal, los registros públicos muestran procesamiento penal para apenas una fracción; la mayoría recibe sanciones fiscales y exclusión de contratación, y nada más. Los funcionarios que aprobaron sus contratos rara vez son nombrados, rara vez son investigados, casi nunca son procesados.',
          'Hay que decir la verdad estructural sin rodeos: una empresa fantasma es una transacción de dos lados. Alguien crea la fachada. Alguien dentro del gobierno firma la aprobación. Los datos de RUBLI guardan silencio sobre la segunda mitad, porque COMPRANET no vincula de manera confiable a funcionarios aprobantes individuales con contratos específicos — ese vínculo existe en registros internos de las unidades de contratación pero no se publica sistemáticamente. La Secretaría de la Función Pública (SFP) tiene la facultad legal de auditar las aprobaciones y sancionar funcionarios. En la práctica, la base de datos de sanciones de la SFP muestra apenas 1,954 sanciones a nivel proveedor en los 23 años completos del conjunto de datos — una fracción minúscula de los 6,118, y casi ningún funcionario aprobante nombrado.',
          'Hay que volver a donde empezó la historia. El hombre que ganó 370 MDP tiene un nombre en el registro: Emilio Carranza Obersohn. El funcionario que firmó sus dos contratos no lo tiene. La fachada es nombrada y excluida; el firmante es anónimo y no sancionado. Esa asimetría es el motor de todo el patrón, porque garantiza que la próxima empresa fantasma no enfrente disuasión alguna.',
          'Lo que un lector puede hacer con la lista es concreto. Los 6,076 proveedores no confirmados están ordenados por el Puntaje de Prioridad Integrado (IPS) de ARIA, que pondera la salida del modelo de riesgo, la escala financiera, la detección de anomalías, y las banderas de registros externos; los 100 más altos por IPS son los objetivos de mayor rendimiento. La confirmación forense más rápida pasa por tres verificaciones completables en días: verificar el registro empresarial en el RUPC; comprobar el domicilio físico registrado contra una ubicación comercial real; y revisar si la misma unidad de contratación adjudicó a múltiples proveedores P2 en el mismo periodo. Cuando las tres confirman la sospecha, el caso pasa a la UIF (Unidad de Inteligencia Financiera), que puede solicitar registros bancarios y rastrear el flujo de fondos hoy mismo. Lo que le falta a la UIF es un flujo sistemáticamente generado de casos pre-investigados. RUBLI lo provee.',
          'El algoritmo no puede procesar y no puede sancionar. Pero fuerza la pregunta que no puede responder: de 6,118 proveedores cuya conducta refleja la de empresas fantasma documentadas, ¿qué funcionarios firmaron sus contratos, y por qué esos funcionarios nunca han sido investigados?',
        ],
        pullquote: {
          quote:
            'A ghost company is a two-sided transaction. Mexico names the shell. Mexico does not name the official who signed.',
          quote_es:
            'Una empresa fantasma es una transacción de dos lados. México nombra a la fachada. México no nombra al funcionario que firmó.',
          stat: '1,954',
          statLabel: 'SFP vendor sanctions (2002-2025)',
          statLabel_es: 'sanciones SFP a proveedores (2002-2025)',
          barValue: 0,
          vizTemplate: 'zero-bar',
        },
        sources: [
          'SFP. (2025). Directorio de servidores públicos sancionados. Unidad de Responsabilidades Administrativas.',
          'RUBLI SFP sanctions cross-reference, April 2026.',
          'UIF/SHCP. (2024). Informe Anual de Actividades 2024. Unidad de Inteligencia Financiera.',
          'RUBLI ARIA Integrated Priority Score methodology, docs/ARIA_SPEC.md.',
        ],
      },
    ],
  },

  // === STORY 2: The Contracts No One Is Watching Are the Biggest Ones ===
  {
    slug: 'el-gran-precio',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The Contracts No One Is Watching Are the Biggest Ones',
    headline_es: 'Los contratos que nadie vigila son los más grandes',
    subheadline:
      "Common sense says the largest public contracts get the most bidders, the most oversight, the hardest scrutiny. RUBLI's risk model — which never sees a contract's size — says the opposite. Across 3 million federal contracts, risk climbs almost step by step with value: 0.25 at the bottom, 0.94 at the top. The 40 contracts above 10 billion pesos, worth 819 billion combined, are every one of them high-risk. Behind those 40 sit just 33 vendors. The mega-contract universe of Mexican federal procurement is held by a smaller set of companies than anyone assumes — and audited least where the money is largest.",
    subheadline_es:
      'El sentido común dice que los contratos públicos más grandes reciben más oferentes, más supervisión, el escrutinio más duro. El modelo de riesgo de RUBLI — que nunca conoce el tamaño de un contrato — dice lo contrario. En 3 millones de contratos federales, el riesgo sube casi escalón por escalón con el valor: 0.25 abajo, 0.94 arriba. Los 40 contratos por encima de 10 mil millones de pesos, con valor combinado de 819 mil millones, son todos de alto riesgo. Detrás de esos 40 hay apenas 33 proveedores. El universo de mega-contratos de la contratación federal mexicana lo controla un grupo más reducido de empresas de lo que cualquiera supone — y se audita menos donde el dinero es mayor.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: {
      value: '819B MXN',
      label: '40 contracts above 10B MXN — and oversight runs thinnest exactly here',
      label_es:
        '40 contratos por encima de 10 mil millones — y la supervisión es más débil justo aquí',
      sublabel: 'Every one high-risk · just 33 vendors behind them',
      sublabel_es: 'Todos de alto riesgo · solo 33 proveedores detrás de ellos',
      color: '#dc2626',
    },
    relatedSlugs: ['el-monopolio-invisible', 'marea-de-adjudicaciones', 'el-sexenio-del-riesgo'],
    lensTags: {
      patterns: ['P5'],
      terms: ['sobreprecio', 'overpricing', 'large contracts'],
    },
    kickerStats: [
      {
        value: '0.25 → 0.94',
        suffix: 'average risk, smallest to largest contract bracket',
        suffix_es: 'riesgo promedio, del rango más chico al más grande',
        tone: 'data',
      },
      {
        value: '40 / 40',
        suffix: 'contracts above 10B MXN that are high-risk',
        suffix_es: 'contratos por encima de 10 mil millones de alto riesgo',
        tone: 'critical',
      },
      {
        value: '~5%',
        suffix: 'estimated audit coverage where risk is highest',
        suffix_es: 'cobertura de auditoría estimada donde el riesgo es mayor',
        tone: 'data',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What Everyone Assumes About the Biggest Contracts',
        title_es: 'Lo que todos suponen sobre los contratos más grandes',
        subtitle: 'The intuition that should hold — and the curve that breaks it',
        subtitle_es: 'La intuición que debería sostenerse — y la curva que la rompe',
        prose: [
          'Start with the assumption almost everyone shares. A public contract worth tens of billions of pesos ought to be the single hardest thing in government to push through unnoticed. It should draw the most bidders competing for the prize, the most eyes from the federal auditor and the ministry of public administration, the most coverage from the press, and the steepest political cost if it goes wrong. Size, the intuition runs, buys scrutiny. The citizen assumes it; the journalist assumes it; the auditor assumes it.',
          "RUBLI's v0.8.5 risk model is built to be a neutral arbiter of that assumption. It scores every federal contract on a 0-to-1 scale calibrated against 1,427 documented corruption cases, with a test AUC of 0.785. Crucially, it never sees how large a contract is. It reads vendor concentration, price volatility, and procurement mechanism — never the peso value. So when the 3,051,294 contracts in the database are grouped by size after they are scored, any relationship between size and risk is something the model discovered, not something built into it.",
          "Walk up the brackets in order and the intuition inverts. Contracts under 100,000 pesos — the small-value transactions that dominate Mexican procurement by count — average 0.25. Between 1 million and 10 million pesos, the average is 0.29. Between 10 million and 50 million it reaches 0.41, already across RUBLI's high-risk line. Between 50 million and 500 million it climbs to 0.68. Between 500 million and 5 billion, 0.91. Above 5 billion pesos, 0.94.",
          "Risk does not fall as contracts grow larger and more visible. It climbs, almost step by step. The 112 contracts in the top bracket — each a single procurement event worth more than 5 billion pesos — represent 1.32 trillion pesos in total contracting, and average 0.94, deep inside the model's critical tier, where 0.60 is the line above which an investigation is warranted. The thing intuition says should be the safest is, on the evidence, the riskiest.",
        ],
        prose_es: [
          'Empecemos con la suposición que casi todos comparten. Un contrato público por decenas de miles de millones de pesos debería ser lo más difícil del gobierno de sacar adelante sin que nadie lo note. Debería atraer a la mayor cantidad de oferentes compitiendo por el premio, la mayor cantidad de ojos de la auditoría federal y de la secretaría de la función pública, la mayor cobertura de prensa y el costo político más alto si algo sale mal. El tamaño, dice la intuición, compra escrutinio. El ciudadano lo supone; el periodista lo supone; el auditor lo supone.',
          'El modelo de riesgo v0.8.5 de RUBLI está construido para ser un árbitro neutral de esa suposición. Califica cada contrato federal en una escala de 0 a 1 calibrada contra 1,427 casos documentados de corrupción, con un AUC de prueba de 0.785. De manera crucial, nunca conoce el tamaño de un contrato. Lee la concentración de proveedores, la volatilidad de precios y el mecanismo de contratación — nunca el valor en pesos. Así que cuando los 3,051,294 contratos de la base de datos se agrupan por tamaño después de ser calificados, cualquier relación entre tamaño y riesgo es algo que el modelo descubrió, no algo que tenga incorporado.',
          'Suba por los rangos en orden y la intuición se invierte. Los contratos por debajo de 100,000 pesos — las transacciones de bajo valor que dominan la contratación mexicana por volumen — promedian 0.25. Entre 1 millón y 10 millones de pesos, el promedio es 0.29. Entre 10 millones y 50 millones llega a 0.41, ya cruzando la línea de alto riesgo de RUBLI. Entre 50 millones y 500 millones sube a 0.68. Entre 500 millones y 5 mil millones, 0.91. Por encima de 5 mil millones de pesos, 0.94.',
          'El riesgo no baja a medida que los contratos crecen y se vuelven más visibles. Sube, casi escalón por escalón. Los 112 contratos del rango más alto — cada uno un evento de contratación por más de 5 mil millones de pesos — representan 1.32 billones de pesos en contratación total, y promedian 0.94, muy adentro del nivel crítico del modelo, donde 0.60 es la línea a partir de la cual se justifica una investigación. Lo que la intuición dice que debería ser lo más seguro es, según la evidencia, lo más riesgoso.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'Risk Climbs With Size — a Ladder the Model Was Never Told to Build',
          title_es:
            'El riesgo sube con el tamaño — una escalera que el modelo nunca recibió la orden de construir',
          chartId: 'risk-by-size-ladder',
          data: {
            points: [
              {
                label: '<100K',
                value: 0.2546,
              },
              {
                label: '100K-500K',
                value: 0.2685,
              },
              {
                label: '500K-1M',
                value: 0.2756,
              },
              {
                label: '1M-10M',
                value: 0.2883,
              },
              {
                label: '10M-50M',
                value: 0.4094,
                annotation: 'HIGH',
                annotation_es: 'ALTO',
              },
              {
                label: '50M-500M',
                value: 0.6802,
                highlight: true,
                annotation: 'CRITICAL',
                annotation_es: 'CRÍTICO',
              },
              {
                label: '500M-5B',
                value: 0.9057,
                highlight: true,
                color: '#dc2626',
              },
              {
                label: '>5B MXN',
                value: 0.9395,
                highlight: true,
                color: '#dc2626',
              },
            ],
            referenceLine: {
              value: 0.6,
              label: 'Critical threshold',
              label_es: 'Umbral crítico',
              color: '#dc2626',
            },
            referenceLine2: {
              value: 0.4,
              label: 'High risk threshold',
              label_es: 'Umbral de alto riesgo',
              color: '#f97316',
            },
            unit: 'risk score',
            maxValue: 1,
            yLabel: 'Average v0.8.5 risk score',
            yLabel_es: 'Riesgo promedio v0.8.5',
            annotation:
              'The largest contracts in Mexican federal procurement are, on average, the riskiest.',
            annotation_es:
              'Los contratos más grandes de la contratación federal mexicana son, en promedio, los más riesgosos.',
          },
        },
        pullquote: {
          quote:
            "The 112 largest contracts in the dataset carry an average risk score of 0.94. In RUBLI's framework, 0.60 is the line above which investigation is warranted. Intuition says these should be the safest contracts in government.",
          quote_es:
            'Los 112 contratos más grandes en la base de datos tienen una calificación de riesgo promedio de 0.94. En el marco de RUBLI, 0.60 es el umbral a partir del cual se justifica una investigación. La intuición dice que estos deberían ser los contratos más seguros del gobierno.',
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
        title: 'Why the Curve Runs the Wrong Way',
        title_es: 'Por qué la curva corre al revés',
        subtitle: 'Three structural reasons big contracts shed their guardrails',
        subtitle_es:
          'Tres razones estructurales por las que los contratos grandes pierden sus controles',
        prose: [
          'An inverted intuition is only worth as much as the mechanism behind it. The risk-by-size curve is not a model artifact. It tracks structural realities of procurement fraud that international research has documented for more than two decades. Three mechanisms compound.',
          "First, large contracts are awarded disproportionately by direct adjudication rather than open competition. In RUBLI's data, contracts above 10 million pesos are awarded by direct adjudication at rates approaching 90 percent in the salud and energía sectors. Direct award strips out three of the four integrity controls OECD identifies as essential: competitive pricing pressure, public advertising that invites scrutiny, and systematic bid evaluation that leaves an audit trail. OECD's recommended ceiling for direct award is 25 to 30 percent. The biggest contracts blow past it.",
          'Second, large contracts concentrate enough money to pay for the fixed costs of sophisticated fraud. Inventing a ghost company, bribing an official, staging a fake competitive process — each carries fixed costs in time, relationships, and risk. Below some break-even point those costs exceed the expected return; above it, they turn profitable. The IMSS Ghost Company Network operated mostly in the 100-to-500-million-peso band. The Infrastructure Overpricing Network that RUBLI tracks in ARIA runs contracts averaging 645 million pesos each — comfortably above any plausible break-even.',
          'Third, the biggest contracts pool in institutions where capture is already entrenched. PEMEX, CFE, IMSS, ISSSTE, SCT — the five largest procuring entities in the federal government — generate the majority of contracts above 500 million pesos, and all five carry decades of documented corruption. A large contract in a captured institution is not equally likely to be corrupt as a small contract in a clean one. It is vastly more likely. That is precisely why the more-money-more-scrutiny intuition fails: the money flows to the places where the guardrails are already gone.',
        ],
        prose_es: [
          'Una intuición invertida vale solo lo que vale el mecanismo detrás de ella. La curva de riesgo por tamaño no es un artefacto del modelo. Refleja realidades estructurales del fraude en contratación que la investigación internacional ha documentado por más de dos décadas. Tres mecanismos se combinan.',
          'Primero, los contratos grandes se adjudican de manera desproporcionada mediante adjudicación directa, no por licitación competitiva abierta. En los datos de RUBLI, los contratos por encima de 10 millones de pesos se adjudican mediante adjudicación directa a tasas que se aproximan al 90 por ciento en los sectores de salud y energía. La adjudicación directa elimina tres de los cuatro controles de integridad que la OCDE identifica como esenciales: la presión de precios competitivos, la publicidad que invita al escrutinio y la evaluación sistemática de ofertas que deja un historial de auditoría. El techo recomendado por la OCDE para la adjudicación directa es del 25 al 30 por ciento. Los contratos más grandes lo rebasan por mucho.',
          'Segundo, los contratos grandes concentran suficiente dinero para pagar los costos fijos del fraude sofisticado. Inventar una empresa fantasma, sobornar a un funcionario, simular un proceso competitivo falso — cada uno tiene costos fijos de tiempo, relaciones y riesgo. Por debajo de cierto punto de equilibrio, esos costos superan el beneficio esperado; por encima de él, se vuelven rentables. La Red de Empresas Fantasma del IMSS operó principalmente en el rango de 100 a 500 millones de pesos. La Red de Sobreprecio en Infraestructura que RUBLI rastrea en ARIA gestiona contratos que promedian 645 millones de pesos cada uno — cómodamente por encima de cualquier punto de equilibrio plausible.',
          'Tercero, los contratos más grandes se concentran en instituciones donde la captura ya está arraigada. PEMEX, CFE, IMSS, ISSSTE, SCT — las cinco entidades contratantes más grandes del gobierno federal — generan la mayoría de los contratos por encima de 500 millones de pesos, y las cinco cargan décadas de corrupción documentada. Un contrato grande en una institución capturada no es igualmente probable de ser corrupto que un contrato pequeño en una limpia. Es vastamente más probable. Esa es precisamente la razón por la que falla la intuición de a-más-dinero-más-escrutinio: el dinero fluye hacia los lugares donde los controles ya desaparecieron.',
        ],
        pullquote: {
          quote:
            "Large contracts remove three of OECD's four integrity controls: competitive pricing, public advertising, and systematic evaluation. The recommended ceiling for direct award is 25 to 30 percent.",
          quote_es:
            'Los contratos grandes eliminan tres de los cuatro controles de integridad de la OCDE: precios competitivos, publicidad pública y evaluación sistemática. El techo recomendado para la adjudicación directa es del 25 al 30 por ciento.',
          stat: '~90%',
          statLabel: 'direct-award rate for contracts >10M MXN in salud & energía',
          statLabel_es: 'tasa de adjudicación directa para contratos >10M MXN en salud y energía',
          barValue: 0.9,
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
        title: 'A Directory, Not a Market',
        title_es: 'Un directorio, no un mercado',
        subtitle: '795 contracts above one billion — held by 466 vendors, in four sectors',
        subtitle_es:
          '795 contratos por encima de mil millones — en manos de 466 proveedores, en cuatro sectores',
        prose: [
          "Cross the one-billion-peso line and the field thins fast. Of the 3,051,294 contracts in RUBLI's database, only 795 clear one billion pesos. Together they account for 2.66 trillion pesos in cumulative spending — held by just 466 vendors, about 0.15 percent of the active vendor universe. The concentration sharpens at the top. Above 5 billion pesos: 112 contracts, 93 vendors. Above 10 billion pesos: 40 contracts, 33 vendors, every one of them high-risk, average score 0.962. There is no clean mega-contract in the dataset. The model has yet to find one.",
          'The cast is not random. It clusters into five recognizable types. Pharmaceutical distributors with multi-decade IMSS relationships — Grupo Fármacos, Maypo, PISA, DIMM, the cartel structure documented in The Invisible Monopoly. Tren Maya construction contractors awarded after 2019 — Operadora CICSA, ICA Constructora, Alstom Transport. Pemex and CFE infrastructure providers — Dowell Schlumberger, ICA Fluor, Cotemar. Military-construction operators — Coconal, Constructora Arhnos. And large-format card and voucher operators capturing welfare-program logistics, such as TOKA Internacional. Each cluster has a recognizable institutional anchor and a small, recurring vendor cast.',
          'The extremes name themselves. MANTENIMIENTO EXPRESS MARÍTIMO S.A.P.I. DE C.V. received one contract worth 69.9 billion pesos at a perfect 1.000 risk score — Pemex marine maintenance, awarded sole-source. URBANISSA S.A. DE C.V. received a single 58-billion-peso contract at 0.969. CONSTRUCTORA ARHNOS, S.A. DE C.V. received a single 31.9-billion-peso contract at 1.000. Each is one contract, by itself larger than the entire annual budget of several Mexican states.',
          'Now watch where the giants pool. Four sectors absorb 92 percent of the pesos awarded above one billion. Energía leads at 917.3 billion pesos — 34.5 percent of mega-contract pesos across 250 contracts, almost entirely Pemex and CFE infrastructure. Salud follows at 638.6 billion — 24.0 percent across 258 contracts, the IMSS pharmaceutical and hospital cluster. Infraestructura sits at 552.4 billion — 20.8 percent across 100 contracts, dominated by SCT and CONAGUA mega-projects before AMLO and military construction after 2019. Hacienda holds 349.6 billion — 13.1 percent across 92 contracts, covering welfare-card vendors and tax-administration outsourcing.',
          "Set that against the sectors that barely register. Educación generated only 2 percent of mega-contract pesos despite being the third-largest budget allocation in the federal accounts. Trabajo, Defensa (civilian COMPRANET — military contracts move through separate channels), Agricultura and Medio Ambiente together account for less than 4 percent. The four giant-absorbing sectors are the four with the longest documented corruption histories: Pemex contracting since the Cantarell-era contracts of the 1990s; IMSS pharmaceutical contracting and its cartel structure; federal infrastructure as the spine of La Estafa Maestra and now its militarization, documented in The Era of Risk; welfare-card outsourcing concentrated under AMLO around TOKA, Sodexo and Edenred at billion-peso scale. OECD's 2023 review of Mexico named the pattern: 'concentrated risk capture,' where the highest-value and highest-risk transactions are the same transactions, in the same institutions, with the same recurring cast. It recommended sector-specific oversight teams on the four highest-risk sectors. The recommendation was not implemented.",
        ],
        prose_es: [
          'Cruce la línea de mil millones de pesos y el campo se adelgaza rápido. De los 3,051,294 contratos de la base de datos de RUBLI, solo 795 superan los mil millones de pesos. Juntos representan 2.66 billones de pesos en gasto acumulado — en manos de solo 466 proveedores, alrededor del 0.15 por ciento del universo activo de proveedores. La concentración se agudiza en la cima. Por encima de 5 mil millones de pesos: 112 contratos, 93 proveedores. Por encima de 10 mil millones de pesos: 40 contratos, 33 proveedores, todos ellos de alto riesgo, calificación promedio 0.962. No existe un mega-contrato limpio en el conjunto de datos. El modelo aún no ha encontrado ninguno.',
          'El reparto no es aleatorio. Se agrupa en cinco tipos reconocibles. Distribuidoras farmacéuticas con relaciones de varias décadas con el IMSS — Grupo Fármacos, Maypo, PISA, DIMM, la estructura de cártel documentada en El Monopolio Invisible. Contratistas de construcción del Tren Maya adjudicados después de 2019 — Operadora CICSA, ICA Constructora, Alstom Transport. Proveedores de infraestructura de Pemex y CFE — Dowell Schlumberger, ICA Fluor, Cotemar. Operadores de construcción militar — Coconal, Constructora Arhnos. Y operadores de tarjetas y vales a gran escala que capturan la logística de programas de bienestar, como TOKA Internacional. Cada cluster tiene un ancla institucional reconocible y un reparto reducido de proveedores recurrentes.',
          'Los extremos se nombran solos. MANTENIMIENTO EXPRESS MARÍTIMO S.A.P.I. DE C.V. recibió un contrato por 69.9 mil millones de pesos con una calificación de riesgo perfecta de 1.000 — mantenimiento marino de Pemex, adjudicado como proveedor único. URBANISSA S.A. DE C.V. recibió un solo contrato por 58 mil millones con calificación de 0.969. CONSTRUCTORA ARHNOS, S.A. DE C.V. recibió un solo contrato por 31.9 mil millones con calificación de 1.000. Cada uno es un solo contrato que, por sí solo, es mayor que el presupuesto anual completo de varios estados mexicanos.',
          'Ahora observe dónde se acumulan los gigantes. Cuatro sectores absorben el 92 por ciento de los pesos adjudicados por encima de mil millones. Energía lidera con 917.3 mil millones de pesos — 34.5 por ciento de los pesos en mega-contratos repartidos en 250 contratos, casi en su totalidad infraestructura de Pemex y CFE. Salud le sigue con 638.6 mil millones — 24.0 por ciento en 258 contratos, el cluster farmacéutico y hospitalario del IMSS. Infraestructura se ubica en 552.4 mil millones — 20.8 por ciento en 100 contratos, dominada por mega-proyectos de SCT y CONAGUA antes de AMLO y construcción militar después de 2019. Hacienda tiene 349.6 mil millones — 13.1 por ciento en 92 contratos, que cubre proveedores de tarjetas de bienestar y externalización de la administración fiscal.',
          "Ponga eso frente a los sectores que apenas figuran. Educación generó solo el 2 por ciento de los pesos en mega-contratos a pesar de ser la tercera asignación presupuestaria más grande en las cuentas federales. Trabajo, Defensa (COMPRANET civil — los contratos militares se mueven por canales separados), Agricultura y Medio Ambiente juntos representan menos del 4 por ciento. Los cuatro sectores que absorben a los gigantes son los cuatro con las historias de corrupción documentadas más largas: la contratación en Pemex desde los contratos de la era Cantarell en los años noventa; la contratación farmacéutica del IMSS y su estructura de cártel; la infraestructura federal como columna vertebral de La Estafa Maestra y ahora su militarización, documentada en El Sexenio del Riesgo; la externalización de tarjetas de bienestar concentrada bajo AMLO alrededor de TOKA, Sodexo y Edenred a escala de miles de millones. La revisión de la OCDE de México de 2023 nombró el patrón: 'captura de riesgo concentrado', donde las transacciones de mayor valor y las de mayor riesgo son las mismas transacciones, en las mismas instituciones, con el mismo reparto recurrente. Recomendó equipos de supervisión específicos por sector en los cuatro sectores de mayor riesgo. La recomendación no fue implementada.",
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'The Mega-Contract Directory — Top 12 Vendors, Pesos in Contracts ≥1B MXN',
          title_es:
            'El directorio de mega-contratos — Top 12 proveedores, pesos en contratos ≥1 mil millones',
          chartId: 'mega-vendors',
          data: {
            points: [
              {
                label: 'Operadora CICSA',
                value: 139,
                riskScore: 0.36,
                highlight: true,
                annotation: '5 contracts · risk 0.36',
                annotation_es: '5 contratos · riesgo 0.36',
              },
              {
                label: 'Mantenimiento Express',
                value: 69.9,
                riskScore: 1,
                highlight: true,
                annotation: '1 contract · risk 1.00',
                annotation_es: '1 contrato · riesgo 1.00',
              },
              {
                label: 'Dowell Schlumberger',
                value: 64.8,
                riskScore: 0.97,
                annotation: '9 contracts · risk 0.97',
                annotation_es: '9 contratos · riesgo 0.97',
              },
              {
                label: 'Grupo Fármacos',
                value: 62.9,
                riskScore: 0.99,
                highlight: true,
                annotation: '29 contracts · risk 0.99',
                annotation_es: '29 contratos · riesgo 0.99',
              },
              {
                label: 'Urbanissa',
                value: 58,
                riskScore: 0.97,
                highlight: true,
                annotation: '1 contract · risk 0.97',
                annotation_es: '1 contrato · riesgo 0.97',
              },
              {
                label: 'ICA Constructora',
                value: 41.8,
                riskScore: 0.65,
                annotation: '3 contracts · risk 0.65 · Tren Maya',
                annotation_es: '3 contratos · riesgo 0.65 · Tren Maya',
              },
              {
                label: 'Alstom Transport',
                value: 37.9,
                riskScore: 0.92,
                annotation: '2 contracts · risk 0.92 · Tren Maya',
                annotation_es: '2 contratos · riesgo 0.92 · Tren Maya',
              },
              {
                label: 'Constructora Arhnos',
                value: 31.9,
                riskScore: 1,
                highlight: true,
                annotation: '1 contract · risk 1.00',
                annotation_es: '1 contrato · riesgo 1.00',
              },
              {
                label: 'ICA Fluor Daniel',
                value: 31.2,
                riskScore: 1,
                annotation: '6 contracts · risk 1.00',
                annotation_es: '6 contratos · riesgo 1.00',
              },
              {
                label: 'Grupo Constructor Marhnos',
                value: 28,
                riskScore: 0.37,
                annotation: '2 contracts · risk 0.37',
                annotation_es: '2 contratos · riesgo 0.37',
              },
              {
                label: 'Repsol Exploración',
                value: 27.2,
                riskScore: 1,
                annotation: '1 contract · risk 1.00',
                annotation_es: '1 contrato · riesgo 1.00',
              },
              {
                label: 'Mota-Engil México',
                value: 25.8,
                riskScore: 0.95,
                annotation: '4 contracts · risk 0.95',
                annotation_es: '4 contratos · riesgo 0.95',
              },
            ],
            unit: 'B MXN',
            annotation:
              "Each vendor's total only counts contracts ≥1B MXN. Top 12 capture 618 billion pesos — 23 percent of the mega-contract universe. Highlighted rows have either a single-contract structure (one vendor, one mega contract) or are perfect-score (1.00) outliers.",
            annotation_es:
              'El total de cada proveedor solo cuenta contratos ≥1 mil millones. Los 12 primeros capturan 618 mil millones de pesos — 23 por ciento del universo de mega-contratos. Las filas resaltadas tienen estructura de un solo contrato (un proveedor, un mega-contrato) o son atípicos con calificación perfecta (1.00).',
          },
        },
        pullquote: {
          quote:
            'A single contract for 69.9 billion pesos at a 1.000 risk score. A single contract for 58 billion. A single contract for 31.9 billion. The mega-contract tier in Mexican federal procurement is not a market. It is a directory.',
          quote_es:
            'Un solo contrato por 69.9 mil millones de pesos con calificación de riesgo 1.000. Otro por 58 mil millones. Otro por 31.9 mil millones. El nivel de mega-contratos en la contratación federal mexicana no es un mercado. Es un directorio.',
          stat: '40',
          statLabel: 'contracts above 10B MXN — average risk score 0.962, every one critical',
          statLabel_es:
            'contratos por encima de 10 mil millones — riesgo promedio 0.962, todos críticos',
          barValue: 1,
          barLabel: '100% of contracts >10B MXN are flagged high-risk',
          barLabel_es: '100% de los contratos >10 mil millones marcados de alto riesgo',
          vizTemplate: 'mosaic-tile',
        },
        sources: [
          'RUBLI contracts table aggregated by vendor with amount_mxn ≥ 1e9. April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025, mega-contract universe.',
          'RUBLI contracts × sectors aggregation, mega-contract subset (amount_mxn ≥ 1e9). April 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The Sectors Where the Giants Live',
        title_es: 'Los sectores donde viven los gigantes',
        subtitle: '92 percent of mega-pesos in the four most-documented sectors',
        subtitle_es: '92 por ciento de los mega-pesos en los cuatro sectores más documentados',
        prose: [
          'Where do the giants live? Read the sector ledger straight down and the answer is four addresses. Energía takes 917.3 billion pesos, 34.5 percent across 250 contracts. Salud, 638.6 billion, 24.0 percent across 258. Infraestructura, 552.4 billion, 20.8 percent across 100. Hacienda, 349.6 billion, 13.1 percent across 92. Together they hold 92 percent of every peso awarded above one billion. An equal share for one of ten sectors would be 265.3 billion pesos; the top four each blow past it.',
          "The bottom of the ledger is just as telling. Educación, third-largest line in the federal budget, draws only 2 percent of mega-contract pesos. Medio Ambiente, Gobernación, Defensa (in civilian COMPRANET; military procurement runs through separate channels), Agricultura and Trabajo trail behind, the last four together under 4 percent. This is the inversion's anatomy in one chart: the money pools precisely where institutional capture is best documented. Scrutiny that tracked risk would concentrate here — in the four sectors that have generated the country's deepest corruption case files. Instead, as the next chapter shows, the audit map points almost everywhere else.",
        ],
        prose_es: [
          '¿Dónde viven los gigantes? Lea el registro sectorial de arriba abajo y la respuesta son cuatro direcciones. Energía se lleva 917.3 mil millones de pesos, 34.5 por ciento en 250 contratos. Salud, 638.6 mil millones, 24.0 por ciento en 258. Infraestructura, 552.4 mil millones, 20.8 por ciento en 100. Hacienda, 349.6 mil millones, 13.1 por ciento en 92. Juntos concentran el 92 por ciento de cada peso adjudicado por encima de mil millones. Una parte igual para uno de diez sectores sería de 265.3 mil millones de pesos; los cuatro primeros la rebasan por mucho.',
          'El fondo del registro es igual de revelador. Educación, tercera línea más grande del presupuesto federal, capta solo el 2 por ciento de los pesos en mega-contratos. Medio Ambiente, Gobernación, Defensa (en el COMPRANET civil; la contratación militar corre por canales separados), Agricultura y Trabajo quedan rezagados, los últimos cuatro juntos por debajo del 4 por ciento. Esta es la anatomía de la inversión en una sola gráfica: el dinero se acumula precisamente donde la captura institucional está mejor documentada. Un escrutinio que siguiera el riesgo se concentraría aquí — en los cuatro sectores que han generado los expedientes de corrupción más profundos del país. En cambio, como muestra el siguiente capítulo, el mapa de auditoría apunta a casi cualquier otra parte.',
        ],
        chartConfig: {
          type: 'editorial-thermometer',
          title: 'Where the Giants Live — Mega-Contract Pesos (≥1B MXN) by Sector',
          title_es:
            'Dónde viven los gigantes — Pesos en mega-contratos (≥1 mil millones) por sector',
          chartId: 'mega-by-sector',
          data: {
            points: [
              {
                label: 'Energía',
                value: 917.3,
                color: '#eab308',
                highlight: true,
                annotation: '34.5% · 250 contracts',
                annotation_es: '34.5% · 250 contratos',
              },
              {
                label: 'Salud',
                value: 638.6,
                color: '#dc2626',
                highlight: true,
                annotation: '24.0% · 258 contracts',
                annotation_es: '24.0% · 258 contratos',
              },
              {
                label: 'Infraestructura',
                value: 552.4,
                color: '#ea580c',
                highlight: true,
                annotation: '20.8% · 100 contracts',
                annotation_es: '20.8% · 100 contratos',
              },
              {
                label: 'Hacienda',
                value: 349.6,
                color: '#16a34a',
                annotation: '13.1% · 92 contracts',
                annotation_es: '13.1% · 92 contratos',
              },
              {
                label: 'Educación',
                value: 52.9,
                color: '#3b82f6',
                annotation: '2.0%',
                annotation_es: '2.0%',
              },
              {
                label: 'Medio Ambiente',
                value: 51.1,
                color: '#10b981',
                annotation: '1.9%',
                annotation_es: '1.9%',
              },
              {
                label: 'Gobernación',
                value: 47.1,
                color: '#be123c',
                annotation: '1.8%',
                annotation_es: '1.8%',
              },
              {
                label: 'Defensa (civil)',
                value: 24.9,
                color: '#1e3a5f',
                annotation: '0.9% (mil. via separate channels)',
                annotation_es: '0.9% (mil. vía canales aparte)',
              },
              {
                label: 'Agricultura',
                value: 12.4,
                color: '#22c55e',
                annotation: '0.5%',
                annotation_es: '0.5%',
              },
              {
                label: 'Trabajo',
                value: 6.2,
                color: '#f97316',
                annotation: '0.2%',
                annotation_es: '0.2%',
              },
            ],
            referenceLine: {
              value: 265.3,
              label: 'Equal share (1 of 10 sectors)',
              label_es: 'Parte igual (1 de 10 sectores)',
              color: 'var(--color-sector-tecnologia)',
            },
            unit: 'B MXN',
            annotation:
              'Mega-contract pesos by sector. Top 4 sectors absorb 92 percent of the universe. The four sectors are also the four with the longest documented corruption histories.',
            annotation_es:
              'Pesos en mega-contratos por sector. Los 4 sectores principales absorben el 92 por ciento del universo. Estos cuatro sectores son los mismos cuatro con las historias de corrupción mejor documentadas.',
          },
        },
        pullquote: {
          quote:
            "The sectors that absorb Mexico's biggest contracts are the same four with the longest documented corruption histories. Concentrated capture, by definition.",
          quote_es:
            'Los sectores que absorben los contratos más grandes de México son los mismos cuatro con las historias de corrupción mejor documentadas. Captura concentrada, por definición.',
          stat: '92%',
          statLabel:
            'mega-contract pesos concentrated in 4 sectors (Energía, Salud, Infra, Hacienda)',
          statLabel_es:
            'pesos en mega-contratos concentrados en 4 sectores (Energía, Salud, Infra, Hacienda)',
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
        title: 'The Ladder Runs Backwards',
        title_es: 'La escalera corre al revés',
        subtitle: 'Mexico scrutinizes its safest contracts hardest and its riskiest least',
        subtitle_es:
          'México escudriña sus contratos más seguros con más fuerza y los más riesgosos con menos',
        prose: [
          'By law, the opening intuition should hold. Every rung of the ladder carries oversight duties assigned to a specific institution. ASF audits federal accounts after the fact. SFP polices the integrity of the procurement process. COFECE investigates anticompetitive behavior. UIF tracks suspicious financial flows. In principle, between these four, no significant contract escapes scrutiny.',
          'In practice, the top of the ladder is where the institutions stop functioning. The 40 contracts above 10 billion pesos — every one high-risk, average score 0.962 — are also the 40 most likely to involve politically connected vendors and presidential-priority institutions. Auditing a 10-billion-peso contract is not a technical exercise; it is a political confrontation, and confrontations are rationed. Those 40 are not a workload for ASF. They are a list of conversations the political system has chosen not to have.',
          'Meanwhile the same institutions are visibly busy at the bottom. SFP and ASF review thousands of small-value contracts a year, because those audits are cheaper, easier, and generate press releases. The result is an audit intensity inversely correlated with corruption risk. The cleanest contracts get the most scrutiny; the riskiest get the least — exactly backwards from the intuition this story opened with. The risk ladder and the audit ladder are the same ladder, turned upside down.',
          'RUBLI does not resolve this. It quantifies it. 819 billion pesos of contracting in the >10B tier; 33 vendors; risk average 0.962; an estimated 95 percent of contracts above 5 billion pesos never audited, against an estimated audit coverage rate of 5 percent. That is the accountability gap in one five-line summary. Closing it needs no new laws and no new technology — only naming the 33 vendors and the 40 contracts and assigning each to a specific investigation, regardless of which ministry signed.',
        ],
        prose_es: [
          'Por ley, la intuición inicial debería sostenerse. Cada peldaño de la escalera lleva deberes de supervisión asignados a una institución específica. La ASF audita las cuentas federales a posteriori. La SFP vigila la integridad del proceso de contratación. La COFECE investiga comportamientos anticompetitivos. La UIF rastrea flujos financieros sospechosos. En principio, entre estas cuatro, ningún contrato significativo escapa al escrutinio.',
          'En la práctica, la cima de la escalera es donde las instituciones dejan de funcionar. Los 40 contratos por encima de 10 mil millones de pesos — todos de alto riesgo, calificación promedio 0.962 — son también los 40 con mayor probabilidad de involucrar a proveedores políticamente conectados e instituciones cercanas a las prioridades presidenciales. Auditar un contrato de 10 mil millones de pesos no es un ejercicio técnico; es una confrontación política, y las confrontaciones se racionan. Esos 40 no son una carga de trabajo para la ASF. Son una lista de conversaciones que el sistema político ha decidido no tener.',
          'Mientras tanto, las mismas instituciones están visiblemente ocupadas en la parte baja. La SFP y la ASF revisan miles de contratos de bajo valor al año, porque esas auditorías son más baratas, más fáciles y generan comunicados de prensa. El resultado es una intensidad de auditoría inversamente correlacionada con el riesgo de corrupción. Los contratos más limpios reciben el mayor escrutinio; los más riesgosos, el menor — exactamente al revés de la intuición con que abrió esta historia. La escalera de riesgo y la escalera de auditoría son la misma escalera, puesta de cabeza.',
          'RUBLI no resuelve esto. Lo cuantifica. 819 mil millones de pesos de contratación en el nivel >10 mil millones; 33 proveedores; promedio de riesgo 0.962; un estimado del 95 por ciento de los contratos por encima de 5 mil millones nunca auditados, frente a una tasa estimada de cobertura de auditoría del 5 por ciento. Esa es la forma del vacío de rendición de cuentas en un resumen de cinco líneas. Cerrarlo no requiere nuevas leyes ni nueva tecnología — solo nombrar a los 33 proveedores y los 40 contratos y asignar cada uno a una investigación específica, independientemente de qué ministerio los firmó.',
        ],
        pullquote: {
          quote:
            'Mexico audits its cleanest contracts the most and its riskiest contracts the least. The accountability gap grows with every peso of contract value.',
          quote_es:
            'México audita sus contratos más limpios con la mayor intensidad y los más riesgosos con la menor. El vacío de rendición de cuentas crece con cada peso de valor de contrato.',
          stat: '95%',
          statLabel: 'estimated share of contracts above 5B MXN never audited',
          statLabel_es:
            'porcentaje estimado de contratos por encima de 5 mil millones nunca auditados',
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
    nextSteps: [
      "Request from SFP the complete list of contracts above 100M MXN awarded via direct adjudication in 2023-2025; cross-reference against RUBLI's P2 and P6 vendor lists.",
      'File ASF audit requests for the top 20 contracts above 500M MXN that RUBLI flags as critical-risk, naming the specific contract IDs.',
      "Compare Mexico's large-contract audit coverage rate against OECD peer countries using the 2023 Procurement Performance Review baseline data.",
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

  // === STORY 3: Anatomy of a Captured Market ===
  {
    slug: 'el-monopolio-invisible',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    byline: 'RUBLI Investigative Data Unit',
    status: 'reporteado',
    estimatedMinutes: 17,
    headline: 'Anatomy of a Captured Market',
    headline_es: 'Anatomía de un mercado capturado',
    subheadline:
      "From the surface, Mexico's IMSS pharmaceutical market looks like a functioning one: four distributors, thousands of tenders, 23 years of competition. Cut into it and a single structure appears. Grupo Fármacos Especializados, Farmacéuticos Maypo, Laboratorios PISA, and DIMM collected 328.6 billion pesos, funneled it through one customer, and passed dominance between themselves as the rules changed three times. This is a dissection, layer by layer, of a market that is not a market.",
    subheadline_es:
      'En la superficie, el mercado farmacéutico del IMSS en México parece uno funcional: cuatro distribuidoras, miles de licitaciones, 23 años de competencia. Al cortar dentro de él aparece una sola estructura. Grupo Fármacos Especializados, Farmacéuticos Maypo, Laboratorios PISA y DIMM recibieron 328.6 mil millones de pesos, los canalizaron a través de un solo cliente y se pasaron el dominio entre ellos mientras las reglas cambiaban tres veces. Esta es una disección, capa por capa, de un mercado que no es un mercado.',
    leadStat: {
      value: '328.6B MXN',
      label: 'collected by four vendors in a single pharmaceutical market',
      label_es: 'recaudados por cuatro proveedores en un solo mercado farmacéutico',
      sublabel: 'Grupo Fármacos · Maypo · PISA · DIMM, 2003-2025',
      sublabel_es: 'Grupo Fármacos · Maypo · PISA · DIMM, 2003-2025',
      color: '#dc2626',
    },
    kickerStats: [
      {
        value: '328.6B MXN',
        suffix: 'four vendors',
        suffix_es: 'cuatro proveedores',
        tone: 'critical',
      },
      {
        value: '10.4%',
        suffix: 'of every IMSS peso',
        suffix_es: 'de cada peso del IMSS',
        tone: 'data',
      },
      {
        value: '5,285',
        suffix: 'shared bidding procedures',
        suffix_es: 'procedimientos compartidos',
        tone: 'data',
      },
    ],
    relatedSlugs: ['captura-institucional', 'el-gran-precio', 'la-ilusion-competitiva'],
    lensTags: {
      patterns: ['P1', 'P5', 'P6'],
      sectors: ['salud'],
      years: [2014, 2018, 2024],
      terms: ['monopolio', 'farmacéutico', 'IMSS', 'PISA', 'Maypo'],
    },
    entities: [
      {
        type: 'vendor',
        id: 29277,
        name: 'Grupo Fármacos Especializados',
        riskScore: 0.99,
        ariaTier: 1,
        role: 'Principal suspect · 133.4B MXN',
        role_es: 'Principal investigado · 133.4 MDP',
      },
      {
        type: 'vendor',
        id: 2873,
        name: 'Farmacéuticos Maypo',
        riskScore: 0.95,
        ariaTier: 1,
        role: 'Principal suspect · 88.0B MXN',
        role_es: 'Principal investigado · 88.0 MDP',
      },
      {
        type: 'vendor',
        id: 4335,
        name: 'Laboratorios PISA',
        riskScore: 0.75,
        ariaTier: 2,
        role: 'Principal suspect · 55.6B MXN',
        role_es: 'Principal investigado · 55.6 MDP',
      },
      {
        type: 'vendor',
        id: 13885,
        name: 'DIMM',
        riskScore: 0.54,
        ariaTier: 2,
        role: 'Principal suspect · 51.6B MXN',
        role_es: 'Principal investigado · 51.6 MDP',
      },
    ],
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
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Surface',
        title_es: 'La superficie',
        subtitle: 'What a market looks like before you cut into it',
        subtitle_es: 'Cómo se ve un mercado antes de cortarlo',
        prose: [
          "On the surface, this looks like a market. Four pharmaceutical distributors — GRUPO FÁRMACOS ESPECIALIZADOS, FARMACÉUTICOS MAYPO, LABORATORIOS PISA, and DIMM (Distribuidora Internacional de Medicamentos y Equipo Médico) — collected 328.6 billion pesos from Mexico's federal government between 2003 and 2025. Four named competitors, two decades of activity, thousands of tenders, billions in revenue changing hands. On paper, four sellers is a market, not a monopoly.",
          "Make the first incision and the surface gives way. The combined risk-score average across the four is 0.69 — solidly critical in RUBLI's v0.8.5 model, a risk indicator rather than a verdict. Three of the four sit at the very top of RUBLI's entire vendor risk ladder. Grupo Fármacos carries 0.99; Maypo 0.95; PISA 0.75; DIMM 0.54. These are flags: the model identifies behavior consistent with collusive procurement, not proof of it. But four flagged vendors holding 328.6 billion pesos in a single product line is the kind of reading that invites a closer look.",
          'There is a further detail the surface does not explain. The framework that produced these contracts mutated three times — IMSS-direct procurement under Calderón, INSABI/BIRMEX consolidation under AMLO, IMSS-Bienestar consolidated tendering under Sheinbaum. Three different procurement architectures, three different sets of rules. The recipients persisted through all of them. A market with four sellers can still be a single captured organism. What follows peels it open, one layer at a time, until the structure underneath the surface is exposed.',
        ],
        prose_es: [
          'En la superficie, esto parece un mercado. Cuatro distribuidoras farmacéuticas — GRUPO FÁRMACOS ESPECIALIZADOS, FARMACÉUTICOS MAYPO, LABORATORIOS PISA y DIMM (Distribuidora Internacional de Medicamentos y Equipo Médico) — recibieron 328.6 mil millones de pesos del gobierno federal mexicano entre 2003 y 2025. Cuatro competidoras con nombre, dos décadas de actividad, miles de licitaciones, miles de millones cambiando de manos. En el papel, cuatro vendedoras son un mercado, no un monopolio.',
          'Haz la primera incisión y la superficie cede. La calificación de riesgo combinada de los cuatro promedia 0.69 — sólidamente en nivel crítico del modelo v0.8.5 de RUBLI, un indicador de riesgo y no un veredicto. Tres de las cuatro se ubican en la cima misma de toda la escalera de riesgo de proveedores de RUBLI. Grupo Fármacos carga 0.99; Maypo 0.95; PISA 0.75; DIMM 0.54. Son señales: el modelo identifica comportamiento consistente con contratación colusiva, no su prueba. Pero cuatro proveedores señalados que concentran 328.6 mil millones de pesos en una sola línea de producto es la clase de lectura que invita a mirar más de cerca.',
          'Hay un detalle adicional que la superficie no explica. El marco que produjo estos contratos mutó tres veces — contratación directa del IMSS bajo Calderón, consolidación vía INSABI/BIRMEX bajo AMLO, licitación consolidada IMSS-Bienestar bajo Sheinbaum. Tres arquitecturas de contratación distintas, tres conjuntos de reglas distintos. Los destinatarios persistieron a través de todos ellos. Un mercado con cuatro vendedoras puede seguir siendo un solo organismo capturado. Lo que sigue lo abre, capa por capa, hasta exponer la estructura que yace bajo la superficie.',
        ],
        pullquote: {
          quote:
            'Four named competitors. Two decades of tenders. On paper, a market. Cut into it and a single structure appears.',
          quote_es:
            'Cuatro competidoras con nombre. Dos décadas de licitaciones. En el papel, un mercado. Córtalo y aparece una sola estructura.',
          stat: '328.6B MXN',
          statLabel: 'four-vendor pharmaceutical concentration, 2003-2025',
          statLabel_es: 'concentración farmacéutica de cuatro proveedores, 2003-2025',
          barValue: 0.103,
          barLabel: '10.4% of all federal IMSS contracting (any sector, any year)',
          barLabel_es:
            '10.4% de toda la contratación federal del IMSS (cualquier sector, cualquier año)',
          vizTemplate: 'mass-sliver',
        },
        chartConfig: {
          type: 'inline-bar',
          title: 'The Surface — Four Vendors, 328.6 Billion Pesos',
          title_es: 'La superficie — Cuatro proveedores, 328.6 mil millones de pesos',
          chartId: 'big-four-totals',
          data: {
            points: [
              {
                label: 'Grupo Fármacos',
                value: 133.4,
                riskScore: 0.99,
                annotation: 'risk 0.99',
                annotation_es: 'riesgo 0.99',
              },
              {
                label: 'Maypo',
                value: 88,
                riskScore: 0.95,
                annotation: 'risk 0.95',
                annotation_es: 'riesgo 0.95',
              },
              {
                label: 'PISA',
                value: 55.6,
                riskScore: 0.75,
                annotation: 'risk 0.75',
                annotation_es: 'riesgo 0.75',
              },
              {
                label: 'DIMM',
                value: 51.6,
                riskScore: 0.54,
                annotation: 'risk 0.54',
                annotation_es: 'riesgo 0.54',
              },
            ],
            unit: 'B MXN',
            annotation:
              'Total federal contracting per vendor, 2003-2025. Combined: 328.6B MXN. Three of the four carry critical-tier risk scores.',
            annotation_es:
              'Contratación federal total por proveedor, 2003-2025. Combinado: 328.6 mil millones de pesos. Tres de los cuatro tienen calificaciones de riesgo de nivel crítico.',
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
        title: 'The Customer',
        title_es: 'El cliente',
        subtitle: 'Peel back the buyer side',
        subtitle_es: 'Retira la cara del comprador',
        prose: [
          "Turn the specimen over and look at who is buying. The whole market depends on a single customer. The Instituto Mexicano del Seguro Social (IMSS) — Mexico's largest single-payer health institution, with a budget rivaling several state economies — underwrites between half and three-quarters of every vendor's lifetime federal revenue. For Grupo Fármacos Especializados it is 60.1 percent. For Maypo, 50.5 percent. For DIMM, 68.5 percent. For Laboratorios PISA, 72.2 percent — the highest concentration of the four. Four sellers, but only one buyer of consequence.",
          "Now widen to the customer's own books. Combined, the four collected 202.9 billion pesos in IMSS contracting alone — 10.4 percent of every peso IMSS spent on any contractor in any sector across 23 years, measured against a 1,957B MXN lifetime baseline. Four pharmaceutical vendors, one in every ten pesos. No competitive supplier base, in any sector of any economy, produces that shape on its own.",
          'Concentration of this magnitude is not competitive market dynamics. It is compounding advantage: catalog familiarity, delivery infrastructure tuned to IMSS\'s exact specifications, and direct-award eligibility earned from prior contracting history. The membrane that keeps competitors out is written into law — "existing supplier relationship" under Article 41 of the Ley de Adquisiciones, the clause that converts past dependence into present preference. Each contract makes the next one easier to award to the same hands.',
        ],
        prose_es: [
          'Voltea el espécimen y mira quién compra. Todo el mercado depende de un solo cliente. El Instituto Mexicano del Seguro Social (IMSS) — la institución de salud de pagador único más grande de México, con un presupuesto que rivaliza con el de varias economías estatales — sostiene entre la mitad y tres cuartas partes de los ingresos federales de por vida de cada proveedor. Para Grupo Fármacos Especializados es el 60.1 por ciento. Para Maypo, el 50.5 por ciento. Para DIMM, el 68.5 por ciento. Para Laboratorios PISA, el 72.2 por ciento — la mayor concentración de los cuatro. Cuatro vendedoras, pero un solo comprador de peso.',
          'Ahora amplía a los propios libros del cliente. En conjunto, los cuatro recaudaron 202.9 mil millones de pesos solo en contratación con el IMSS — el 10.4 por ciento de cada peso que el IMSS gastó en cualquier contratista, en cualquier sector, en 23 años, medido contra una base de 1,957 mil millones de pesos de gasto histórico. Cuatro proveedores farmacéuticos, uno de cada diez pesos. Ninguna base de proveedores competitiva, en ningún sector de ninguna economía, produce esa forma por sí sola.',
          'Una concentración de esta magnitud no es dinámica de mercado competitivo. Es ventaja compuesta: familiaridad con el catálogo, infraestructura de entrega ajustada a las especificaciones exactas del IMSS y elegibilidad para adjudicación directa ganada por historial de contratación previo. La membrana que mantiene fuera a los competidores está escrita en la ley — "relación de proveedor existente" bajo el Artículo 41 de la Ley de Adquisiciones, la cláusula que convierte la dependencia pasada en preferencia presente. Cada contrato vuelve más fácil adjudicar el siguiente a las mismas manos.',
        ],
        chartConfig: {
          type: 'inline-stacked-bar',
          title: 'The Customer — How Much of Each Vendor Lives Inside One Buyer',
          title_es: 'El cliente — Cuánto de cada proveedor vive dentro de un solo comprador',
          stacked: {
            rows: [
              {
                label: 'Grupo Fármacos',
                total: 133.4,
                highlight: 80,
                annotation: '60.1% IMSS',
                annotation_es: '60.1% IMSS',
              },
              {
                label: 'Maypo',
                total: 88,
                highlight: 43.9,
                annotation: '50.5% IMSS',
                annotation_es: '50.5% IMSS',
              },
              {
                label: 'PISA',
                total: 55.6,
                highlight: 43.9,
                annotation: '72.2% IMSS',
                annotation_es: '72.2% IMSS',
              },
              {
                label: 'DIMM',
                total: 51.6,
                highlight: 35.2,
                annotation: '68.5% IMSS',
                annotation_es: '68.5% IMSS',
              },
            ],
            unit: 'B MXN',
            anchor: {
              value: '202.9B MXN',
              label: 'BIG FOUR · IMSS CONTRACTING ONLY · 2003-2025',
              label_es: 'BIG FOUR · SOLO CONTRATACIÓN IMSS · 2003-2025',
            },
            annotation:
              "Solid bar = IMSS portion. Faded portion = all other federal customers combined. Each vendor's dependency on IMSS is between 50% and 72%.",
            annotation_es:
              'Barra sólida = porción IMSS. Porción atenuada = todos los demás clientes federales combinados. La dependencia del IMSS de cada proveedor está entre 50% y 72%.',
            highlightColor: '#dc2626',
            highlightLabel: 'IMSS portion',
            highlightLabel_es: 'porción IMSS',
            baseLabel: 'all other clients',
            baseLabel_es: 'todos los demás clientes',
          },
        },
        pullquote: {
          quote:
            'Four pharmaceutical vendors. One customer. One in every ten pesos IMSS spent on any contractor across 23 years.',
          quote_es:
            'Cuatro proveedores farmacéuticos. Un solo cliente. Uno de cada diez pesos que el IMSS gastó en cualquier contratista en 23 años.',
          stat: '10.4%',
          statLabel: 'Big Four share of all federal IMSS contracting, 2003-2025',
          statLabel_es:
            'Participación del Big Four en toda la contratación federal del IMSS, 2003-2025',
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
        title: 'The Lattice',
        title_es: 'El entramado',
        subtitle: 'Peel back the bidding records',
        subtitle_es: 'Retira los registros de licitación',
        prose: [
          'Peel back the bidding records and the connective tissue appears: the four are not four. Across the 23-year window they show up together in the same procurement procedures with a frequency no independent competitors would produce. Maypo and PISA share 1,436 procedures — 1,436 distinct tenders in which both companies appear as bidders or contract recipients. Grupo Fármacos and Maypo: 1,258. Grupo Fármacos and DIMM: 810. Maypo and DIMM: 478. Grupo Fármacos and PISA: 257. PISA and DIMM: 46. In total, 5,285 shared procurement procedures.',
          'These overlaps are not consistent with four independent companies competing for distinct contracts. They are the structural signature of cover bidding: a small set of vendors who routinely appear at the same auctions, while the winning identity rotates from procedure to procedure and the underlying group stays constant. OECD competition research identifies this exact pattern — repeated co-bidding among a small supplier set — as one of the most reliable detectors of cartel behavior in public procurement. The Maypo↔PISA dyad alone, at 1,436 shared tenders, is the connective tissue of a single organism.',
          "A second reading sharpens it. The direct-award rate across all Big-Four contracts is 69 percent, against an OECD ceiling of 25 to 30 percent. More than two of every three pesos these vendors collected bypassed open competition entirely. None of this proves a cartel on its own; it is consistent with collusive tendering and matches the pattern the OECD describes. If the lattice shows the organism's shape, the next layer shows it breathing.",
        ],
        prose_es: [
          'Retira los registros de licitación y aparece el tejido conectivo: los cuatro no son cuatro. A lo largo de los 23 años aparecen juntos en los mismos procedimientos de contratación con una frecuencia que ningún competidor independiente produciría. Maypo y PISA comparten 1,436 procedimientos — 1,436 licitaciones distintas en las que ambas empresas aparecen como licitantes o destinatarias de contratos. Grupo Fármacos y Maypo: 1,258. Grupo Fármacos y DIMM: 810. Maypo y DIMM: 478. Grupo Fármacos y PISA: 257. PISA y DIMM: 46. En total, 5,285 procedimientos de contratación compartidos.',
          'Estos solapamientos no son consistentes con cuatro empresas independientes compitiendo por contratos distintos. Son la firma estructural de la cobertura cruzada: un pequeño conjunto de proveedores que rutinariamente aparece en las mismas subastas, mientras la identidad ganadora rota de procedimiento en procedimiento y el grupo subyacente permanece constante. La investigación de competencia de la OCDE identifica exactamente este patrón — co-licitación repetida entre un pequeño conjunto de proveedores — como uno de los detectores más confiables del comportamiento de cártel en la contratación pública. El dúo Maypo↔PISA por sí solo, con 1,436 licitaciones compartidas, es el tejido conectivo de un solo organismo.',
          'Una segunda lectura lo afina. La tasa de adjudicación directa en todos los contratos del Big Four es del 69 por ciento, contra un límite OCDE del 25 al 30 por ciento. Más de dos de cada tres pesos que estos proveedores recaudaron eludieron por completo la competencia abierta. Nada de esto prueba un cártel por sí solo; es consistente con licitación colusiva y coincide con el patrón que describe la OCDE. Si el entramado muestra la forma del organismo, la siguiente capa lo muestra respirando.',
        ],
        chartConfig: {
          type: 'inline-network',
          title: 'The Lattice — Shared Bidding Procedures Among the Four',
          title_es: 'El entramado — Procedimientos de licitación compartidos entre los cuatro',
          chartId: 'big-four-network',
          network: {
            nodes: [
              {
                id: 'gf',
                label: 'Grupo F.',
                sublabel: '133.4B',
                color: '#dc2626',
                highlight: true,
              },
              {
                id: 'maypo',
                label: 'Maypo',
                sublabel: '88.0B',
                color: '#a06820',
              },
              {
                id: 'pisa',
                label: 'PISA',
                sublabel: '55.6B',
                color: '#3b82f6',
              },
              {
                id: 'dimm',
                label: 'DIMM',
                sublabel: '51.6B',
                color: '#8b5cf6',
              },
            ],
            edges: [
              {
                from: 'maypo',
                to: 'pisa',
                weight: 1436,
                label: '1,436',
              },
              {
                from: 'gf',
                to: 'maypo',
                weight: 1258,
                label: '1,258',
              },
              {
                from: 'gf',
                to: 'dimm',
                weight: 810,
                label: '810',
              },
              {
                from: 'maypo',
                to: 'dimm',
                weight: 478,
                label: '478',
              },
              {
                from: 'gf',
                to: 'pisa',
                weight: 257,
                label: '257',
              },
              {
                from: 'pisa',
                to: 'dimm',
                weight: 46,
                label: '46',
              },
            ],
            anchor: {
              value: '5,285',
              label: 'TOTAL SHARED PROCUREMENT PROCEDURES',
              label_es: 'TOTAL DE PROCEDIMIENTOS COMPARTIDOS',
            },
            annotation:
              'Edge thickness scales with the number of bidding procedures both vendors appear in. Maypo↔PISA (1,436) and Grupo Fármacos↔Maypo (1,258) carry most of the cartel weight — exactly the dyads that dominated IMSS pharmaceutical contracting through the 2010s.',
            annotation_es:
              'El grosor de cada conexión es proporcional al número de procedimientos de licitación en los que ambos proveedores aparecen. Maypo↔PISA (1,436) y Grupo Fármacos↔Maypo (1,258) cargan la mayor parte del peso del cártel — exactamente las dúos que dominaron la contratación farmacéutica del IMSS durante la década de 2010.',
          },
        },
        pullquote: {
          quote:
            'Maypo and PISA appear in 1,436 of the same procurement procedures. The OECD calls this co-bidding pattern one of the most reliable detectors of cartel behavior.',
          quote_es:
            'Maypo y PISA aparecen en 1,436 de los mismos procedimientos de licitación. La OCDE llama a este patrón uno de los detectores más confiables de comportamiento de cártel.',
          stat: '5,285',
          statLabel: 'shared bidding procedures among the Big Four (combined)',
          statLabel_es: 'procedimientos de licitación compartidos entre el Big Four (combinados)',
          barValue: 0.69,
          barLabel: 'Direct-award rate across all Big-Four contracts: 69% — vs OECD ceiling 25-30%',
          barLabel_es:
            'Tasa de adjudicación directa en todos los contratos del Big Four: 69% — vs límite OCDE 25-30%',
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
        id: 'ch4',
        number: 4,
        title: 'The Pulse',
        title_es: 'El pulso',
        subtitle: 'Peel back time, 2003-2025',
        subtitle_es: 'Retira el tiempo, 2003-2025',
        prose: [
          "Peel back time and the organism's metabolism appears: a relay. Plotted on one axis, dominance passes from vendor to vendor as the procurement architecture mutates. The early 2000s belonged to PISA, with annual contracting that peaked at 2.97 billion pesos in 2009 — three times any rival. Then PISA went quiet. Between 2010 and 2019 it never crossed 3.5 billion in a year, while Grupo Fármacos, Maypo, and DIMM ramped relentlessly upward.",
          'Grupo Fármacos was the breakout of the Calderón–Peña era. From 1.07 billion in 2007 it climbed past Maypo and DIMM to a 19.94 billion peak in 2017 — a single-year figure larger than the entire annual budget of several Mexican federal ministries. Maypo peaked the year after at 10.05 billion (2018). DIMM peaked the same year at 7.96 billion (2018). Three of the four vendors hit their all-time annual peaks within a 12-month window.',
          'Then the cliff. In 2020, Grupo Fármacos went from 17.64 billion pesos in 2019 to zero — not slowed, not reduced, not transitioned to other customers, zero — and has stayed there every year since. DIMM collapsed by 97 percent in the same year. Maypo cut in half. The cause is documented: the AMLO administration dissolved IMSS-direct pharmaceutical procurement and consolidated purchasing through INSABI and BIRMEX, expressly to break what it characterized as "the cartel of distributors."',
          "But the spend did not vanish — it changed hands. PISA, quiet for a decade, resurged: from 3.5 billion in 2019 to 6.42 billion in 2020, then 2.56, 3.77, 0.13, 0.67 across the COVID era. And in 2025, under Sheinbaum's IMSS-Bienestar consolidated-procurement architecture, PISA contracted 19.46 billion pesos in a single year — mirroring Grupo Fármacos' 2017 all-time peak almost exactly. This is the revelation of the dissection. The architecture changed three times. The dominant vendor changed identity. The dependency did not. The market regenerates its own monopoly regardless of the rules imposed on it.",
        ],
        prose_es: [
          'Retira el tiempo y aparece el metabolismo del organismo: un relevo. Graficado en un solo eje, el dominio pasa de proveedor en proveedor a medida que la arquitectura de contratación muta. Los inicios de los 2000 pertenecieron a PISA, con una contratación anual que alcanzó su pico de 2.97 mil millones de pesos en 2009 — tres veces más que cualquier rival. Luego PISA quedó en silencio. Entre 2010 y 2019 nunca cruzó los 3.5 mil millones en un año, mientras que Grupo Fármacos, Maypo y DIMM escalaban implacablemente.',
          'Grupo Fármacos fue la revelación de la era Calderón-Peña. De 1.07 mil millones en 2007 escaló más allá de Maypo y DIMM hasta un pico de 19.94 mil millones de pesos en 2017 — una cifra de un solo año mayor que el presupuesto anual completo de varios ministerios federales mexicanos. Maypo alcanzó su pico al año siguiente con 10.05 mil millones (2018). DIMM alcanzó el suyo el mismo año con 7.96 mil millones (2018). Tres de los cuatro proveedores registraron sus máximos anuales históricos en una ventana de 12 meses.',
          'Luego el precipicio. En 2020, Grupo Fármacos pasó de 17.64 mil millones de pesos en 2019 a cero — no se redujo, no transitó hacia otros clientes, cero — y ha permanecido ahí cada año desde entonces. DIMM colapsó un 97 por ciento el mismo año. Maypo se redujo a la mitad. La causa está documentada: la administración de AMLO disolvió la contratación farmacéutica directa del IMSS y consolidó las compras a través del INSABI y BIRMEX, expresamente para romper lo que caracterizó como "el cártel de los distribuidores".',
          'Pero el gasto no desapareció — cambió de manos. PISA, silenciosa durante una década, resurgió: de 3.5 mil millones en 2019 a 6.42 mil millones en 2020, luego 2.56, 3.77, 0.13, 0.67 a lo largo de la era COVID. Y en 2025, bajo la arquitectura de contratación consolidada de IMSS-Bienestar de Sheinbaum, PISA contrató 19.46 mil millones de pesos en un solo año — reflejando casi exactamente el pico histórico de 2017 de Grupo Fármacos. Esta es la revelación de la disección. La arquitectura cambió tres veces. El proveedor dominante cambió de identidad. La dependencia no. El mercado regenera su propio monopolio sin importar las reglas que se le impongan.',
        ],
        chartConfig: {
          type: 'inline-multi-line',
          title: 'The Pulse — The Big Four, Annual Contracting 2003-2025',
          title_es: 'El pulso — El Big Four, contratación anual 2003-2025',
          chartId: 'big-four-relay',
          multiSeries: {
            xLabels: [
              '2003',
              '2004',
              '2005',
              '2006',
              '2007',
              '2008',
              '2009',
              '2010',
              '2011',
              '2012',
              '2013',
              '2014',
              '2015',
              '2016',
              '2017',
              '2018',
              '2019',
              '2020',
              '2021',
              '2022',
              '2023',
              '2024',
              '2025',
            ],
            unit: 'B MXN',
            yLabel: 'Annual contract value',
            yLabel_es: 'Valor de contratación anual',
            series: [
              {
                name: 'Grupo Fármacos',
                color: '#dc2626',
                values: [
                  0, 0, 0, 0, 1.07, 2.81, 2.01, 12.86, 0.96, 5.83, 14.94, 13.23, 13.31, 12.93,
                  19.94, 15.64, 17.64, 0, 0, 0, 0, 0, 0,
                ],
                annotation: {
                  xIndex: 14,
                  text: '19.94 peak (2017)',
                  text_es: '19.94 pico (2017)',
                },
                totalCaption: '· 133.4B total',
                totalCaption_es: '· 133.4B total',
              },
              {
                name: 'Maypo',
                color: '#a06820',
                values: [
                  0.36, 0, 0.43, 1.04, 2.08, 1.62, 1.73, 5.8, 1.97, 3.13, 6.3, 4.69, 6.46, 4.57,
                  9.77, 10.05, 7.98, 4.17, 4.5, 3.87, 2.37, 2.86, 0.31,
                ],
                annotation: {
                  xIndex: 15,
                  text: '10.05 (2018)',
                  text_es: '10.05 (2018)',
                },
                totalCaption: '· 88.0B total',
                totalCaption_es: '· 88.0B total',
              },
              {
                name: 'PISA',
                color: '#3b82f6',
                values: [
                  1.18, 0, 2.41, 0.56, 1.39, 0.73, 2.97, 1.58, 0.18, 0.36, 0.71, 0.94, 2.6, 0.96,
                  1.23, 0.47, 3.5, 6.42, 2.56, 3.77, 0.13, 0.67, 19.46,
                ],
                annotation: {
                  xIndex: 22,
                  text: '19.46 (2025)',
                  text_es: '19.46 (2025)',
                },
                totalCaption: '· 55.6B total',
                totalCaption_es: '· 55.6B total',
              },
              {
                name: 'DIMM',
                color: '#8b5cf6',
                values: [
                  0.01, 0, 0.02, 0, 0, 0, 0, 3.27, 0.13, 0.97, 4.56, 4.26, 5.66, 6.53, 7.4, 7.96,
                  7.51, 0.18, 0.24, 0.3, 0.24, 1.05, 1.09,
                ],
                annotation: {
                  xIndex: 15,
                  text: '7.96 (2018)',
                  text_es: '7.96 (2018)',
                },
                totalCaption: '· 51.6B total',
                totalCaption_es: '· 51.6B total',
              },
            ],
            annotation:
              "Read the relay: PISA dominates 2003-2009 → Grupo Fármacos / Maypo / DIMM dominate 2010-2019 → 2020 cliff (Grupo F. + DIMM collapse) → PISA returns and explodes in 2025 (19.46B, matching Grupo F.'s 2017 all-time peak). The architecture that produced these contracts changed three times. The dependency did not.",
            annotation_es:
              'Lee el relevo: PISA domina 2003-2009 → Grupo Fármacos / Maypo / DIMM dominan 2010-2019 → desplome 2020 (Grupo F. + DIMM colapsan) → PISA regresa y explota en 2025 (19.46B, igualando el pico histórico de 2017 de Grupo F.). La arquitectura que produjo estos contratos cambió tres veces. La dependencia no.',
          },
        },
        pullquote: {
          quote:
            'From 17.64 billion in 2019 to zero in 2020. Not slowed. Not reduced. Zero. Then PISA — quiet for a decade — resurged.',
          quote_es:
            'De 17.64 mil millones en 2019 a cero en 2020. No reducido. Cero. Y entonces PISA — silenciosa durante una década — resurgió.',
          stat: '19.46B MXN',
          statLabel: "PISA 2025 — matches Grupo Fármacos' all-time 2017 peak almost exactly",
          statLabel_es:
            'PISA 2025 — iguala el pico histórico de Grupo Fármacos en 2017 casi exactamente',
        },
        sources: [
          'RUBLI per-year aggregation: SUM(amount_mxn) GROUP BY contract_year, vendor_id for the four vendors.',
          'DOF. (2019). Decreto de creación del Instituto de Salud para el Bienestar (INSABI).',
          'DOF. (2024). Reformas a la Ley de IMSS-Bienestar y consolidación de compra federal.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Void at the Core',
        title_es: 'El vacío en el centro',
        subtitle: 'The deepest layer is empty',
        subtitle_es: 'La capa más profunda está vacía',
        prose: [
          "The final layer of the dissection is a void — the place where oversight should be and is not. No public investigation has named all four. Grupo Fármacos Especializados — 133 billion pesos over 13 years, operating at a 0.995 risk score — has never been the focus of a published ASF audit. Maypo appears in periodic IMSS-procurement features, never the subject of a sustained oversight inquiry. DIMM is virtually unknown to the public. PISA has the most journalistic coverage of the four, and yet its 2025 explosion to 19.46 billion pesos under IMSS-Bienestar's consolidated tender has produced no published regulatory response at the time of this writing.",
          'The 2025 PISA spike deserves immediate scrutiny. A distributor that had not crossed 3.5 billion pesos annually in over a decade contracts 19.46 billion in a single year — including a 6.69-billion-peso consolidated medicine contract awarded by IMSS in February 2025 (PROC-2025-IMSS-CONS-MED) and a 4.82-billion-peso direct-award contract for "claves del sector salud" awarded in June 2025 (PROC-2025-IMSS-CLAVES). The direct-award status alone is a flag. The size is unprecedented. The vendor\'s prior absence from the consolidated-tender architecture is conspicuous.',
          "The instruments to examine all of this exist. COFECE has the legal authority to open Art. 53 investigations into prácticas monopólicas absolutas under the Ley Federal de Competencia Económica. RUBLI supplies the algorithmic detection, classifying these vendors under its P1 pattern and placing them in the ARIA queue at Tier 1 — alongside 40 non-pharmaceutical P1 vendors awaiting the same scrutiny. The OECD/COFECE 2021 Competition Assessment of the Mexican Health Sector flagged pharmaceutical distribution as the highest-risk sector for collusive tendering and recommended exactly this kind of algorithmic monitoring in its Recommendations 3 through 5, echoing the OECD's 2012 Recommendation on Fighting Bid Rigging in Public Procurement.",
          'What is missing is the commitment to convert algorithmic flags into formal investigations. The specimen has been opened. Its structure is visible in the data, traceable in the bidding records, unconcealed in its financials. The architecture changed three times; the vendor changed identity; the dependency did not. Until the void at the core fills, the captured market will keep regenerating around whatever architecture Mexican health procurement adopts next — and no one with the authority to look has looked.',
        ],
        prose_es: [
          'La capa final de la disección es un vacío — el lugar donde debería estar la fiscalización y no está. Ninguna investigación pública ha nombrado a los cuatro. Grupo Fármacos Especializados — 133 mil millones de pesos en 13 años, operando con una calificación de riesgo de 0.995 — nunca ha sido foco de una auditoría publicada de la ASF. Maypo aparece en reportajes periódicos sobre contratación del IMSS, nunca como sujeto de una investigación de supervisión sostenida. DIMM es prácticamente desconocida para el público. PISA tiene la mayor cobertura periodística de las cuatro, y sin embargo su explosión de 2025 a 19.46 mil millones de pesos bajo la licitación consolidada de IMSS-Bienestar no ha producido ninguna respuesta regulatoria publicada al momento de redactar esto.',
          'El pico de PISA en 2025 merece escrutinio inmediato. Una distribuidora que no había cruzado los 3.5 mil millones de pesos anuales en más de una década contrata 19.46 mil millones en un solo año — incluyendo un contrato de medicamentos consolidados por 6.69 mil millones adjudicado por el IMSS en febrero de 2025 (PROC-2025-IMSS-CONS-MED) y un contrato de adjudicación directa por 4.82 mil millones para "claves del sector salud" adjudicado en junio de 2025 (PROC-2025-IMSS-CLAVES). El estado de adjudicación directa por sí solo es una bandera. El tamaño es sin precedentes. La ausencia previa del proveedor de la arquitectura de licitación consolidada es llamativa.',
          'Los instrumentos para examinar todo esto existen. La COFECE tiene la autoridad legal para abrir investigaciones del Art. 53 sobre prácticas monopólicas absolutas bajo la Ley Federal de Competencia Económica. RUBLI aporta la detección algorítmica, clasificando a estos proveedores bajo su patrón P1 y colocándolos en la cola de ARIA en el Nivel 1 — junto a 40 proveedores P1 no farmacéuticos a la espera del mismo escrutinio. La evaluación de competencia del sector salud OCDE/COFECE de 2021 señaló a la distribución farmacéutica como el sector de mayor riesgo para licitación colusiva y recomendó exactamente este tipo de monitoreo algorítmico en sus Recomendaciones 3 a 5, haciendo eco de la Recomendación de la OCDE de 2012 sobre el Combate a la Manipulación de Licitaciones en la Contratación Pública.',
          'Lo que falta es el compromiso de convertir las señales algorítmicas en investigaciones formales. El espécimen ha sido abierto. Su estructura es visible en los datos, rastreable en los registros de licitación, sin ocultar en sus finanzas. La arquitectura cambió tres veces; el proveedor cambió de identidad; la dependencia no. Hasta que el vacío en el centro se llene, el mercado capturado seguirá regenerándose en torno a cualquier arquitectura que adopte después la contratación de salud mexicana — y nadie con la autoridad para mirar ha mirado.',
        ],
        pullquote: {
          quote:
            'The specimen has been opened. The structure is visible in the data, traceable in the records, unconcealed in the financials. No one with authority has looked.',
          quote_es:
            'El espécimen ha sido abierto. La estructura es visible en los datos, rastreable en los registros, sin ocultar en las finanzas. Nadie con autoridad ha mirado.',
          stat: '19.46B MXN',
          statLabel: "Laboratorios PISA, 2025 — under Sheinbaum's IMSS-Bienestar architecture",
          statLabel_es:
            'Laboratorios PISA, 2025 — bajo la arquitectura de IMSS-Bienestar de Sheinbaum',
        },
        sources: [
          'RUBLI ARIA queue, Tier 1 vendors with P1 classification, April 2026.',
          'COMPRANET. PISA 2025 contract records, including PROC-2025-IMSS-CONS-MED and PROC-2025-IMSS-CLAVES.',
          'OECD/COFECE. (2021). Competition Assessment of the Mexican Health Sector. Recommendations 3-5.',
          'Ley Federal de Competencia Económica, Art. 53 (prácticas monopólicas absolutas).',
        ],
      },
    ],
  },

  // === STORY 4: Now You See Competition ===
  {
    slug: 'la-ilusion-competitiva',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Now You See Competition',
    headline_es: 'Ahora Ve Usted la Competencia',
    subheadline:
      'A competitive tender promises a room full of bidders. For fourteen straight years, more than 45% of Mexico\'s "competitive" federal procedures drew exactly one. The OECD flags any single-bid rate above 15% as a structural red flag; Mexico has run three to four times that since 2010. This is how the trick works — and why every step of it is legal.',
    subheadline_es:
      'Una licitación competitiva promete una sala llena de oferentes. Durante catorce años seguidos, más del 45% de los procedimientos "competitivos" federales de México atrajeron exactamente a uno. La OCDE marca como bandera roja estructural cualquier tasa de oferta única superior al 15%; México ha operado entre tres y cuatro veces por encima de ese umbral desde 2010. Así funciona el truco — y por qué cada uno de sus pasos es legal.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: {
      value: '64.4%',
      label: 'peak single-bidder rate',
      label_es: 'pico de tasa de oferta única',
      sublabel: '2011 — 4.3x the OECD threshold',
      sublabel_es: '2011 — 4.3 veces el umbral OCDE',
      color: '#f59e0b',
    },
    kickerStats: [
      {
        value: '45%+',
        suffix: 'single-bid for 14 straight years',
        suffix_es: 'oferta única durante 14 años seguidos',
        tone: 'data',
      },
      {
        value: '800,000+',
        suffix: 'competitive procedures, one bidder',
        suffix_es: 'procedimientos competitivos, un oferente',
        tone: 'critical',
      },
      {
        value: '89.2%',
        suffix: 'single-bid in civilian infrastructure',
        suffix_es: 'oferta única en infraestructura civil',
        tone: 'critical',
      },
    ],
    relatedSlugs: ['marea-de-adjudicaciones', 'el-monopolio-invisible', 'captura-institucional'],
    lensTags: {
      patterns: ['P5', 'P7'],
      sectors: ['infraestructura', 'hacienda'],
      terms: ['oferta única', 'single-bid', 'vales', 'voucher'],
    },
    entities: [
      {
        type: 'vendor',
        id: 44372,
        name: 'Edenred Mexico',
        riskScore: 0.928,
        ariaTier: 1,
        role: 'Welfare-voucher monopolist · 1,679 single-bid wins',
        role_es: 'Monopolio de vales · 1,679 victorias de oferta única',
      },
      {
        type: 'vendor',
        id: 102627,
        name: 'TOKA Internacional',
        riskScore: 0.988,
        ariaTier: 1,
        role: 'Welfare-voucher monopolist · 1,290 single-bid wins',
        role_es: 'Monopolio de vales · 1,290 victorias de oferta única',
      },
      {
        type: 'vendor',
        id: 64,
        name: 'Efectivale',
        riskScore: 0.957,
        ariaTier: 1,
        role: 'Welfare-voucher monopolist · 2,210 single-bid wins',
        role_es: 'Monopolio de vales · 2,210 victorias de oferta única',
      },
    ],
    nextSteps: [
      "Request from SFP the official single-bid statistics for 2020-2025 and compare against RUBLI's independent calculation from COMPRANET microdata.",
      'Identify the 100 procedures with the highest contract values that had a single bidder in 2023 and request full bid evaluation records.',
      "File COFECE investigation reports for the top 20 vendor co-bidding pairs identified in RUBLI's ARIA queue P5 pattern.",
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
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Setup',
        title_es: 'El montaje',
        subtitle: "How the trick is supposed to look from the audience's seat",
        subtitle_es: 'Cómo debe verse el truco desde la butaca del público',
        prose: [
          'Watch the trick the way the audience is meant to. A competitive procurement procedure is, by legal design, an open invitation: any qualified vendor may submit a bid. The theory is clean. Competition drives down prices, elevates quality, and reveals the true market value of what the government is buying. The entire effect rests on one thing — multiple bidders have to walk into the room.',
          "There is an international standard for when the room looks suspiciously empty. The OECD's procurement research treats single-bid rates above 10 to 15 percent as a structural red flag warranting systematic review. The European Commission's ARACHNE risk-scoring tool — used across the EU to flag procurement fraud — treats any contract procedure with only one bidder as grounds for mandatory individual review. Hold that frame: at this point the reader still believes the tender does what the law says it does.",
          "Now pull the curtain back an inch. RUBLI's analysis of 23 years of Mexican federal procurement data, spanning 2002 to 2024, shows the promise has been failing continuously since at least 2010. Between 2010 and 2024 the annual single-bid rate — competitive procedures that received exactly one submission — ranged between 46 and 65 percent. In 2011 it peaked at 64.4 percent. In 2014 it reached 65.6 percent. In 2016, 62.5 percent. In 2023, the most recent complete year, it stood at 49.4 percent. At 49 percent, this is not an anomaly. Mexico has normalized the absence of competition as standard practice.",
          "The number that sets up the reveal is the absolute count. Across 14 years, RUBLI counts more than 800,000 competitive procedures that received a single bid. Each one satisfied Mexico's legal requirement for competitive sourcing on paper. Each was a predetermined award wrapped in procedural formality — the audience applauding a choice that was never open.",
        ],
        prose_es: [
          'Observe el truco como el público debe verlo. Un procedimiento competitivo de contratación pública es, por diseño legal, una invitación abierta: cualquier proveedor calificado puede presentar oferta. La teoría es impecable. La competencia baja precios, eleva la calidad y revela el verdadero valor de mercado de lo que el gobierno compra. Todo el efecto descansa en una sola cosa — que múltiples oferentes entren a la sala.',
          'Existe un estándar internacional para saber cuándo la sala se ve sospechosamente vacía. La investigación de la OCDE sobre contratación pública trata las tasas de oferta única por encima del 10 a 15 por ciento como una bandera roja estructural que amerita revisión sistemática. La herramienta ARACHNE de scoring de riesgo de la Comisión Europea — usada en toda la UE para marcar fraude en contratación — trata cualquier procedimiento de contrato con un solo oferente como motivo de revisión individual obligatoria. Sostenga ese encuadre: a esta altura el lector todavía cree que la licitación hace lo que la ley dice que hace.',
          'Ahora corra la cortina un centímetro. El análisis de RUBLI sobre 23 años de datos de contratación federal mexicana, de 2002 a 2024, muestra que la promesa ha estado fallando continuamente desde al menos 2010. Entre 2010 y 2024, la tasa anual de oferta única — procedimientos competitivos que recibieron exactamente una presentación — osciló entre 46 y 65 por ciento. En 2011 alcanzó un pico de 64.4 por ciento. En 2014 llegó a 65.6 por ciento. En 2016, 62.5 por ciento. En 2023, el año completo más reciente, se ubicó en 49.4 por ciento. Al 49 por ciento, esto no es una anomalía. México ha normalizado la ausencia de competencia como práctica estándar.',
          'El número que prepara la revelación es el conteo absoluto. En 14 años, RUBLI cuenta más de 800,000 procedimientos competitivos que recibieron una sola oferta. Cada uno cumplió en el papel con el requisito legal mexicano de contratación competitiva. Cada uno fue una adjudicación predeterminada envuelta en formalidad procedimental — el público aplaudiendo una elección que nunca estuvo abierta.',
        ],
        pullquote: {
          quote:
            'Fourteen years. Every year above 45 percent. In a system where "competitive" means a single bidder showed up, the word has lost its meaning.',
          quote_es:
            'Catorce años. Cada año por encima del 45 por ciento. En un sistema donde "competitivo" significa que se presentó un solo oferente, la palabra ha perdido su sentido.',
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
        title: 'The Misdirection',
        title_es: 'El distractor',
        subtitle: 'The move that was supposed to expose the trick — and instead perfected it',
        subtitle_es: 'El movimiento que iba a delatar el truco — y en cambio lo perfeccionó',
        prose: [
          'Every illusion needs a misdirection, and this one has two. Walk the curve as a timeline. The single-bid rate starts around 27 to 37 percent in the early 2000s — already above the OECD warning threshold, though the underlying data for that period is less reliable. Then comes the move the whole trick depends on. In 2010-2011 the rate jumps sharply to 51 to 64 percent, exactly when electronic bidding via CompraNet was introduced.',
          'This was the gesture sold as transparency itself. Digitization promised to open access and let the audience see behind the curtain; it should have lowered the single-bid rate. Instead it codified the pattern. From 2011 through 2018 the rate stays stubbornly in the 58 to 66 percent band across four different presidential administrations, indifferent to who held the wand.',
          "Now the second, subtler misdirection. In 2019 the rate drops to 46.5 percent, and the eye reads it as competition returning. It is not. Coinciding with the AMLO administration's initial reforms and the centralization of pharmaceutical procurement, the drop reflects contracts moving out of competitive procedures entirely, into direct adjudication, where the single-bid question never arises because no bidding is conducted. The hand is faster than the eye.",
          "The OECD's 15 percent reference line on this chart sits in a region Mexico has not visited since before CompraNet records began. Reaching it would require a fundamental restructuring of how Mexican federal procurement generates bidders: systematic market analysis before tender, competitive intelligence about potential suppliers, active outreach to qualified vendors, and tender specifications designed to maximize rather than minimize the competitive field.",
        ],
        prose_es: [
          'Toda ilusión necesita un distractor, y esta tiene dos. Recorra la curva como una línea de tiempo. La tasa de oferta única arranca alrededor de 27 a 37 por ciento a inicios de los 2000 — ya por encima del umbral de advertencia de la OCDE, aunque los datos subyacentes de ese periodo son menos confiables. Luego llega el movimiento del que depende todo el truco. En 2010-2011 la tasa salta abruptamente a 51 a 64 por ciento, justo cuando se introdujo la licitación electrónica vía CompraNet.',
          'Este fue el gesto que se vendió como la transparencia misma. La digitalización prometía ampliar el acceso y dejar al público ver detrás de la cortina; debió haber bajado la tasa de oferta única. En cambio, codificó el patrón. De 2011 a 2018 la tasa se mantiene tercamente en la banda de 58 a 66 por ciento a través de cuatro administraciones presidenciales distintas, indiferente a quién sostuviera la varita.',
          'Ahora el segundo distractor, más sutil. En 2019 la tasa cae a 46.5 por ciento, y el ojo lo lee como un retorno de la competencia. No lo es. Coincidiendo con las reformas iniciales del gobierno de AMLO y la centralización de la contratación farmacéutica, la caída refleja el movimiento de los contratos fuera de los procedimientos competitivos por completo, hacia la adjudicación directa, donde la pregunta de oferta única nunca surge porque no se conduce licitación. La mano es más rápida que el ojo.',
          'La línea de referencia OCDE del 15 por ciento en esta gráfica se ubica en una región que México no ha visitado desde antes de que comenzaran los registros de CompraNet. Llegar a ella requeriría una reestructuración fundamental de cómo la contratación federal mexicana genera oferentes: análisis sistemático de mercado antes de la licitación, inteligencia competitiva sobre proveedores potenciales, búsqueda activa de proveedores calificados, y especificaciones de licitación diseñadas para maximizar y no minimizar el campo competitivo.',
        ],
        chartConfig: {
          type: 'inline-area',
          title: 'The Curve That Never Came Down: Single-Bid Rate 2002-2024',
          title_es: 'La curva que nunca bajó: tasa de oferta única 2002-2024',
          chartId: 'single-bid-trend',
          data: {
            points: [
              {
                label: '2002',
                value: 36.1,
              },
              {
                label: '2003',
                value: 27.2,
              },
              {
                label: '2005',
                value: 28.9,
              },
              {
                label: '2007',
                value: 33.8,
              },
              {
                label: '2009',
                value: 37.4,
              },
              {
                label: '2010',
                value: 51.6,
              },
              {
                label: '2011',
                value: 64.4,
                highlight: true,
                annotation: '64%',
              },
              {
                label: '2013',
                value: 62.7,
              },
              {
                label: '2014',
                value: 65.6,
                highlight: true,
              },
              {
                label: '2016',
                value: 62.5,
              },
              {
                label: '2018',
                value: 58.5,
              },
              {
                label: '2019',
                value: 46.5,
              },
              {
                label: '2021',
                value: 46.5,
              },
              {
                label: '2023',
                value: 49.4,
              },
              {
                label: '2024',
                value: 47.8,
              },
            ],
            referenceLine: {
              value: 15,
              label: 'OECD red flag >15%',
              label_es: 'Bandera roja OCDE >15%',
              color: '#3b82f6',
            },
            unit: '%',
            maxValue: 80,
            yLabel: 'Single-bid rate (%)',
            yLabel_es: 'Tasa de oferta única (%)',
            annotation: 'Every year since 2010 is 3-4x the OECD red-flag threshold.',
            annotation_es:
              'Cada año desde 2010 supera el umbral de bandera roja OCDE entre 3 y 4 veces.',
          },
        },
        pullquote: {
          quote:
            'Electronic bidding in 2010 should have lowered the single-bid rate. It raised it. The move sold as transparency perfected the trick instead of breaking it.',
          quote_es:
            'La licitación electrónica en 2010 debió bajar la tasa de oferta única. La subió. El movimiento vendido como transparencia perfeccionó el truco en vez de romperlo.',
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
        title: 'The Reveal: Who Walks On Stage',
        title_es: 'La revelación: quién sale a escena',
        subtitle: "Name the only bidder who keeps winning the 'competitive' tenders",
        subtitle_es: "Nombrar al único oferente que sigue ganando las licitaciones 'competitivas'",
        prose: [
          'Pull the curtain fully back and name the performers. RUBLI ranked every vendor in the federal database by the number of "competitive" procedures won as a single bidder, and the top of the list is a coherent industry cluster: welfare-program voucher operators. EDENRED MEXICO, S.A. DE C.V. tops the ranking with 1,679 single-bid wins worth 23.78 billion pesos. TOKA INTERNACIONAL — already named in The Era of Risk as the dominant AMLO-era food-voucher vendor — sits at 1,290 wins and 36.99 billion pesos. EFECTIVALE collectively wins 2,210 procedures across two related corporate identities.',
          'Here is how the trick is done. The voucher operators (Edenred, TOKA, Efectivale, Sodexo) have built incompatible payment networks. Once a federal program adopts one of them, switching costs effectively bar competitors from the next tender, so the procedure runs as competitive on paper while the incumbent is the only bidder who can make the transition work. The room is open; only one performer can enter it.',
          'The same dynamic runs in adjacent markets with different mechanics. Industrial gas (PRAXAIR, INFRA — note INFRA is a structural false-positive, since industrial gas to hospitals genuinely has limited suppliers). Telecommunications (TELÉFONOS DE MÉXICO at 459 wins). Postal logistics (Servicio Postal Mexicano, Estafeta). Specific medical supply categories (Productos Hospitalarios with 511 wins). Each is a market where customer-vendor relationships have hardened into structural single-source procurement.',
          'Then the scale, which is the editorial payoff. The combined single-bid universe is 504,903 contracts and 5.4 trillion pesos across 23 years — more than three times the entire AMLO-era federal procurement spend, awarded under nominally competitive procedures that had no competition at all. The average risk score in this universe is 0.28, well below the high-risk threshold, because the model recognizes that not every single-bid contract is fraudulent. The point is not that each one is fraud. The point is that this is the standard operating mode of Mexican federal procurement.',
        ],
        prose_es: [
          'Corra la cortina por completo y nombre a los intérpretes. RUBLI clasificó a cada proveedor en la base federal por la cantidad de procedimientos "competitivos" que han ganado como único oferente, y la parte alta de la lista es un bloque industrial coherente: operadores de vales de programas sociales. EDENRED MEXICO, S.A. DE C.V. encabeza con 1,679 victorias de oferta única por 23.78 mil millones de pesos. TOKA INTERNACIONAL — ya nombrada en El Sexenio del Riesgo como el proveedor dominante de vales de comida del periodo AMLO — se ubica con 1,290 victorias y 36.99 mil millones de pesos. EFECTIVALE gana colectivamente 2,210 procedimientos a través de dos identidades corporativas relacionadas.',
          'Así se hace el truco. Los operadores de vales (Edenred, TOKA, Efectivale, Sodexo) han construido redes de pago incompatibles. Una vez que un programa federal adopta a uno de ellos, los costos de cambio efectivamente excluyen a los competidores de la siguiente licitación, así que el procedimiento corre como competitivo en el papel mientras el proveedor existente es el único oferente que puede hacer que la transición funcione. La sala está abierta; solo un intérprete puede entrar a ella.',
          'La misma dinámica corre en mercados adyacentes con mecánica distinta. Gas industrial (PRAXAIR, INFRA — nótese que INFRA es un falso positivo estructural, ya que el suministro de gas industrial a hospitales genuinamente tiene proveedores limitados). Telecomunicaciones (TELÉFONOS DE MÉXICO con 459 victorias). Logística postal (Servicio Postal Mexicano, Estafeta). Categorías específicas de insumo médico (Productos Hospitalarios con 511 victorias). Cada uno es un mercado donde las relaciones cliente-proveedor se han endurecido hasta volverse contratación estructural de única fuente.',
          'Luego la escala, que es el desenlace editorial. El universo combinado de oferta única es de 504,903 contratos y 5.4 billones de pesos en 23 años — más de tres veces el gasto federal completo de la era AMLO, adjudicado bajo procedimientos nominalmente competitivos que no tuvieron competencia alguna. La calificación de riesgo promedio en este universo es 0.28, muy por debajo del umbral de alto riesgo, porque el modelo reconoce que no todo contrato de oferta única es fraudulento. El punto no es que cada uno sea fraude. El punto es que este es el modo de operación estándar de la contratación federal mexicana.',
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'The Only Bidders: Top 12 Vendors by Single-Bid Wins',
          title_es: 'Los únicos oferentes: top 12 proveedores por victorias en oferta única',
          chartId: 'sb-top-vendors',
          data: {
            points: [
              {
                label: 'Edenred México',
                value: 1679,
                value2: 2898,
                color: '#dc2626',
                highlight: true,
                annotation: '58% single-bid · vouchers',
                annotation_es: '58% oferta única · vales',
              },
              {
                label: 'INFRA',
                value: 1423,
                value2: 4283,
                color: '#a06820',
                annotation: '33% single-bid · gas (FP)',
                annotation_es: '33% oferta única · gas (FP)',
              },
              {
                label: 'TOKA Internacional',
                value: 1290,
                value2: 1944,
                color: '#dc2626',
                highlight: true,
                annotation: '66% single-bid · vouchers',
                annotation_es: '66% oferta única · vales',
              },
              {
                label: 'Efectivale (RL)',
                value: 1155,
                value2: 2539,
                color: '#dc2626',
                highlight: true,
                annotation: '45% single-bid · vouchers',
                annotation_es: '45% oferta única · vales',
              },
              {
                label: 'Efectivale (S.A.)',
                value: 1055,
                value2: 1150,
                color: '#dc2626',
                highlight: true,
                annotation: '92% single-bid · vouchers',
                annotation_es: '92% oferta única · vales',
              },
              {
                label: 'Seg. Alim. Mex (Segalmex)',
                value: 1014,
                value2: 1541,
                color: '#dc2626',
                highlight: true,
                annotation: '66% single-bid · risk 0.94',
                annotation_es: '66% oferta única · riesgo 0.94',
              },
              {
                label: 'Liconsa',
                value: 998,
                value2: 5858,
                color: '#a06820',
                annotation: '17% single-bid · gov-owned',
                annotation_es: '17% oferta única · paraestatal',
              },
              {
                label: 'Sodexo',
                value: 658,
                value2: 1203,
                color: '#dc2626',
                highlight: true,
                annotation: '55% single-bid · vouchers',
                annotation_es: '55% oferta única · vales',
              },
              {
                label: 'PRAXAIR México',
                value: 585,
                value2: 2794,
                color: '#a06820',
                annotation: '21% single-bid · gas',
                annotation_es: '21% oferta única · gas',
              },
              {
                label: 'Servicio Postal',
                value: 551,
                value2: 878,
                color: '#a06820',
                annotation: '63% single-bid · gov-owned',
                annotation_es: '63% oferta única · paraestatal',
              },
              {
                label: 'Productos Hospitalarios',
                value: 511,
                value2: 1596,
                color: '#a06820',
                annotation: '32% single-bid · medical supply',
                annotation_es: '32% oferta única · insumos médicos',
              },
              {
                label: 'Estafeta Mexicana',
                value: 475,
                value2: 1342,
                color: '#a06820',
                annotation: '35% single-bid · logistics',
                annotation_es: '35% oferta única · logística',
              },
            ],
            yLabel: 'Contract wins',
            yLabel_es: 'Victorias de contrato',
            unit: 'wins',
            gapFormat: 'ratio',
            annotation:
              'Filled dot = single-bid wins (vendor was the only bidder). Open dot = total contract wins of any kind. The ratio shows what fraction of every contract this vendor secured came as the only "competitive" bidder — Efectivale S.A. is structurally captive at 92%; Liconsa and PRAXAIR run diversified books at 17–21%.',
            annotation_es:
              'Punto relleno = victorias de oferta única (único oferente). Punto abierto = victorias totales de contrato de cualquier tipo. La razón muestra qué fracción de los contratos que ganó este proveedor llegó como único oferente "competitivo" — Efectivale S.A. es estructuralmente cautivo al 92%; Liconsa y PRAXAIR operan carteras diversificadas al 17–21%.',
          },
        },
        pullquote: {
          quote:
            'Six related vendors. 6,851 "competitive" procurement procedures won as the only bidder. 91.7 billion pesos. The welfare-voucher market is structurally non-competitive.',
          quote_es:
            'Seis proveedores relacionados. 6,851 procedimientos de contratación "competitivos" ganados como único oferente. 91.7 mil millones de pesos. El mercado de vales del bienestar es estructuralmente no competitivo.',
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
        title: 'The Reveal: Where the Trick Runs',
        title_es: 'La revelación: dónde se monta el truco',
        subtitle: 'Civilian infrastructure stages the illusion at 89%',
        subtitle_es: 'La infraestructura civil monta la ilusión al 89%',
        prose: [
          'Move from who to where. The headline national rate of 47 to 49 percent in recent years is a blend across 12 sectors with very different competitive dynamics, and the variation is the story. Puncture the average and the trick reveals where it is staged most aggressively.',
          'Civilian infrastructure runs it hardest: 89.2 percent of "competitive" infraestructura procedures are won by a single bidder. Out of 189,855 competitive infrastructure tenders, 169,434 had only one bid. Roads, water systems, drainage, urban works are not specialized equipment with single suppliers; they are markets with hundreds of qualified Mexican construction firms. 89.2 percent is not market scarcity. It is market allocation.',
          'Run down the rest of the distribution in order: Medio Ambiente at 82.3 percent (52,559 of 63,885), Trabajo at 74.9 percent (11,818 of 15,784), Otros at 70.7 percent (3,570 of 5,052), Hacienda at 59.0 percent (20,454 of 34,659, the voucher cluster pulling it up), Energía at 56.7 percent (76,028 of 134,052, Pemex/CFE specialty equipment with genuinely thin supplier markets), Tecnología at 49.1 percent (3,700 of 7,535), Gobernación at 48.2 percent (30,390 of 63,014), Agricultura at 47.5 percent (15,429 of 32,449), Educación at 44.1 percent (38,143 of 86,456). At the low end, Defensa at 22.8 percent (7,511 of 32,923) and Salud at just 19.3 percent (75,867 of 394,009).',
          'The structural tell separating the two ends is buyer concentration. Where procurement concentrates in a few large institutional buyers (IMSS, SEDENA), single-bid rates stay low because aggregated tenders force competition. Where it fragments across many small units (state infrastructure, rural water systems, federal districts), each unit runs on its own established vendor relationships and the rate climbs.',
          'Infrastructure at 89.2 percent — six times the OECD red-flag threshold — is the most consequential finding because the COVID-era stimulus, the AMLO-era national projects, and the post-Sheinbaum decentralized water and roads programs all flow through it. Across more than a decade of stimulus and megaprojects, the vast majority of "competitively" awarded contracts had no competition at all.',
        ],
        prose_es: [
          'Pase de quién a dónde. La tasa nacional de 47 a 49 por ciento en años recientes es un promedio a través de 12 sectores con dinámicas competitivas muy distintas, y la variación es la historia. Perfore el promedio y el truco revela dónde se monta con más agresividad.',
          'La infraestructura civil lo corre con más fuerza: 89.2 por ciento de los procedimientos "competitivos" de infraestructura son ganados por un solo oferente. De 189,855 licitaciones competitivas de infraestructura, 169,434 tuvieron una sola oferta. Carreteras, sistemas de agua, drenaje, obra urbana no son equipos especializados con suministradores únicos; son mercados con cientos de constructoras mexicanas calificadas. El 89.2 por ciento no es escasez de mercado. Es asignación de mercado.',
          'Recorra el resto de la distribución en orden: Medio Ambiente con 82.3 por ciento (52,559 de 63,885), Trabajo con 74.9 por ciento (11,818 de 15,784), Otros con 70.7 por ciento (3,570 de 5,052), Hacienda con 59.0 por ciento (20,454 de 34,659, el cluster de vales jalándola hacia arriba), Energía con 56.7 por ciento (76,028 de 134,052, equipo especializado de Pemex/CFE con mercados de suministradores genuinamente delgados), Tecnología con 49.1 por ciento (3,700 de 7,535), Gobernación con 48.2 por ciento (30,390 de 63,014), Agricultura con 47.5 por ciento (15,429 de 32,449), Educación con 44.1 por ciento (38,143 de 86,456). En el extremo bajo, Defensa con 22.8 por ciento (7,511 de 32,923) y Salud con apenas 19.3 por ciento (75,867 de 394,009).',
          'La señal estructural que separa los dos extremos es la concentración de compradores. Donde la contratación se concentra en unos pocos grandes compradores institucionales (IMSS, SEDENA), las tasas de oferta única se mantienen bajas porque las licitaciones agregadas fuerzan la competencia. Donde se fragmenta entre muchas unidades pequeñas (infraestructura estatal, sistemas de agua rurales, distritos federales), cada unidad opera con sus propias relaciones de proveedor establecidas y la tasa trepa.',
          'Infraestructura al 89.2 por ciento — seis veces el umbral de bandera roja OCDE — es el hallazgo más consecuente porque el estímulo de la era COVID, los proyectos nacionales del periodo AMLO y los programas descentralizados de agua y carreteras pos-Sheinbaum todos fluyen por ella. A lo largo de más de una década de estímulo y grandes proyectos, la gran mayoría de los contratos adjudicados "competitivamente" no tuvieron competencia alguna.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'Where the Illusion Is Staged: Single-Bid Rate by Sector',
          title_es: 'Dónde se monta la ilusión: tasa de oferta única por sector',
          chartId: 'sb-by-sector',
          data: {
            points: [
              {
                label: 'Infraestructura',
                value: 89.2,
                color: '#dc2626',
                highlight: true,
                annotation: '169,434 of 189,855',
                annotation_es: '169,434 de 189,855',
              },
              {
                label: 'Medio Ambiente',
                value: 82.3,
                color: '#dc2626',
                highlight: true,
                annotation: '52,559 of 63,885',
                annotation_es: '52,559 de 63,885',
              },
              {
                label: 'Trabajo',
                value: 74.9,
                color: '#a06820',
                annotation: '11,818 of 15,784',
                annotation_es: '11,818 de 15,784',
              },
              {
                label: 'Otros',
                value: 70.7,
                color: '#a06820',
                annotation: '3,570 of 5,052',
                annotation_es: '3,570 de 5,052',
              },
              {
                label: 'Hacienda',
                value: 59,
                color: '#a06820',
                annotation: '20,454 of 34,659',
                annotation_es: '20,454 de 34,659',
              },
              {
                label: 'Energía',
                value: 56.7,
                color: '#a06820',
                annotation: '76,028 of 134,052',
                annotation_es: '76,028 de 134,052',
              },
              {
                label: 'Tecnología',
                value: 49.1,
                color: '#a06820',
                annotation: '3,700 of 7,535',
                annotation_es: '3,700 de 7,535',
              },
              {
                label: 'Gobernación',
                value: 48.2,
                color: '#a06820',
                annotation: '30,390 of 63,014',
                annotation_es: '30,390 de 63,014',
              },
              {
                label: 'Agricultura',
                value: 47.5,
                color: '#a06820',
                annotation: '15,429 of 32,449',
                annotation_es: '15,429 de 32,449',
              },
              {
                label: 'Educación',
                value: 44.1,
                color: '#a06820',
                annotation: '38,143 of 86,456',
                annotation_es: '38,143 de 86,456',
              },
              {
                label: 'Defensa',
                value: 22.8,
                color: '#1e3a5f',
                annotation: '7,511 of 32,923',
                annotation_es: '7,511 de 32,923',
              },
              {
                label: 'Salud',
                value: 19.3,
                color: '#1e3a5f',
                annotation: '75,867 of 394,009',
                annotation_es: '75,867 de 394,009',
              },
            ],
            referenceLine: {
              value: 15,
              label: 'OECD red flag >15%',
              label_es: 'Bandera roja OCDE >15%',
              color: '#3b82f6',
            },
            unit: '%',
            maxValue: 100,
            yLabel: 'Single-bid share of competitive procedures',
            yLabel_es: 'Tasa de oferta única en procedimientos competitivos',
            annotation:
              'Civilian infrastructure at 89.2 percent is six times the OECD red-flag threshold. Salud and Defensa stay low (~20%) because aggregated institutional buyers (IMSS, SEDENA) force competition through bigger tenders.',
            annotation_es:
              'La infraestructura civil al 89.2 por ciento es seis veces el umbral de bandera roja OCDE. Salud y Defensa se mantienen bajos (~20%) porque los compradores institucionales agregados (IMSS, SEDENA) fuerzan la competencia mediante licitaciones más grandes.',
          },
        },
        pullquote: {
          quote:
            'Civilian infrastructure runs at 89 percent single-bid. Out of every ten "competitive" tenders for roads, water, drainage, and urban works, nine arrive with only one bidder.',
          quote_es:
            'La infraestructura civil opera al 89 por ciento de oferta única. De cada diez licitaciones "competitivas" para carreteras, agua, drenaje y obra urbana, nueve llegan con un solo oferente.',
          stat: '6 of 12',
          statLabel: 'sectors above 50% single-bid · all twelve above the OECD 15% threshold',
          statLabel_es:
            'sectores arriba del 50% oferta única · los doce arriba del umbral OCDE 15%',
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
        title: 'The Trick Nobody Can Stop',
        title_es: 'El truco que nadie puede detener',
        subtitle: 'Why an illusion this large runs in plain sight, year after year',
        subtitle_es: 'Por qué una ilusión de este tamaño corre a la vista de todos, año tras año',
        prose: [
          'The closing answer is the one that makes the trick unstoppable: it is legal at every single step. Nobody in the procurement process is explicitly breaking the rules when only one bidder shows up. The procuring official ran the tender. The bidder submitted a bid. The award followed procedure. Each individual action is defensible. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.',
          "That is precisely what defeats every accountability institution. ASF audits individual contracts; it does not produce systemic findings about aggregated bidding patterns. SFP investigates individual officials; it does not investigate industry-wide cartels. COFECE investigates anticompetitive conduct but limits its public-procurement cases to clear-cut cartel documentation, not behavioral pattern evidence. The system-level structural failure RUBLI's data shows has no institution of accountability.",
          'The single-bid rate is not a secret. Transparencia Mexicana and IMCO have reported on it for years. What is absent is institutional follow-through: naming the specific vendor clusters in the P5 pattern, requesting their financial records, prosecuting documented cases of cover bidding, and establishing deterrent consequences for officials who knowingly accept single-bid outcomes as normal. Closing the gap requires either a new institutional capacity focused on structural procurement patterns, or the redirection of existing COFECE and SFP resources toward the analysis RUBLI performs. Neither has happened.',
          'Until those consequences exist, reform means procedural adjustment rather than structural change, and the curve returns to where this began. The single-bid rate will keep sitting three to four times above the OECD threshold, year after year — the same illusion, performed for an audience that already knows how it is done.',
        ],
        prose_es: [
          'La respuesta de cierre es la que vuelve imparable al truco: es legal en cada uno de sus pasos. Nadie en el proceso de contratación rompe explícitamente las reglas cuando solo se presenta un oferente. El funcionario contratante corrió la licitación. El oferente presentó una oferta. La adjudicación se hizo conforme al procedimiento. Cada acción individual es defendible. La corrupción reside en el patrón a lo largo de 800,000 procedimientos, no en una sola transacción.',
          'Eso es precisamente lo que derrota a cada institución de fiscalización. La ASF audita contratos individuales; no produce hallazgos sistémicos sobre patrones agregados de licitación. La SFP investiga a funcionarios individuales; no investiga cárteles a escala industrial. La COFECE investiga conducta anticompetitiva pero limita sus casos de contratación pública a documentación clara de cártel, no a evidencia conductual por patrón. La falla estructural a nivel de sistema que muestran los datos de RUBLI no tiene institución de rendición de cuentas.',
          'La tasa de oferta única no es un secreto. Transparencia Mexicana e IMCO la han reportado durante años. Lo que está ausente es el seguimiento institucional: nombrar los clusters específicos de proveedores en el patrón P5, solicitar sus registros financieros, procesar casos documentados de oferta de cobertura, y establecer consecuencias disuasorias para los funcionarios que aceptan a sabiendas los resultados de oferta única como normales. Cerrar la brecha requiere o una nueva capacidad institucional enfocada en patrones estructurales de contratación, o la redirección de recursos existentes de la COFECE y la SFP hacia el análisis que RUBLI realiza. Ninguna ha ocurrido.',
          'Hasta que esas consecuencias existan, la reforma significa ajuste procedimental en vez de cambio estructural, y la curva regresa a donde empezó esto. La tasa de oferta única seguirá ubicada de tres a cuatro veces por encima del umbral OCDE, año tras año — la misma ilusión, representada para un público que ya sabe cómo se hace.',
        ],
        pullquote: {
          quote:
            'Nobody is individually breaking the rules. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.',
          quote_es:
            'Nadie rompe individualmente las reglas. La corrupción reside en el patrón a lo largo de 800,000 procedimientos, no en una sola transacción.',
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
  },

  // === STORY 5: The Building That Capture Built ===
  {
    slug: 'captura-institucional',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Building That Capture Built',
    headline_es: 'El edificio que construyó la captura',
    subheadline:
      "RUBLI's P6 algorithm flagged 15,923 vendors showing signs of institutional capture — and at one address, IMSS, the pattern runs through 401.8 billion pesos and 392,579 contracts. Walk the building floor by floor: the seven largest institutions move 1.06 trillion pesos through capture-pattern relationships, and beneath them P3 intermediary chains carry another 526 billion.",
    subheadline_es:
      'El algoritmo P6 de RUBLI marcó a 15,923 proveedores con signos de captura institucional — y en una sola dirección, el IMSS, el patrón corre por 401.8 mil millones de pesos y 392,579 contratos. Recorra el edificio piso por piso: las siete instituciones más grandes mueven 1.06 billones de pesos por relaciones con patrón de captura, y debajo de ellas las cadenas de intermediarios P3 cargan otros 526 mil millones.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 15,
    status: 'auditado',
    leadStat: {
      value: '15,923',
      label: 'P6 capture-pattern vendors',
      label_es: 'proveedores con patrón de captura P6',
      sublabel: '526.8B MXN in P3 intermediary chains beneath them',
      sublabel_es: '526.8 mil millones en cadenas de intermediarios P3 debajo',
      color: '#8b5cf6',
    },
    kickerStats: [
      {
        value: '401.8B',
        suffix: 'MXN in P6-pattern contracting at IMSS alone',
        suffix_es: 'MXN en contratación con patrón P6 solo en el IMSS',
        tone: 'data',
      },
      {
        value: '1.06T',
        suffix: 'MXN across the top seven institutions',
        suffix_es: 'MXN en las siete principales instituciones',
        tone: 'critical',
      },
      {
        value: '18,897',
        suffix: 'P3 + P6 vendors awaiting pattern-based investigation',
        suffix_es: 'proveedores P3 + P6 a la espera de investigación por patrón',
        tone: 'critical',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Lobby',
        title_es: 'El vestíbulo',
        subtitle: 'What capture looks like once you are inside the building',
        subtitle_es: 'Cómo se ve la captura una vez que se está dentro del edificio',
        prose: [
          'Start at one address. The Instituto Mexicano del Seguro Social is the single worst case in the dataset: 3,415 vendors that RUBLI flags for capture-pattern behavior, 401.8 billion pesos of contracting, 392,579 individual contracts. Walk in the front door and the first thing to understand is what capture is — not as a category, but as a thing you can stand inside.',
          'Institutional capture is not a one-time bribe. It is a relationship that has become load-bearing. A vendor embeds into an institution\'s procurement workflows so thoroughly that alternatives become invisible or impractical. Officials stop looking for competitors because the "reliable" vendor always delivers. Prices drift upward because there is no pressure to compete. The relationship self-reinforces until, over years, it is indistinguishable from policy. Remove it and something in the structure has to be re-engineered.',
          "RUBLI's Pattern 6 algorithm is the instrument that reads the building. P6 detects capture signatures by measuring how concentrated a vendor's contracts are at a single institution, how that concentration evolves over time, and whether the institution has stopped awarding to competitors in the relevant category. It is RUBLI's largest pattern — 15,923 vendors, the broadest category of structural procurement risk in the entire dataset. To be clear about what that means: P6 is a risk indicator of behavior consistent with capture. It flags a relationship; it does not prove a crime.",
          'There is an inspector\'s report on this address. The Auditoría Superior de la Federación\'s 2022 Cuenta Pública audit found IMSS pharmaceutical procurement showed "patterns of concentration inconsistent with market competition" in 15 specific categories. RUBLI quantifies at scale what the auditor flagged at the door. The rest of this piece walks the building the inspection only glimpsed.',
        ],
        prose_es: [
          'Comience por una dirección. El Instituto Mexicano del Seguro Social es el peor caso individual en el dataset: 3,415 proveedores que RUBLI marca por comportamiento con patrón de captura, 401.8 mil millones de pesos de contratación, 392,579 contratos individuales. Cruce la puerta principal y lo primero que hay que entender es qué es la captura — no como categoría, sino como algo dentro de lo cual uno puede pararse.',
          'La captura institucional no es un soborno único. Es una relación que se ha vuelto estructural, portante. Un proveedor se incrusta en los flujos de trabajo de adquisiciones de una institución de manera tan completa que las alternativas se vuelven invisibles o impracticables. Los funcionarios dejan de buscar competidores porque el proveedor "confiable" siempre entrega. Los precios suben lentamente porque no hay presión para competir. La relación se auto-refuerza hasta que, con los años, se vuelve indistinguible de una política. Retírela y algo en la estructura tiene que rediseñarse.',
          'El algoritmo del Patrón 6 de RUBLI es el instrumento que lee el edificio. P6 detecta firmas de captura midiendo qué tan concentrados están los contratos de un proveedor en una sola institución, cómo evoluciona esa concentración a lo largo del tiempo, y si la institución ha dejado de adjudicar a competidores en la categoría relevante. Es el patrón más grande de RUBLI — 15,923 proveedores, la categoría más amplia de riesgo estructural en la contratación pública en todo el dataset. Para ser claros sobre lo que eso significa: P6 es un indicador de riesgo de comportamiento consistente con la captura. Marca una relación; no prueba un delito.',
          'Hay un informe de inspector sobre esta dirección. La auditoría de la Cuenta Pública 2022 de la Auditoría Superior de la Federación encontró que la contratación farmacéutica del IMSS mostraba "patrones de concentración inconsistentes con la competencia de mercado" en 15 categorías específicas. RUBLI cuantifica a escala lo que el auditor marcó en la puerta. El resto de este texto recorre el edificio que la inspección apenas alcanzó a ver.',
        ],
        pullquote: {
          quote:
            'Capture is not a one-time bribe. It is a relationship that has become load-bearing — embedded so deeply that alternatives become invisible. At one address, IMSS, it runs through 401.8 billion pesos.',
          quote_es:
            'La captura no es un soborno único. Es una relación que se ha vuelto portante — incrustada tan profundo que las alternativas se vuelven invisibles. En una dirección, el IMSS, corre por 401.8 mil millones de pesos.',
          stat: '401.8B MXN',
          statLabel: 'P6 capture-pattern contracting at IMSS alone',
          statLabel_es: 'contratación con patrón de captura P6 solo en el IMSS',
        },
        sources: [
          'RUBLI ARIA P6 and P3 pattern analysis, run ID 28d5c453, March 25 2026.',
          'IMSS. (2024). Informe al Ejecutivo Federal y al Congreso de la Unión.',
          'ASF. (2022). Auditoría de Desempeño 2022-6-06G00-07-0024. Adquisición de Medicamentos, IMSS.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Floor Plan',
        title_es: 'El plano del edificio',
        subtitle: 'IMSS is one floor of a much taller tower',
        subtitle_es: 'El IMSS es solo un piso de una torre mucho más alta',
        prose: [
          'Step back from the IMSS lobby and the whole building comes into view: seven of the highest-value institutions in the federal apparatus, their corridors all running the same way. Before walking the floors, understand how capture is built, because it is rarely there from the start. Vendors classified P6 typically begin as legitimate competitive winners. Year one shows normal competitive behavior. By year three, direct-award frequency is rising. By year five, the vendor takes 70 to 90 percent of the relevant category via direct adjudication at the same institution.',
          'That graduation from legitimate to captured is exactly why traditional audits miss it. Each individual contract is defensible — the vendor has a track record, the official can cite past performance, and the administrative cost of running a fresh competitive process is real. The corruption is not in any single contract. It lives in the pattern across hundreds of contracts over years.',
          'Now walk the floors. IMSS sits at the top: 401.8 billion pesos, 3,415 vendors, 392,579 contracts. Below it, CFE moves 240.7 billion across 2,600 vendors and 112,000 contracts. PEMEX moves 199.8 billion through just 284 vendors — the smallest cohort in the building but the largest average ticket. Then SCT/SICT (71.6 billion, 412 vendors, 8,965 contracts), DICONSA (70.0 billion, 495 vendors, 236,000 contracts), ISSSTE (50.1 billion, 841 vendors, 33,636 contracts), and CONAGUA (28.2 billion, 281 vendors, 5,988 contracts).',
          'Read the architecture. Health institutions — IMSS and ISSSTE — account for 451.9 billion pesos. Energy — CFE and PEMEX — accounts for 440.5 billion. The seven floors sum to 1.06 trillion pesos: federal spending routed through vendor relationships whose behavioral fingerprints indicate capture, roughly twelve percent of an entire annual federal budget. IMSS, the worst single address, is one floor of this tower.',
        ],
        prose_es: [
          'Aléjese del vestíbulo del IMSS y el edificio entero entra en cuadro: siete de las instituciones de mayor valor del aparato federal, con sus pasillos corriendo todos en la misma dirección. Antes de recorrer los pisos, hay que entender cómo se construye la captura, porque rara vez está ahí desde el principio. Los proveedores clasificados como P6 típicamente comienzan como ganadores competitivos legítimos. El año uno muestra comportamiento competitivo normal. Para el año tres, la frecuencia de adjudicación directa va al alza. Para el año cinco, el proveedor recibe entre 70 y 90 por ciento de la categoría relevante por adjudicación directa en la misma institución.',
          'Esa graduación de legítimo a capturado es precisamente lo que hace que las auditorías tradicionales la pasen por alto. Cada contrato individual es defendible — el proveedor tiene historial, el funcionario puede invocar el desempeño pasado, y la carga administrativa de correr un nuevo proceso competitivo es real. La corrupción no está en ningún contrato individual. Vive en el patrón a lo largo de cientos de contratos durante años.',
          'Ahora recorra los pisos. El IMSS está en la cima: 401.8 mil millones de pesos, 3,415 proveedores, 392,579 contratos. Debajo, la CFE mueve 240.7 mil millones en 2,600 proveedores y 112,000 contratos. PEMEX mueve 199.8 mil millones por apenas 284 proveedores — la cohorte más pequeña del edificio pero con el ticket promedio más grande. Luego SCT/SICT (71.6 mil millones, 412 proveedores, 8,965 contratos), DICONSA (70.0 mil millones, 495 proveedores, 236,000 contratos), el ISSSTE (50.1 mil millones, 841 proveedores, 33,636 contratos) y la CONAGUA (28.2 mil millones, 281 proveedores, 5,988 contratos).',
          'Lea la arquitectura. Las instituciones de salud — IMSS e ISSSTE — suman 451.9 mil millones de pesos. Energía — CFE y PEMEX — suma 440.5 mil millones. Los siete pisos suman 1.06 billones de pesos: gasto federal canalizado por relaciones de proveedor cuyas huellas conductuales indican captura, aproximadamente doce por ciento de un presupuesto federal anual completo. El IMSS, la peor dirección individual, es solo un piso de esta torre.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'The Tower: Top 7 Institutions by P6 Capture-Pattern Contracting',
          title_es: 'La torre: top 7 instituciones por contratación con patrón de captura P6',
          chartId: 'p6-by-institution',
          data: {
            points: [
              {
                label: 'IMSS',
                value: 401.8,
                color: '#dc2626',
                highlight: true,
                annotation: '3,415 vendors · 392K contracts',
                annotation_es: '3,415 proveedores · 392K contratos',
              },
              {
                label: 'CFE',
                value: 240.7,
                color: '#eab308',
                annotation: '2,600 vendors · 112K contracts',
                annotation_es: '2,600 proveedores · 112K contratos',
              },
              {
                label: 'PEMEX',
                value: 199.8,
                color: '#eab308',
                annotation: '284 vendors · 7,169 contracts',
                annotation_es: '284 proveedores · 7,169 contratos',
              },
              {
                label: 'SCT',
                value: 71.6,
                color: '#ea580c',
                annotation: '412 vendors · 8,965 contracts',
                annotation_es: '412 proveedores · 8,965 contratos',
              },
              {
                label: 'DICONSA',
                value: 70,
                color: '#64748b',
                annotation: '495 vendors · 236K contracts',
                annotation_es: '495 proveedores · 236K contratos',
              },
              {
                label: 'ISSSTE',
                value: 50.1,
                color: '#dc2626',
                highlight: true,
                annotation: '841 vendors · 33,636 contracts',
                annotation_es: '841 proveedores · 33,636 contratos',
              },
              {
                label: 'CONAGUA',
                value: 28.2,
                color: '#64748b',
                annotation: '281 vendors · 5,988 contracts',
                annotation_es: '281 proveedores · 5,988 contratos',
              },
            ],
            unit: 'B MXN',
            annotation:
              "Each bar shows the total value of P6-pattern contracting where the listed institution is the vendor's primary buyer. Health institutions (IMSS, ISSSTE — red highlight) account for 451.9B MXN; energy (CFE, PEMEX) accounts for 440.5B MXN. The seven institutions sum to 1.06 trillion pesos.",
            annotation_es:
              'Cada barra muestra el valor total de contratación con patrón P6 donde la institución listada es el comprador principal del proveedor. Las instituciones de salud (IMSS, ISSSTE — resaltadas en rojo) suman 451.9 mil millones; energía (CFE, PEMEX) suma 440.5 mil millones. Las siete instituciones suman 1.06 billones de pesos.',
          },
        },
        pullquote: {
          quote:
            'Each individual contract appears defensible. The corruption is in the pattern across hundreds of contracts, across years, across entire institutions.',
          quote_es:
            'Cada contrato individual parece defendible. La corrupción está en el patrón a lo largo de cientos de contratos, a lo largo de años, a lo largo de instituciones enteras.',
          stat: '1.06T MXN',
          statLabel: 'P6 contracting at the top seven Mexican federal institutions',
          statLabel_es:
            'contratación P6 en las siete principales instituciones federales mexicanas',
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
        id: 'ch3',
        number: 3,
        title: 'The Sub-Contract Floors',
        title_es: 'Los pisos de subcontratación',
        subtitle: 'The toll booths beneath the procurement levels',
        subtitle_es: 'Las casetas de cobro debajo de los pisos de contratación',
        prose: [
          "Go down a level. Beneath the procurement floors sit the intermediary floors, where a vendor wins a contract and subcontracts the actual work, taking a fee at each tier. RUBLI's Pattern 3 reads these. P3 is at once a capture mechanism and a fraud mechanism: a vendor captures the institutional relationship, then monetizes it as a toll-road between the government budget and the real suppliers. RUBLI identifies 2,974 P3 vendors, concentrated overwhelmingly in infrastructure (179.5 billion pesos, 1,128 vendors), energy (130.6 billion pesos, 463 vendors), and health (104.2 billion pesos, 476 vendors).",
          'These three floors are the deepest for a reason: they are the sectors with the largest contracts, the thinnest oversight, and the most technical cover. Specialized complexity is real here, and that legitimate complexity provides cover for fraudulent structures. In infrastructure the intermediary wins the contract, then subcontracts civil works to actual construction firms, keeping 15 to 30 percent overhead — a highway uses dozens of trades, so the layering looks routine. In energy the intermediary supplies equipment sourced from international manufacturers, marking up prices across the chain. In health the intermediary distributes medications from a small number of actual pharmaceutical manufacturers, collecting margins at each link.',
          "Hacienda (40.9 billion pesos), education (19.1 billion), agriculture (18.8 billion), gobernación (17.8 billion), and defense (15.9 billion) round out the eight floors, each with tens of billions in P3-pattern contracting. But raw value understates how distorted the deepest floors are. Measured as a share of each sector's high-risk spend, infrastructure routes 19.6 percent of its at-risk footprint through P3 intermediaries — roughly three times the share seen in health (6.0 percent) or Hacienda (6.5 percent). The chart sorts on that ratio, so the most distorted floor reads at the top.",
        ],
        prose_es: [
          'Baje un nivel. Debajo de los pisos de contratación están los pisos de intermediación, donde un proveedor gana un contrato y subcontrata el trabajo real, cobrando una comisión en cada nivel. El Patrón 3 de RUBLI los lee. P3 es a la vez un mecanismo de captura y un mecanismo de fraude: un proveedor captura la relación institucional, luego la monetiza como una caseta de cobro entre el presupuesto del gobierno y los proveedores reales. RUBLI identifica 2,974 proveedores P3, concentrados abrumadoramente en infraestructura (179.5 mil millones de pesos, 1,128 proveedores), energía (130.6 mil millones de pesos, 463 proveedores) y salud (104.2 mil millones de pesos, 476 proveedores).',
          'Estos tres pisos son los más profundos por una razón: son los sectores con los contratos más grandes, la fiscalización más delgada y la mayor cobertura técnica. La complejidad especializada aquí es real, y esa complejidad legítima provee cobertura para estructuras fraudulentas. En infraestructura el intermediario gana el contrato, luego subcontrata la obra civil a constructoras reales, quedándose con 15 a 30 por ciento de sobrecarga — una carretera usa decenas de oficios, así que la estratificación parece rutinaria. En energía el intermediario suministra equipo proveniente de fabricantes internacionales, marcando los precios a lo largo de la cadena. En salud el intermediario distribuye medicamentos de un pequeño número de fabricantes farmacéuticos reales, cobrando márgenes en cada eslabón.',
          'Hacienda (40.9 mil millones de pesos), educación (19.1 mil millones), agricultura (18.8 mil millones), gobernación (17.8 mil millones) y defensa (15.9 mil millones) completan los ocho pisos, cada uno con decenas de miles de millones en contratación con patrón P3. Pero el valor bruto subestima qué tan distorsionados están los pisos más profundos. Medido como porción del gasto de alto riesgo de cada sector, infraestructura canaliza 19.6 por ciento de su huella en riesgo por intermediarios P3 — cerca del triple de la porción que se observa en salud (6.0 por ciento) o Hacienda (6.5 por ciento). El gráfico se ordena por esa razón, de modo que el piso más distorsionado se lee arriba.',
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title:
            "The Deepest Floors: P3 Intermediation as a Share of Each Sector's High-Risk Spend",
          title_es:
            'Los pisos más profundos: intermediación P3 como porción del gasto de alto riesgo por sector',
          chartId: 'p3-by-sector',
          data: {
            points: [
              {
                label: 'Infraestructura',
                label_en: 'Infrastructure',
                value: 179.5,
                value2: 917.3,
                color: '#ea580c',
                highlight: true,
              },
              {
                label: 'Agricultura',
                label_en: 'Agriculture',
                value: 18.8,
                value2: 163.2,
                color: '#22c55e',
              },
              {
                label: 'Energía',
                label_en: 'Energy',
                value: 130.6,
                value2: 1181.6,
                color: '#eab308',
              },
              {
                label: 'Defensa',
                label_en: 'Defense',
                value: 15.9,
                value2: 158.3,
                color: '#1e3a5f',
              },
              {
                label: 'Gobernación',
                label_en: 'Governance',
                value: 17.8,
                value2: 204.4,
                color: '#be123c',
              },
              {
                label: 'Educación',
                label_en: 'Education',
                value: 19.1,
                value2: 250.1,
                color: '#3b82f6',
              },
              {
                label: 'Hacienda',
                label_en: 'Treasury',
                value: 40.9,
                value2: 625.5,
                color: '#16a34a',
              },
              {
                label: 'Salud',
                label_en: 'Health',
                value: 104.2,
                value2: 1739.7,
                color: '#dc2626',
              },
            ],
            unit: 'B MXN',
            gapFormat: 'ratio',
            annotation:
              "Filled dot = P3 intermediary spend (B MXN). Open dot = sector total at high or critical risk (B MXN). Right column = P3 share of the sector's at-risk footprint. Infrastructure routes 19.6% of its high-risk spend through P3 intermediaries — roughly three times the share seen in Health (6.0%) or Hacienda (6.5%).",
            annotation_es:
              'Punto relleno = gasto P3 de intermediación (miles de millones MXN). Punto abierto = total sectorial en riesgo alto o crítico (miles de millones MXN). Columna derecha = porción del gasto de riesgo del sector que corre por estructuras P3. Infraestructura canaliza 19.6% de su gasto de alto riesgo por intermediarios P3 — cerca del triple de la porción que se observa en Salud (6.0%) o Hacienda (6.5%).',
          },
        },
        pullquote: {
          quote:
            'Infrastructure alone moves 179 billion pesos through intermediary structures. The overhead cost — if OECD research applies — is 27 to 54 billion pesos.',
          quote_es:
            'Solo en infraestructura se mueven 179 mil millones de pesos por estructuras de intermediación. El sobrecosto — si aplica la investigación OCDE — es de 27 a 54 mil millones de pesos.',
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
        id: 'ch4',
        number: 4,
        title: 'The Blueprint',
        title_es: 'El plano original',
        subtitle: 'La Estafa Maestra and the design every floor was copied from',
        subtitle_es: 'La Estafa Maestra y el diseño del que se copió cada piso',
        prose: [
          "Descend to the foundation. Every floor above was copied from one original design, and the blueprint has a name: La Estafa Maestra. Federal agencies contracted public universities, which subcontracted phantom companies, which effectively returned money to the originating agencies' officials. The Parliamentary investigation of 2017 and the MCCI/Animal Político reporting of the same year found 7.67 billion pesos moved through this structure between 2013 and 2014 alone.",
          "The exploit was structural. Mexico's procurement law carried a carve-out exempting contracts with public universities from competitive bidding, on the legal fiction that universities are trusted public institutions. The universities became the intermediary layer between the procurement law and the shadow market. Beneath them sat phantom companies whose RFCs matched nothing in the Registro Federal de Contribuyentes — entities that existed on paper to receive money and pass it on.",
          "The inheritance is explicit. RUBLI's ground truth includes La Estafa Maestra; its linked vendors carry risk scores averaging 0.55 to 0.65 — elevated but not at the ceiling, because the small contract counts of phantom companies limit what the behavioral model can see. What RUBLI sees clearly is the mechanism. The 2,974 P3 vendors in today's queue are the structural successors of that architecture — different entities, different institutions, same role: a paid pass-through between budget and delivery.",
          "And the design imposes a cost. The OECD's 2023 review warns that intermediary chains add 15 to 30 percent overhead without adding delivery value. Applied to RUBLI's 526.8 billion pesos of P3 contracting, the implied overhead is somewhere between 79 and 158 billion pesos. At the low end, that is roughly the annual budget of the federal health-infrastructure program — the price of a structure built, floor by floor, on a blueprint Mexico already prosecuted once.",
        ],
        prose_es: [
          'Descienda a los cimientos. Cada piso de arriba se copió de un diseño original, y el plano tiene nombre: La Estafa Maestra. Las dependencias federales contrataban con universidades públicas, que subcontrataban con empresas fantasma, que en efecto devolvían el dinero a los funcionarios de las dependencias originales. La investigación parlamentaria de 2017 y la investigación periodística de MCCI/Animal Político del mismo año encontraron que 7.67 mil millones de pesos se movieron por esta estructura solo entre 2013 y 2014.',
          'El exploit era estructural. La ley mexicana de adquisiciones tenía una excepción que eximía los contratos con universidades públicas de la licitación competitiva, bajo la ficción legal de que las universidades son instituciones públicas confiables. Las universidades se volvieron la capa intermediaria entre la ley de adquisiciones y el mercado en la sombra. Debajo de ellas estaban las empresas fantasma cuyos RFC no coincidían con nada en el Registro Federal de Contribuyentes — entidades que existían en papel para recibir dinero y pasarlo.',
          'La herencia es explícita. La verdad-base de RUBLI incluye La Estafa Maestra; los proveedores vinculados a ella tienen calificaciones de riesgo que promedian de 0.55 a 0.65 — elevadas pero no en el techo, porque las cuentas pequeñas de contratos de las empresas fantasma limitan lo que el modelo conductual puede ver. Lo que RUBLI sí ve con claridad es el mecanismo. Los 2,974 proveedores P3 en la cola de hoy son los sucesores estructurales de esa arquitectura — distintas entidades, distintas instituciones, el mismo papel: un paso pagado entre el presupuesto y la entrega.',
          'Y el diseño impone un costo. La revisión 2023 de la OCDE advierte que las cadenas de intermediación añaden de 15 a 30 por ciento de sobrecarga sin agregar valor de entrega. Aplicado a los 526.8 mil millones de pesos de contratación P3 de RUBLI, el sobrecosto implícito está entre 79 y 158 mil millones de pesos. En el extremo bajo, eso es aproximadamente el presupuesto anual del programa federal de infraestructura del sector salud — el precio de una estructura construida, piso por piso, sobre un plano que México ya procesó una vez.',
        ],
        pullquote: {
          quote:
            "La Estafa Maestra moved 7.67 billion pesos through an intermediary structure in two years. RUBLI's current P3 population is running 526 billion.",
          quote_es:
            'La Estafa Maestra movió 7.67 mil millones de pesos por una estructura de intermediación en dos años. La población P3 actual de RUBLI corre con 526 mil millones.',
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
        title: 'The Locked Doors',
        title_es: 'Las puertas cerradas',
        subtitle: 'The oversight floor where the keys hang unused',
        subtitle_es: 'El piso de fiscalización donde las llaves cuelgan sin usarse',
        prose: [
          'End on the top floor — the offices of the oversight bodies that hold the keys and never turn them. Capture and intermediation resist prosecution for one fundamental reason: both rely on legal procurement actions whose aggregate effect is harmful even when each individual action is defensible. Subcontracting is legal. Recurring vendor relationships are legal. Direct adjudication of specialized procurement is legal. A prosecutor cannot easily build a case against a single contract. The evidence demands a case against a pattern, and Mexican procurement law provides no vehicle for pattern-based prosecution.',
          'Walk the rooms that should be in use. The SFP can audit procurement-unit performance and can in theory sanction officials whose award patterns indicate favoritism. Its actual sanctions docket, however, focuses overwhelmingly on documented individual misconduct — bribery, conflict-of-interest failures, procedural violations. Pattern-based sanctions are rare and politically controversial, because they require oversight bodies to second-guess cumulative professional judgment.',
          'Here are the keys RUBLI hands over. The 15,923 P6 and 2,974 P3 vendors are a starting point for precisely the pattern-based oversight the legal architecture does not yet support. UIF could subpoena bank records on the top-value P3 intermediaries to test whether the price spread between government payment and subcontract payment is systematic. COFECE could investigate P6 vendor-institution relationships as potential prácticas monopólicas relativas. ASF could run dedicated audits of the highest-concentration P6 procurement units. None of this is happening systematically.',
          'This is where the building metaphor resolves. The accountability gap is not legal. It is institutional and political. Mexico has the statutes, the oversight bodies, and — with RUBLI — the analytical capacity. What is missing is the decision to walk into rooms that have stayed locked for two decades.',
        ],
        prose_es: [
          'Termine en el último piso — las oficinas de los órganos de fiscalización que tienen las llaves y nunca las giran. La captura y la intermediación resisten el proceso penal por una razón fundamental: ambas se apoyan en acciones legales de contratación cuyo efecto agregado es dañino aun cuando cada acción individual sea defendible. Subcontratar es legal. Las relaciones recurrentes con proveedores son legales. La adjudicación directa de contratación especializada es legal. Un fiscal no puede construir fácilmente un caso contra un contrato individual. La evidencia exige un caso contra un patrón, y la ley mexicana de adquisiciones no provee el vehículo para imputación basada en patrones.',
          'Recorra las salas que deberían estar en uso. La SFP puede auditar el desempeño de las unidades compradoras y puede en teoría sancionar a funcionarios cuyos patrones de adjudicación indiquen favoritismo. Su agenda real de sanciones, sin embargo, se enfoca abrumadoramente en mal comportamiento individual documentado — sobornos, fallas de conflicto de interés, violaciones procedimentales. Las sanciones basadas en patrones son raras y políticamente controvertidas, porque exigen que los órganos de fiscalización pongan en duda el juicio profesional acumulado.',
          'Estas son las llaves que RUBLI entrega. Los 15,923 proveedores P6 y 2,974 proveedores P3 son un punto de partida para precisamente el oversight basado en patrones que la arquitectura legal aún no respalda. La UIF podría solicitar registros bancarios de los intermediarios P3 de mayor valor para probar si la diferencia de precio entre el pago del gobierno y el pago del subcontrato es sistemática. La COFECE podría investigar las relaciones proveedor-institución P6 como potenciales prácticas monopólicas relativas. La ASF podría correr auditorías dedicadas a las unidades compradoras P6 con mayor concentración. Nada de esto está pasando sistemáticamente.',
          'Aquí es donde se resuelve la metáfora del edificio. El vacío de fiscalización no es legal. Es institucional y político. México tiene los estatutos, los órganos de fiscalización y — con RUBLI — la capacidad analítica. Lo que falta es la decisión de entrar a salas que han permanecido cerradas durante dos décadas.',
        ],
        pullquote: {
          quote:
            'Mexico has the statutes, the oversight bodies, and the analytical capacity. What is missing is the decision to walk into rooms that have stayed locked for two decades.',
          quote_es:
            'México tiene las leyes, los órganos de fiscalización y la capacidad analítica. Lo que falta es la decisión de entrar a salas que han permanecido cerradas durante dos décadas.',
          stat: '18,897',
          statLabel: 'total P3 + P6 vendors awaiting pattern-based investigation',
          statLabel_es:
            'total de proveedores P3 + P6 a la espera de investigación basada en patrones',
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
      "Research whether Mexico's 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.",
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

  // === STORY 6: High Water ===
  {
    slug: 'marea-de-adjudicaciones',
    outlet: 'data_analysis',
    type: 'era',
    era: 'cross',
    headline: 'High Water',
    headline_es: 'Marea alta',
    subheadline:
      'For fourteen straight years, the share of Mexican federal contracts awarded without competition only rose — from 62.7% in 2010 to a peak of 82.2% in 2023. RUBLI charts the tide administration by administration. It is not an emergency. It is the shoreline now.',
    subheadline_es:
      'Durante catorce años seguidos, la proporción de contratos federales mexicanos adjudicados sin competencia solo subió — del 62.7% en 2010 a un pico de 82.2% en 2023. RUBLI traza la marea administración por administración. No es una emergencia. Es la costa de ahora.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'reporteado',
    leadStat: {
      value: '+5.1pp',
      label: "the tide's drift since the Fox baseline, across four administrations",
      label_es: 'la deriva de la marea desde la línea base Fox, en cuatro administraciones',
      sublabel: '14 consecutive years above 60% — the OECD shoreline is 30%',
      sublabel_es: '14 años consecutivos arriba del 60% — la costa OCDE está en 30%',
      color: '#ea580c',
    },
    kickerStats: [
      {
        value: '82.2%',
        suffix: 'high-water mark, 2023',
        suffix_es: 'marea alta, 2023',
        tone: 'critical',
      },
      {
        value: '~30%',
        suffix: 'OECD shoreline',
        suffix_es: 'costa OCDE',
        tone: 'muted',
      },
      {
        value: '14 yrs',
        suffix: 'never below 60%',
        suffix_es: 'nunca bajo 60%',
        tone: 'data',
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
      "Analyze whether BIRMEX's post-2019 procurement shows competitive pricing versus pre-reform IMSS pharmaceutical prices for the same drug categories.",
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
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Water Line, Seen From Altitude',
        title_es: 'La línea de marea, vista desde lo alto',
        subtitle: 'Four administrations, one rising average',
        subtitle_es: 'Cuatro administraciones, un promedio en ascenso',
        prose: [
          'A tide came in over Mexican federal procurement and never went back out. For fourteen years the share of contracts awarded without competition only rose, crossing one administration after another, indifferent to who governed the shore. Seen from altitude, the whole arc fits in a single rising sequence of water lines.',
          "Every Mexican government since 2010 promised procurement transparency. Every one used more direct awards than the last. Aggregated by administration, the contrast is unambiguous. Calderón (2007-2012) ran an average direct-award rate of 42.3 percent across 481,450 contracts worth 191.6 billion pesos. Peña Nieto (2013-2018) jumped to 73.1 percent across 1.23 million contracts worth 852.5 billion pesos. AMLO (2019-2024) reached 79.4 percent across 1.05 million contracts worth 1.06 trillion pesos. Sheinbaum's first months read 68.3 percent on 92,631 contracts — a partial-year reading, not a reversal. The Fox period predates reliable COMPRANET coverage of the is_direct_award flag and is excluded.",
          "Then there is the shore the tide left behind. OECD's 2023 Procurement Performance Review sets 25-30 percent as the approximate ceiling for direct award usage in a well-functioning system. That ceiling marks the legitimate universe of single-source situations: genuine emergencies, sole-provider specialty procurement, small-value transactions where competitive overhead exceeds expected savings. Above 30 percent, the OECD framework treats direct adjudication as a structural indicator of procurement dysfunction.",
          'That ceiling the OECD calls dysfunction is a floor Mexico does not approach. In Mexican federal procurement, non-competition is not the exception to the rule. It is the rule — by a ratio of roughly four to one. What follows is the chronological dive: how the water came in, year by year.',
        ],
        prose_es: [
          'Una marea subió sobre la contratación federal mexicana y nunca volvió a bajar. Durante catorce años la proporción de contratos adjudicados sin competencia solo subió, cruzando una administración tras otra, indiferente a quién gobernara la costa. Vista desde lo alto, toda la trayectoria cabe en una sola secuencia ascendente de líneas de marea.',
          'Todo gobierno mexicano desde 2010 prometió transparencia en la contratación. Todos usaron más adjudicaciones directas que el anterior. Agregado por administración, el contraste es inequívoco. Calderón (2007-2012) corrió una tasa promedio de adjudicación directa de 42.3 por ciento en 481,450 contratos por 191.6 mil millones de pesos. Peña Nieto (2013-2018) saltó a 73.1 por ciento en 1.23 millones de contratos por 852.5 mil millones de pesos. AMLO (2019-2024) alcanzó 79.4 por ciento en 1.05 millones de contratos por 1.06 billones de pesos. Los primeros meses de Sheinbaum se ubican en 68.3 por ciento sobre 92,631 contratos — una lectura parcial, no una reversión. El periodo Fox antecede a la cobertura confiable del indicador is_direct_award en CompraNet y queda excluido.',
          'Luego está la costa que la marea dejó atrás. La Revisión de Desempeño en Compras Públicas 2023 de la OCDE fija 25-30 por ciento como el techo aproximado del uso de adjudicación directa en un sistema que funciona bien. Ese techo marca el universo legítimo de situaciones de única fuente: emergencias genuinas, contratación especializada de proveedor único, transacciones de bajo valor donde la sobrecarga competitiva excede los ahorros esperados. Por encima del 30 por ciento, el marco OCDE trata a la adjudicación directa como un indicador estructural de disfunción en la contratación pública.',
          'Ese techo que la OCDE llama disfunción es un piso al que México no se acerca. En la contratación federal mexicana, la no-competencia no es la excepción a la regla. Es la regla — con razón de aproximadamente cuatro a uno. Lo que sigue es la inmersión cronológica: cómo entró el agua, año por año.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'The Water Line, Averaged per Administration',
          title_es: 'La línea de marea, promediada por administración',
          chartId: 'da-rate-by-admin',
          data: {
            points: [
              {
                label: 'Calderón',
                value: 42.3,
                color: '#3b82f6',
                annotation: '481K contracts · 191.6B MXN',
                annotation_es: '481K contratos · 191.6 mil M MXN',
              },
              {
                label: 'Peña Nieto',
                value: 73.1,
                color: '#a06820',
                annotation: '1.23M contracts · 852.5B MXN',
                annotation_es: '1.23M contratos · 852.5 mil M MXN',
              },
              {
                label: 'AMLO',
                value: 79.4,
                color: '#dc2626',
                highlight: true,
                annotation: '1.05M contracts · 1.06T MXN',
                annotation_es: '1.05M contratos · 1.06 billones MXN',
              },
              {
                label: 'Sheinbaum',
                value: 68.3,
                color: '#ea580c',
                annotation: '92K contracts (partial term)',
                annotation_es: '92K contratos (mandato parcial)',
              },
            ],
            referenceLine: {
              value: 30,
              label: 'OECD ceiling ~30%',
              label_es: 'Techo OCDE ~30%',
              color: '#3b82f6',
            },
            unit: '%',
            maxValue: 100,
            yLabel: 'Average direct award rate (%)',
            yLabel_es: 'Tasa promedio de adjudicación directa (%)',
            annotation:
              'Each administration since reliable data began has set a new ceiling. Fox (2001-2006) excluded — Structure A coverage of is_direct_award is unreliable. Sheinbaum reads as a partial-year preview.',
            annotation_es:
              'Cada administración desde el inicio de los datos confiables ha fijado un nuevo techo. Fox (2001-2006) excluido — la cobertura del indicador is_direct_award en la estructura A no es confiable. Sheinbaum es una lectura parcial.',
          },
        },
        pullquote: {
          quote:
            "In Mexico's federal procurement, competitive bidding is the exception. Direct awards are the rule, by a ratio of four to one.",
          quote_es:
            'En la contratación federal mexicana, la licitación competitiva es la excepción. La adjudicación directa es la regla, con razón de cuatro a uno.',
          stat: '82.2%',
          statLabel: 'high-water mark, direct award rate 2023',
          statLabel_es: 'marea alta, tasa de adjudicación directa 2023',
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
        title: 'The Tide Comes In',
        title_es: 'Sube la marea',
        subtitle: 'The year-by-year ascent, 2010-2024',
        subtitle_es: 'El ascenso año por año, 2010-2024',
        prose: [
          'Drop from the altitude average to the waterline itself and watch it rise in real time. The line starts in 2010 at 62.7 percent — already more than twice the OECD ceiling — the earliest reliable mark, drawn from Structure B of the COMPRANET archive. From there it barely stops climbing for the next thirteen years.',
          "Walk the ascent like a tide chart. In 2011 the water recedes slightly to 60.0 percent. Then the climb resumes: 68.4 percent in 2013, 73.0 percent in 2015, 74.8 percent in 2016, 77.1 percent in 2017. AMLO's first year reads 77.8 percent in 2019; 78.1 percent in 2020; 80.0 percent in 2021. A small recede to 79.1 percent in 2022 precedes the 82.2 percent high-water mark of 2023, before settling to 79.3 percent in 2024.",
          "This is a ratchet, not a policy. No single administration's fault, no single reform caused the trajectory. The rise operates continuously across partisan transitions — the water keeps coming in regardless of who governs the shore. Mexico has been above 60 percent for the entire data period and above 75 percent since 2017, exceeding the OECD recommended ceiling by two to three times every single year in the dataset.",
          'The distance between the 30 percent OECD shore and the 60-plus percent Mexican floor is the drowned zone — the ground where competitive procurement used to live. The chapters that follow populate it: first the peak, which arrives not during the emergency everyone expects but after it; then the structures left standing in the flooded ground.',
        ],
        prose_es: [
          'Baja del promedio en altitud a la línea de marea misma y obsérvala subir en tiempo real. La línea arranca en 2010 en 62.7 por ciento — ya más del doble del techo OCDE — la marca confiable más temprana, tomada de la estructura B del archivo CompraNet. De ahí en adelante casi no deja de subir durante los siguientes trece años.',
          'Recorre el ascenso como una carta de marea. En 2011 el agua baja ligeramente a 60.0 por ciento. Luego la subida se reanuda: 68.4 por ciento en 2013, 73.0 por ciento en 2015, 74.8 por ciento en 2016, 77.1 por ciento en 2017. El primer año de AMLO marca 77.8 por ciento en 2019; 78.1 por ciento en 2020; 80.0 por ciento en 2021. Una pequeña baja a 79.1 por ciento en 2022 antecede a la marea alta de 82.2 por ciento de 2023, antes de asentarse en 79.3 por ciento en 2024.',
          'Esto es un trinquete, no una política. No hay culpa de una sola administración, ninguna reforma causó por sí sola la trayectoria. El alza opera continuamente a través de las transiciones partidistas — el agua sigue entrando sin importar quién gobierne la costa. México ha estado por encima del 60 por ciento durante todo el periodo de datos y por encima del 75 por ciento desde 2017, excediendo el techo recomendado OCDE entre dos y tres veces cada año del conjunto de datos.',
          'La distancia entre la costa OCDE del 30 por ciento y el piso mexicano de más del 60 es la zona inundada — el terreno donde solía vivir la contratación competitiva. Los capítulos que siguen la pueblan: primero el pico, que llega no durante la emergencia que todos esperan sino después de ella; luego las estructuras que quedaron en pie en el terreno anegado.',
        ],
        chartConfig: {
          type: 'inline-area',
          title: 'The Tide Chart: Direct Award Rate by Year, 2010-2024',
          title_es: 'La carta de marea: tasa de adjudicación directa por año, 2010-2024',
          chartId: 'da-rate-trend',
          data: {
            points: [
              {
                label: '2010',
                value: 62.7,
              },
              {
                label: '2011',
                value: 60,
              },
              {
                label: '2013',
                value: 68.4,
              },
              {
                label: '2015',
                value: 73,
              },
              {
                label: '2016',
                value: 74.8,
              },
              {
                label: '2017',
                value: 77.1,
              },
              {
                label: '2019',
                value: 77.8,
              },
              {
                label: '2020',
                value: 78.1,
              },
              {
                label: '2021',
                value: 80,
                highlight: true,
                annotation: '80%',
              },
              {
                label: '2022',
                value: 79.1,
              },
              {
                label: '2023',
                value: 82.2,
                highlight: true,
                annotation: 'peak 82.2%',
                annotation_es: 'pico 82.2%',
              },
              {
                label: '2024',
                value: 79.3,
              },
            ],
            referenceLine: {
              value: 30,
              label: 'OECD recommended ceiling ~30%',
              label_es: 'Techo recomendado OCDE ~30%',
              color: '#3b82f6',
            },
            unit: '%',
            maxValue: 100,
            yLabel: 'Direct award rate (%)',
            yLabel_es: 'Tasa de adjudicación directa (%)',
            annotation:
              'Mexico exceeds OECD recommended ceiling by 2-3x every year in the dataset.',
            annotation_es:
              'México excede el techo recomendado OCDE entre 2 y 3 veces cada año del periodo.',
          },
        },
        pullquote: {
          quote:
            "The OECD ceiling is 30 percent. Mexico's floor is 60 percent. The distance between them is where competitive procurement used to live.",
          quote_es:
            'El techo OCDE es del 30 por ciento. El piso mexicano es del 60. La distancia entre ambos es donde solía vivir la contratación competitiva.',
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
        title: 'High Water',
        title_es: 'Marea alta',
        subtitle: '2019-2023: the peak arrives after the emergency, not during it',
        subtitle_es: '2019-2023: el pico llega después de la emergencia, no durante ella',
        prose: [
          'The expectation everyone holds is that 2020, the COVID year, should be the surge — the moment emergency procurement broke the dam. The data breaks that expectation. The pandemic produced only a local ripple: 77.8 percent in 2019, before COVID, to 78.1 percent in 2020, a move of just +0.3pp. The real swell came after the emergency ended. The three post-pandemic years added +4.1pp, cresting at 82.2 percent in 2023 — the highest rate in the 23 years RUBLI can analyze.',
          "The verdict is clean. The pandemic did not create Mexico's direct-award culture; it was an accelerant applied to a pre-existing structural condition. Direct award procedures exist for legitimate reasons — Mexico's Ley de Adquisiciones, Art. 41, enumerates them: genuine emergencies, single-source situations, continuity of services with existing contractors, small-value contracts below threshold under Art. 42, against open competitive bidding under Art. 26. But when 82 percent of contracts invoke one or another exception, the statute's architecture has been inverted. The exception became the default.",
          'The 2023 peak deserves scrutiny because it arrived after the AMLO administration had completed the centralization of pharmaceutical procurement under BIRMEX and INSABI, reconstituted military construction oversight, and nominally committed to competition as the default mechanism. The peak is not an inheritance from the prior administration. It is a policy choice of the current architecture.',
          "The irony is documented in RUBLI's data. The 2019 BIRMEX-INSABI centralization was framed explicitly as anti-corruption — stripping discretion from individual institutional buyers who had developed corrupt relationships with vendors. Yet the centralized system that replaced fragmented procurement ran at near-100 percent direct award rates in 2020-2021, awarding enormous single-source contracts without competitive process. Centralization did not cure the direct-award dependency; it concentrated it.",
          'The mechanism of that concentration is revealing. A decentralized system with corrupt relationships at 1,000 institutional buyers produces 1,000 instances of direct adjudication, each justified on its own terms. A centralized system with no more competitive capacity than its predecessors produces a single national-scale direct award, justified on a single institutional basis. The shape of the problem changed; the underlying dependency did not.',
        ],
        prose_es: [
          'La expectativa que todos tienen es que 2020, el año de la COVID, debió ser la marejada — el momento en que la contratación de emergencia rompió el dique. Los datos rompen esa expectativa. La pandemia produjo apenas una ondulación local: 77.8 por ciento en 2019, antes de la COVID, a 78.1 por ciento en 2020, un movimiento de apenas +0.3pp. La verdadera crecida llegó después de que terminó la emergencia. Los tres años pospandemia sumaron +4.1pp, culminando en 82.2 por ciento en 2023 — la tasa más alta en los 23 años que RUBLI puede analizar.',
          'El veredicto es nítido. La pandemia no creó la cultura de adjudicación directa en México; fue un acelerante aplicado a una condición estructural preexistente. Los procedimientos de adjudicación directa existen por razones legítimas — la Ley de Adquisiciones de México, Art. 41, las enumera: emergencias genuinas, situaciones de única fuente, continuidad de servicios con contratistas existentes, contratos de bajo valor por debajo del umbral bajo el Art. 42, frente a la licitación pública abierta bajo el Art. 26. Pero cuando el 82 por ciento de los contratos invoca alguna u otra excepción, la arquitectura del estatuto se ha invertido. La excepción se volvió la regla por defecto.',
          'El pico de 2023 merece escrutinio porque llegó después de que la administración AMLO había completado la centralización de la contratación farmacéutica bajo BIRMEX e INSABI, reconstituido la supervisión de la construcción militar y se había comprometido nominalmente con la competencia como mecanismo por defecto. El pico no es una herencia de la administración previa. Es una decisión de política de la arquitectura actual.',
          'La ironía está documentada en los datos de RUBLI. La centralización BIRMEX-INSABI de 2019 fue planteada explícitamente como anticorrupción — removiendo la discreción de compradores institucionales individuales que habían desarrollado relaciones corruptas con proveedores. Sin embargo, el sistema centralizado que reemplazó a la contratación fragmentada operó con tasas de adjudicación directa cercanas al 100 por ciento en 2020-2021, adjudicando enormes contratos de única fuente sin proceso competitivo. La centralización no curó la dependencia de la adjudicación directa; la concentró.',
          'El mecanismo de esa concentración es revelador. Un sistema descentralizado con relaciones corruptas en 1,000 compradores institucionales produce 1,000 instancias de adjudicación directa, cada una justificada en sus propios términos. Un sistema centralizado sin mayor capacidad competitiva que sus predecesores produce una sola adjudicación directa de escala nacional, justificada sobre una sola base institucional. La forma del problema cambió; la dependencia subyacente no.',
        ],
        chartConfig: {
          type: 'editorial-threshold',
          title: 'The peak arrived after the emergency, not during it',
          title_es: 'El pico llegó después de la emergencia, no durante ella',
          data: {
            points: [
              {
                label: '2019 pre-COVID',
                value: 77.8,
                color: '#ea580c',
                annotation: 'already at structural peak',
                annotation_es: 'ya en el pico estructural',
              },
              {
                label: '2020 COVID year',
                value: 78.1,
                color: '#ea580c',
                annotation: '+0.3pp during pandemic',
                annotation_es: '+0.3pp durante la pandemia',
              },
              {
                label: '2023 post-COVID',
                value: 82.2,
                color: '#dc2626',
                highlight: true,
                annotation: '+4.1pp after pandemic ended',
                annotation_es: '+4.1pp tras finalizar la pandemia',
              },
            ],
            referenceLine: {
              value: 30,
              label: 'OECD recommended ceiling ~30%',
              label_es: 'Techo recomendado OCDE ~30%',
              color: '#3b82f6',
            },
            unit: '%',
            maxValue: 100,
            yLabel: 'Direct award rate (%)',
            yLabel_es: 'Tasa de adjudicación directa (%)',
            annotation:
              'The trend was climbing before COVID and continued climbing after. The pandemic moved the rate +0.3pp; the three years that followed moved it +4.1pp more. The pandemic was an accelerant applied to a pre-existing structural condition — not the cause.',
            annotation_es:
              'La tendencia ya subía antes de la COVID y siguió subiendo después. La pandemia movió la tasa +0.3pp; los tres años siguientes la movieron +4.1pp adicionales. La pandemia fue un acelerante aplicado a una condición estructural preexistente — no la causa.',
          },
        },
        pullquote: {
          quote:
            "The pandemic did not create Mexico's direct-award culture. It was an accelerant applied to a pre-existing structural condition.",
          quote_es:
            'La pandemia no creó la cultura de adjudicación directa en México. Fue un acelerante aplicado a una condición estructural preexistente.',
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
        title: 'What the Flood Left Standing',
        title_es: 'Lo que dejó en pie la inundación',
        subtitle:
          'The captive suppliers occupying the drowned competitive zone — and the ~108B MXN/yr cost',
        subtitle_es:
          'Los proveedores cautivos que ocupan la zona competitiva inundada — y el costo de ~108 mil MDP al año',
        prose: [
          'With the tide at its peak, survey what now occupies the flooded competitive ground — and what the water costs. Start with the cost. OECD research across 40 countries has quantified the premium paid in non-competitive procurement. A 2019 meta-analysis found that eliminating competition raises contract prices by 15 to 30 percent on average, with higher premiums in concentrated markets and for recurring vendors — 25 to 40 percent for infrastructure and specialized technical procurement.',
          'Applied conservatively to Mexico: in 2023, direct-award contracts totaled approximately 720 billion pesos in face value. At a 15 percent premium — the low end of the OECD range — the competitive distortion cost is approximately 108 billion pesos annually. That is equivalent to roughly 40 percent of the entire federal education budget for that year, or 60 percent of the health infrastructure budget.',
          "This is not a definitive calculation. Individual contract circumstances vary enormously, and some direct awards may in fact be priced competitively through internal benchmarking, international reference pricing, or vendor self-discipline. But RUBLI's risk model corroborates: the average risk score for direct-award contracts is significantly higher than for competitive procedures in the same sector-year — consistent with the pattern that non-competitive awards attract overpricing and favoritism even when not outright fraudulent. Summed across the 23 years of data at OECD-typical premiums, the aggregate sits in the low trillions of pesos. That is an order-of-magnitude estimate, not a precise figure. What RUBLI can show precisely is that the opportunity cost exists and scales with the rate.",
          'Now name who is standing in the water. Of vendors with at least 50 contracts between 2010 and 2024 and a direct-award rate above 95 percent, three coherent clusters emerge. Tech licensing — Microsoft Corporation at 10.87 billion pesos and a 97.3 percent direct-award rate, Oracle México at 8.27 billion and 98.4 percent, IBM México at 8.02 billion and 95.4 percent, plus Microsoft Licensing GP at 6.66 billion (97.7 percent) and Microsoft México at 6.61 billion (99.6 percent) — partly defensible, since proprietary software is genuinely sole-source.',
          'Broadcaster capture is the second cluster: Televisa at 7.07 billion and 99.7 percent, Estudios Azteca at 5.82 billion and 99.8 percent — 12.9 billion pesos routed to the two dominant broadcasters without competition. The third is the welfare-distribution staples apparatus DICONSA-LICONSA: Molinos Azteca at 7.62 billion and 99.9 percent (flour), Marcas Nestlé at 4.35 billion and 99.9 percent (dairy), Molinera de México at 2.87 billion and 100 percent (flour), Fábrica de Jabón La Corona at 2.68 billion and 99.9 percent (hygiene) — 17.5 billion pesos across four staple producers, with Industrial Patrona at 3.87 billion and 99.7 percent (bulk) alongside. Then the outliers: Aeroméxico at 5.31 billion and 95.5 percent (government travel) and CENEVAL at 3.66 billion and 100 percent (government-owned exam body). The abstraction of the tide becomes concrete. These are the names that no longer have to compete.',
        ],
        prose_es: [
          'Con la marea en su pico, examinemos qué ocupa ahora el terreno competitivo inundado — y qué cuesta el agua. Empecemos por el costo. La investigación de la OCDE en 40 países ha cuantificado la prima pagada en la contratación no competitiva. Un meta-análisis de 2019 encontró que eliminar la competencia incrementa los precios de contrato en promedio entre 15 y 30 por ciento, con primas más altas en mercados concentrados y con proveedores recurrentes — entre 25 y 40 por ciento en infraestructura y contratación técnica especializada.',
          'Aplicado conservadoramente a México: en 2023, los contratos por adjudicación directa totalizaron aproximadamente 720 mil millones de pesos en valor nominal. Con una prima del 15 por ciento — el extremo bajo del rango OCDE — el costo por distorsión competitiva es de aproximadamente 108 mil millones de pesos anuales. Eso equivale a aproximadamente 40 por ciento del presupuesto federal de educación completo de ese año, o 60 por ciento del presupuesto de infraestructura del sector salud.',
          'Este no es un cálculo definitivo. Las circunstancias de cada contrato varían enormemente, y algunas adjudicaciones directas pueden de hecho tener precios competitivos por benchmarking interno, precios internacionales de referencia o auto-disciplina del proveedor. Pero el modelo de riesgo de RUBLI corrobora: la calificación de riesgo promedio para contratos por adjudicación directa es significativamente más alta que la de procedimientos competitivos en el mismo sector-año — consistente con el patrón de que las adjudicaciones no competitivas atraen sobreprecio y favoritismo aun cuando no sean francamente fraudulentas. Sumado a lo largo de los 23 años de datos con primas típicas OCDE, el agregado se ubica en el bajo orden de los billones de pesos. Es una estimación de orden de magnitud, no una cifra precisa. Lo que RUBLI puede mostrar con precisión es que el costo de oportunidad existe y escala con la tasa.',
          'Ahora, nombremos quién está parado en el agua. De los proveedores con al menos 50 contratos entre 2010 y 2024 y una tasa de adjudicación directa por encima del 95 por ciento, emergen tres bloques coherentes. Licencias tecnológicas — Microsoft Corporation con 10.87 mil millones de pesos y una tasa de adjudicación directa de 97.3 por ciento, Oracle México con 8.27 mil millones y 98.4 por ciento, IBM México con 8.02 mil millones y 95.4 por ciento, más Microsoft Licensing GP con 6.66 mil millones (97.7 por ciento) y Microsoft México con 6.61 mil millones (99.6 por ciento) — en parte defendibles, ya que el software propietario es genuinamente de única fuente.',
          'La captura de las radiodifusoras es el segundo bloque: Televisa con 7.07 mil millones y 99.7 por ciento, Estudios Azteca con 5.82 mil millones y 99.8 por ciento — 12.9 mil millones de pesos canalizados a las dos radiodifusoras dominantes sin competencia. El tercero es el aparato de distribución de bienestar DICONSA-LICONSA: Molinos Azteca con 7.62 mil millones y 99.9 por ciento (harina), Marcas Nestlé con 4.35 mil millones y 99.9 por ciento (lácteos), Molinera de México con 2.87 mil millones y 100 por ciento (harina), Fábrica de Jabón La Corona con 2.68 mil millones y 99.9 por ciento (higiene) — 17.5 mil millones de pesos entre cuatro productores de canasta, con Industrial Patrona con 3.87 mil millones y 99.7 por ciento (insumos) al lado. Luego los casos atípicos: Aeroméxico con 5.31 mil millones y 95.5 por ciento (viajes oficiales) y CENEVAL con 3.66 mil millones y 100 por ciento (paraestatal de evaluación). La abstracción de la marea se vuelve concreta. Estos son los nombres que ya no tienen que competir.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title:
            'Standing in the Drowned Zone: Top 14 Direct-Award-Only Vendors (≥95% DA, ≥50 contracts, 2010-2024)',
          title_es:
            'De pie en la zona inundada: top 14 proveedores solo por adjudicación directa (≥95% AD, ≥50 contratos, 2010-2024)',
          chartId: 'da-only-vendors',
          data: {
            points: [
              {
                label: 'Microsoft Corporation',
                value: 10.87,
                color: '#a06820',
                annotation: '97.3% DA · tech license',
                annotation_es: '97.3% AD · licencia tech',
              },
              {
                label: 'Oracle México',
                value: 8.27,
                color: '#a06820',
                annotation: '98.4% DA · tech license',
                annotation_es: '98.4% AD · licencia tech',
              },
              {
                label: 'IBM México',
                value: 8.02,
                color: '#a06820',
                annotation: '95.4% DA · tech license',
                annotation_es: '95.4% AD · licencia tech',
              },
              {
                label: 'Molinos Azteca',
                value: 7.62,
                color: '#64748b',
                annotation: '99.9% DA · DICONSA flour',
                annotation_es: '99.9% AD · harina DICONSA',
              },
              {
                label: 'Televisa',
                value: 7.07,
                color: '#dc2626',
                highlight: true,
                annotation: '99.7% DA · gov media buy',
                annotation_es: '99.7% AD · gasto en medios',
              },
              {
                label: 'Microsoft Licensing GP',
                value: 6.66,
                color: '#a06820',
                annotation: '97.7% DA · tech license',
                annotation_es: '97.7% AD · licencia tech',
              },
              {
                label: 'Microsoft México',
                value: 6.61,
                color: '#a06820',
                annotation: '99.6% DA · tech license',
                annotation_es: '99.6% AD · licencia tech',
              },
              {
                label: 'Estudios Azteca',
                value: 5.82,
                color: '#dc2626',
                highlight: true,
                annotation: '99.8% DA · gov media buy',
                annotation_es: '99.8% AD · gasto en medios',
              },
              {
                label: 'Aeroméxico',
                value: 5.31,
                color: '#a06820',
                annotation: '95.5% DA · gov travel',
                annotation_es: '95.5% AD · viajes oficiales',
              },
              {
                label: 'Marcas Nestlé',
                value: 4.35,
                color: '#64748b',
                annotation: '99.9% DA · DICONSA dairy',
                annotation_es: '99.9% AD · lácteos DICONSA',
              },
              {
                label: 'Industrial Patrona',
                value: 3.87,
                color: '#64748b',
                annotation: '99.7% DA · DICONSA bulk',
                annotation_es: '99.7% AD · insumos DICONSA',
              },
              {
                label: 'CENEVAL',
                value: 3.66,
                color: '#a06820',
                annotation: '100% DA · gov-owned exam',
                annotation_es: '100% AD · paraestatal',
              },
              {
                label: 'Molinera de México',
                value: 2.87,
                color: '#64748b',
                annotation: '100% DA · DICONSA flour',
                annotation_es: '100% AD · harina DICONSA',
              },
              {
                label: 'Fábrica de Jabón La Corona',
                value: 2.68,
                color: '#64748b',
                annotation: '99.9% DA · DICONSA hygiene',
                annotation_es: '99.9% AD · higiene DICONSA',
              },
            ],
            unit: 'B MXN',
            annotation:
              'Three captive-supplier clusters emerge: tech licensing (amber, defensible as sole-source), broadcaster capture at Televisa and TV Azteca (red — 12.9B MXN routed to two broadcasters without competition), and DICONSA bulk-staples supply (slate — 17.5B MXN across four staple producers).',
            annotation_es:
              'Emergen tres bloques de proveedores cautivos: licencias tecnológicas (ámbar, defendibles como única fuente), captura de las radiodifusoras Televisa y TV Azteca (rojo — 12.9 mil millones de pesos canalizados a dos radiodifusoras sin competencia), y suministro de bienes básicos a DICONSA (pizarra — 17.5 mil millones de pesos entre cuatro productores de canasta).',
          },
        },
        pullquote: {
          quote:
            'A 15 percent competitive premium on 720 billion pesos in direct awards equals roughly 108 billion pesos annually — the cost of competition foregone.',
          quote_es:
            'Una prima competitiva del 15 por ciento sobre 720 mil millones de pesos en adjudicaciones directas equivale aproximadamente a 108 mil millones de pesos anuales — el costo de la competencia que no hubo.',
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
        title: 'The Seawall Never Built',
        title_es: 'El malecón que nunca se construyó',
        subtitle: 'An oversight architecture that exists in law and not in practice',
        subtitle_es: 'Una arquitectura de fiscalización que existe en la ley y no en la práctica',
        prose: [
          'Mexico drafted a seawall in statute and never poured the concrete. The architecture to hold the tide back exists on paper. Every direct award under Art. 41 requires a written justification stating the specific legal basis — emergency, sole source, continuity — the vendor selected, and the rationale. Those justifications are theoretically public under transparency law. SFP is theoretically empowered to audit the pattern of justifications at each procurement unit. ASF is theoretically empowered to review individual high-value direct awards under Art. 41 and Art. 42 during Cuenta Pública audits.',
          'In practice, the seawall has a breach the width of the coast. Justification documents are published inconsistently. The SFP pattern-audit function operates at a small fraction of its legal capacity. ASF individual-contract reviews cover a tiny fraction of high-value direct awards. The conclusion is hard: the 82 percent rate is not the outcome of a system that tried to constrain direct awards and failed. It is the outcome of a system that accepted them as normal and built no constraining architecture at all.',
          "Holding the tide back would require three things RUBLI's data makes possible but cannot deliver alone. First, systematic publication of Art. 41 justification documents in machine-readable form. Second, pattern-based audit by SFP of procurement units whose direct-award rates exceed sector norms. Third, real-time risk monitoring during procurement decisions, so a risky direct adjudication can be challenged before it is executed rather than after.",
          'Each fix is technically feasible today. CompraNet has the data architecture. RUBLI has the analytical methodology. What is missing is the institutional commitment to operate an oversight system against the grain of fourteen years of direct-award dependency. Until that commitment materializes, the waterline keeps drifting up, and the cost — measurable in hundreds of billions of pesos a year — keeps being paid by the Mexican public.',
        ],
        prose_es: [
          'México redactó un malecón en el estatuto y nunca vació el concreto. La arquitectura para contener la marea existe en el papel. Cada adjudicación directa bajo el Art. 41 requiere una justificación escrita que especifique la base legal específica — emergencia, única fuente, continuidad — el proveedor seleccionado y la motivación. Esas justificaciones son en teoría públicas bajo la ley de transparencia. La SFP está en teoría facultada para auditar el patrón de justificaciones en cada unidad compradora. La ASF está en teoría facultada para revisar adjudicaciones directas individuales de alto valor bajo el Art. 41 y el Art. 42 durante las auditorías de la Cuenta Pública.',
          'En la práctica, el malecón tiene una brecha del ancho de la costa. Los documentos de justificación se publican de manera inconsistente. La función de auditoría por patrones de la SFP opera a una pequeña fracción de su capacidad legal. Las revisiones por contrato individual de la ASF cubren una fracción minúscula de las adjudicaciones directas de alto valor. La conclusión es dura: la tasa de 82 por ciento no es el resultado de un sistema que intentó restringir las adjudicaciones directas y falló. Es el resultado de un sistema que las aceptó como normales y no construyó arquitectura restrictiva alguna.',
          'Contener la marea requeriría tres cosas que los datos de RUBLI hacen posibles pero no entregan por sí solas. Primero, publicación sistemática de los documentos de justificación del Art. 41 en formato legible por máquina. Segundo, auditoría basada en patrones por la SFP a las unidades compradoras cuyas tasas de adjudicación directa excedan las normas sectoriales. Tercero, monitoreo de riesgo en tiempo real durante las decisiones de contratación, de modo que una adjudicación directa riesgosa pueda impugnarse antes de ejecutarse y no después.',
          'Cada remedio es técnicamente factible hoy. CompraNet tiene la arquitectura de datos. RUBLI tiene la metodología analítica. Lo que falta es el compromiso institucional para operar un sistema de fiscalización a contracorriente de catorce años de dependencia de la adjudicación directa. Hasta que ese compromiso se materialice, la línea de marea seguirá desplazándose hacia arriba, y el costo — medible en cientos de miles de millones de pesos al año — seguirá pagándolo el público mexicano.',
        ],
        pullquote: {
          quote:
            'Mexico built an oversight architecture in law and never built it in practice. The 82% direct-award rate is the visible shape of that absence.',
          quote_es:
            'México construyó una arquitectura de fiscalización en la ley y nunca la construyó en la práctica. La tasa de adjudicación directa del 82% es la forma visible de esa ausencia.',
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
  },

  // === STORY 7: The Ledger of Five Administrations ===
  {
    slug: 'el-sexenio-del-riesgo',
    outlet: 'data_analysis',
    type: 'era',
    era: 'amlo',
    headline: 'The Ledger of Five Administrations',
    headline_es: 'El Libro Mayor de Cinco Sexenios',
    subheadline:
      "Read as an auditor's scorecard, 23 years of federal procurement return a single verdict: every Mexican administration since Fox scored riskier than the one before it. RUBLI's politically blind v0.8.5 model flags 7.5 percent of Fox-era contracts, 8.2 percent of Calderón's, 11.2 percent of Peña Nieto's, and 12.6 percent of AMLO's — the highest line in the book, 5.1 percentage points above where the trend began. Under AMLO the books were not cut; they were reorganized: defense tripled, civilian infrastructure fell 65 percent, and pharmaceutical and welfare logistics concentrated in a handful of vendors. Sheinbaum's account, still open, already posts 12.9 percent.",
    subheadline_es:
      'Leídos como el marcador de un auditor, 23 años de contratación federal devuelven un solo veredicto: cada administración mexicana desde Fox calificó más riesgosa que la anterior. El modelo v0.8.5 de RUBLI, políticamente ciego, marca el 7.5 por ciento de los contratos de la era Fox, el 8.2 por ciento de los de Calderón, el 11.2 por ciento de los de Peña Nieto y el 12.6 por ciento de los de AMLO — la línea más alta del libro, 5.1 puntos porcentuales por encima de donde empezó la tendencia. Bajo AMLO los libros no se recortaron; se reorganizaron: la defensa se triplicó, la infraestructura civil cayó 65 por ciento, y la logística farmacéutica y de bienestar se concentró en un puñado de proveedores. La cuenta de Sheinbaum, aún abierta, ya registra 12.9 por ciento.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 17,
    status: 'reporteado',
    leadStat: {
      value: '12.6%',
      label: 'high-risk rate, AMLO account (2019-2024) · v0.8.5 — highest line in the book',
      label_es:
        'tasa de alto riesgo, cuenta AMLO (2019-2024) · v0.8.5 — la línea más alta del libro',
      sublabel: 'vs 7.5% Fox · 8.2% Calderón · 11.2% Peña Nieto · 12.9% Sheinbaum (partial)',
      sublabel_es: 'vs 7.5% Fox · 8.2% Calderón · 11.2% Peña Nieto · 12.9% Sheinbaum (parcial)',
      color: '#dc2626',
    },
    kickerStats: [
      {
        value: '7.5% → 12.6%',
        suffix: 'high-risk rate, Fox to AMLO — every term riskier than the last.',
        suffix_es:
          'tasa de alto riesgo, de Fox a AMLO — cada sexenio más riesgoso que el anterior.',
        tone: 'data',
      },
      {
        value: '+5.1pp',
        suffix: 'upward drift across 24 years of data.',
        suffix_es: 'de deriva ascendente en 24 años de datos.',
        tone: 'data',
      },
      {
        value: '79.4%',
        suffix: 'AMLO direct-award rate — the liability carried into the open account.',
        suffix_es: 'tasa de adjudicación directa AMLO — el pasivo heredado a la cuenta abierta.',
        tone: 'critical',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'Opening the Books',
        title_es: 'Abrir los libros',
        subtitle: 'Five administrations, one ascending column',
        subtitle_es: 'Cinco sexenios, una columna ascendente',
        prose: [
          "Treat the dataset as five sealed accounts and the auditor's first duty is to fix the instrument before reading the numbers. RUBLI's v0.8.5 risk model (test AUC 0.785) was not calibrated to any single administration. It was trained on 1,427 documented corruption cases spanning multiple presidencies and scores each contract by its structural resemblance to known-bad patterns: vendor concentration, price volatility, single-bidder conditions, network membership, institution diversity, and procurement mechanism. It carries no partisan attachment and no political knowledge. It is the politically blind auditor. It sees only patterns.",
          'Post the five columns in sequence, low to high, and the ledger reads itself. Under Fox (2001-2006), the high-risk rate was 7.50 percent across 206,333 contracts, of which 15,479 were flagged. Under Calderón (2007-2012), it reached 8.15 percent across 481,450 contracts, 39,238 flagged. Under Peña Nieto (2013-2018), it climbed to 11.18 percent across 1,228,625 contracts, 137,358 flagged. Under AMLO (2019-2024), it reached 12.62 percent across 1,043,097 contracts, 131,640 flagged — the highest line in 23 years of data. Headline rates rounded: Fox 7.5, Calderón 8.2, Peña Nieto 11.2, AMLO 12.6.',
          "Each account carries its own audit note, and a fair reading enters them per term. Fox governed under Structure A coverage (2001-2006), so the 7.5 percent reads as a floor: the dataset under-reports the period and the true rate is likely higher. Calderón's 8.2 percent sits inside the OECD 2-15 percent benchmark, the boundary the 2023 Public Procurement Performance Report draws around acceptable systems. Peña Nieto's 11.2 percent crosses into concerning territory. AMLO's 12.6 percent breaks the book's record — and stands 5.1 percentage points above where the trend began, an upward drift sustained across 24 years of data.",
          'One line in the column resists a lazy reading. AMLO flagged fewer raw contracts than Peña Nieto — 131,640 against 137,358 — on lower total volume. It is the rate, not the count, that climbs: a function of rising risk concentration as procurement-volume growth slowed. The verdict the column delivers is the same regardless of how it is sliced. Every administration since Fox scored riskier than its predecessor, and the trend line points in only one direction.',
        ],
        prose_es: [
          'Tratar el conjunto de datos como cinco cuentas selladas obliga al auditor a calibrar primero su instrumento antes de leer los números. El modelo de riesgo v0.8.5 de RUBLI (AUC de prueba 0.785) no fue calibrado para ninguna administración en particular. Fue entrenado en 1,427 casos documentados de corrupción que abarcan múltiples presidencias, y evalúa cada contrato por su semejanza estructural con patrones conocidos de corrupción: concentración de proveedores, volatilidad de precios, condiciones de postor único, membresía en redes, diversidad institucional y mecanismo de contratación. No tiene lealtad partidista ni conocimiento político. Es el auditor políticamente ciego. Solo ve patrones.',
          'Al asentar las cinco columnas en secuencia, de menor a mayor, el libro mayor se lee solo. Bajo Fox (2001-2006), la tasa de alto riesgo fue de 7.50 por ciento en 206,333 contratos, de los cuales 15,479 quedaron marcados. Bajo Calderón (2007-2012), alcanzó el 8.15 por ciento en 481,450 contratos, 39,238 marcados. Bajo Peña Nieto (2013-2018), subió al 11.18 por ciento en 1,228,625 contratos, 137,358 marcados. Bajo AMLO (2019-2024), llegó al 12.62 por ciento en 1,043,097 contratos, 131,640 marcados — la línea más alta en 23 años de datos. Tasas titulares redondeadas: Fox 7.5, Calderón 8.2, Peña Nieto 11.2, AMLO 12.6.',
          'Cada cuenta lleva su propia nota de auditoría, y una lectura justa las asienta sexenio por sexenio. Fox gobernó con cobertura de Estructura A (2001-2006), por lo que el 7.5 por ciento se lee como un piso: el conjunto de datos sub-reporta el período y la tasa real es probablemente mayor. El 8.2 por ciento de Calderón se ubica dentro del parámetro 2-15 por ciento de la OCDE, la frontera que el Reporte de Desempeño de Contratación Pública 2023 traza alrededor de los sistemas aceptables. El 11.2 por ciento de Peña Nieto cruza hacia territorio preocupante. El 12.6 por ciento de AMLO rompe el récord del libro — y se ubica 5.1 puntos porcentuales por encima de donde empezó la tendencia, una deriva ascendente sostenida a lo largo de 24 años de datos.',
          'Una línea de la columna se resiste a una lectura perezosa. AMLO marcó menos contratos en términos absolutos que Peña Nieto — 131,640 contra 137,358 — sobre un volumen total menor. Es la tasa, no el conteo, lo que sube: una función de la creciente concentración del riesgo a medida que el crecimiento del volumen de contratación se desaceleró. El veredicto que entrega la columna es el mismo sin importar cómo se corte. Cada administración desde Fox calificó más riesgosa que la anterior, y la tendencia apunta en una sola dirección.',
        ],
        pullquote: {
          quote:
            'Every Mexican administration since Fox scored riskier than its predecessor. Fox 7.5% → Calderón 8.2% → Peña Nieto 11.2% → AMLO 12.6%. The column climbs in one direction only.',
          quote_es:
            'Cada administración mexicana desde Fox calificó más riesgosa que la anterior. Fox 7.5% → Calderón 8.2% → Peña Nieto 11.2% → AMLO 12.6%. La columna sube en una sola dirección.',
          stat: '12.6%',
          statLabel: 'AMLO-account high-risk rate (v0.8.5) — highest in 23 years',
          statLabel_es: 'tasa de alto riesgo, cuenta AMLO (v0.8.5) — la más alta en 23 años',
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
        title: "The Largest Entry: AMLO's Books, Reorganized",
        title_es: 'La partida mayor: los libros de AMLO, reorganizados',
        subtitle: 'Where every peso moved between sectors',
        subtitle_es: 'A dónde se movió cada peso entre sectores',
        prose: [
          "The record column has a single most consequential line-item behind it, and reading it dispels the simplest explanation. The books were not cut. They were reorganized. Against a total of 2.76 trillion pesos in federal procurement, AMLO did not spend less than his predecessors; he spent differently. Set the sector ledger beside Peña Nieto's account as debits and credits and the entry resolves into a shape no campaign rhetoric prepared the public for: three lines expanded sharply, three collapsed, one grew by half while concentrating in fewer hands.",
          'Now balance the ledger with the credits that fell. Infraestructura dropped 65 percent, from 937.1 billion under Peña to 326.4 billion under AMLO. Energía fell 88 percent, from 435.2 billion to 50.1 billion, as Pemex and CFE pulled work in-house. Educación fell 26 percent and Medio Ambiente 31 percent. The pesos that civilian agencies stopped spending on roads, water, energy, schools, and the environment did not vanish from the federal ledger. They reappeared as Defensa (+186%), Hacienda (+70%, from 231.1B to 392.9B), Gobernación (+100%, from 95.2B to 190.4B), and Agricultura (+36%, from 122.2B to 166.2B).',
          'The entry closes on Salud, up 47 percent — from 816 billion to 1,201.4 billion pesos. The growth was not in clinics, equipment, or personnel; it was pharmaceutical centralization through INSABI, BIRMEX, and ultimately IMSS-Bienestar. The single largest spend category under AMLO is "Medicamentos y Farmacéuticos" at 327.6 billion pesos with a 22.4 percent high-risk rate. The second-largest, "Construcción de Edificios" at 269.4 billion, captures the military-construction surge. Both lines hand directly to the next entry, where the hottest readings live.',
        ],
        prose_es: [
          'La columna récord tiene detrás una sola partida de mayor consecuencia, y leerla disipa la explicación más simple. Los libros no se recortaron. Se reorganizaron. Frente a un total de 2.76 billones de pesos en contratación federal, AMLO no gastó menos que sus predecesores; gastó de manera diferente. Al colocar el libro sectorial junto a la cuenta de Peña Nieto como cargos y abonos, la partida se resuelve en una forma que ninguna retórica de campaña preparó al público para esperar: tres líneas se expandieron bruscamente, tres colapsaron, y una creció a la mitad mientras se concentraba en menos manos.',
          'Ahora se equilibra el libro con los abonos que cayeron. Infraestructura bajó 65 por ciento, de 937.1 mil millones bajo Peña a 326.4 mil millones bajo AMLO. Energía cayó 88 por ciento, de 435.2 mil millones a 50.1 mil millones, cuando Pemex y CFE internalizaron el trabajo. Educación cayó 26 por ciento y Medio Ambiente 31 por ciento. Los pesos que las dependencias civiles dejaron de gastar en carreteras, agua, energía, escuelas y medio ambiente no desaparecieron del presupuesto federal. Reaparecieron como Defensa (+186%), Hacienda (+70%, de 231.1 mil millones a 392.9 mil millones), Gobernación (+100%, de 95.2 mil millones a 190.4 mil millones) y Agricultura (+36%, de 122.2 mil millones a 166.2 mil millones).',
          'La partida cierra en Salud, con un alza del 47 por ciento — de 816 mil millones a 1,201.4 mil millones de pesos. El crecimiento no fue en clínicas, equipos ni personal; fue centralización farmacéutica a través del INSABI, BIRMEX y, finalmente, IMSS-Bienestar. La categoría de mayor gasto individual bajo AMLO es "Medicamentos y Farmacéuticos" con 327.6 mil millones de pesos y una tasa de alto riesgo del 22.4 por ciento. La segunda, "Construcción de Edificios" con 269.4 mil millones, captura el auge de la construcción militar. Ambas líneas conectan directamente con la siguiente partida, donde viven las lecturas más calientes.',
        ],
        chartConfig: {
          type: 'inline-stacked-bar',
          title: 'The Reorganized Ledger: Sector Spend, AMLO (2019-24) vs Peña Nieto (2013-18)',
          title_es:
            'El libro reorganizado: gasto sectorial, AMLO (2019-24) vs Peña Nieto (2013-18)',
          chartId: 'amlo-vs-pena-sectors',
          stacked: {
            rows: [
              {
                label: 'Salud',
                label_en: 'Health',
                total: 1201.4,
                highlight: 1201.4,
                compareTotal: 816,
                sectorCode: 'salud',
                annotation: '+47% vs Peña',
                annotation_es: '+47% vs Peña',
              },
              {
                label: 'Infraestructura',
                label_en: 'Infrastructure',
                total: 326.4,
                highlight: 326.4,
                compareTotal: 937.1,
                sectorCode: 'infraestructura',
                annotation: '−65% vs Peña',
                annotation_es: '−65% vs Peña',
              },
              {
                label: 'Hacienda',
                label_en: 'Treasury',
                total: 392.9,
                highlight: 392.9,
                compareTotal: 231.1,
                sectorCode: 'hacienda',
                annotation: '+70% vs Peña',
                annotation_es: '+70% vs Peña',
              },
              {
                label: 'Defensa',
                label_en: 'Defense',
                total: 168.9,
                highlight: 168.9,
                compareTotal: 59.2,
                sectorCode: 'defensa',
                annotation: '+186% vs Peña',
                annotation_es: '+186% vs Peña',
              },
              {
                label: 'Gobernación',
                label_en: 'Governance',
                total: 190.4,
                highlight: 190.4,
                compareTotal: 95.2,
                sectorCode: 'gobernacion',
                annotation: '+100% vs Peña',
                annotation_es: '+100% vs Peña',
              },
              {
                label: 'Agricultura',
                label_en: 'Agriculture',
                total: 166.2,
                highlight: 166.2,
                compareTotal: 122.2,
                sectorCode: 'agricultura',
                annotation: '+36% vs Peña',
                annotation_es: '+36% vs Peña',
              },
              {
                label: 'Educación',
                label_en: 'Education',
                total: 114.9,
                highlight: 114.9,
                compareTotal: 155.3,
                sectorCode: 'educacion',
                annotation: '−26% vs Peña',
                annotation_es: '−26% vs Peña',
              },
              {
                label: 'Medio Ambiente',
                label_en: 'Environment',
                total: 94.2,
                highlight: 94.2,
                compareTotal: 136.5,
                sectorCode: 'ambiente',
                annotation: '−31% vs Peña',
                annotation_es: '−31% vs Peña',
              },
              {
                label: 'Energía',
                label_en: 'Energy',
                total: 50.1,
                highlight: 50.1,
                compareTotal: 435.2,
                sectorCode: 'energia',
                annotation: '−88% vs Peña',
                annotation_es: '−88% vs Peña',
              },
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
            annotation:
              'Left bar = Peña Nieto-era spend (2013-18, muted). Right bar = AMLO-era spend (2019-24, sector palette). Identical scale. Total 2.76T MXN; 9 sectors shown sum to 2.70T — the remaining 60B is Tecnología, Trabajo, and Otros (small individually, excluded for legibility). The shape of Mexican federal spending changed direction across this transition.',
            annotation_es:
              'Barra izquierda = gasto del sexenio Peña Nieto (2013-18, atenuado). Barra derecha = gasto del sexenio AMLO (2019-24, paleta sectorial). Misma escala. Total 2.76T MXN; los 9 sectores mostrados suman 2.70T — los 60B restantes son Tecnología, Trabajo y Otros (individualmente pequeños, excluidos por legibilidad). La forma del gasto federal mexicano cambió de dirección en esta transición.',
            highlightColor: '#a06820',
            highlightLabel: 'AMLO-era spend',
            highlightLabel_es: 'gasto sexenio AMLO',
            baseLabel: 'Peña-era spend',
            baseLabel_es: 'gasto Peña Nieto',
          },
        },
        pullquote: {
          quote:
            'AMLO did not spend less. He spent differently. Defense tripled. Civilian infrastructure collapsed by 65 percent. The pesos did not vanish; they reorganized — and the army absorbed the civilian ledger.',
          quote_es:
            'AMLO no gastó menos. Gastó distinto. La defensa se triplicó. La infraestructura civil se desplomó 65 por ciento. Los pesos no desaparecieron; se reorganizaron — y el ejército absorbió el libro civil.',
          stat: '+186%',
          statLabel: 'Defensa procurement growth, AMLO vs Peña',
          statLabel_es: 'Crecimiento de contratación en Defensa, AMLO vs Peña',
          barValue: 0.93,
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
        title: "The Army's Monotonic Climb",
        title_es: 'El ascenso monótono del ejército',
        subtitle: 'How national-security cover moved civilian works to SEDENA',
        subtitle_es: 'Cómo la cobertura de seguridad nacional trasladó la obra civil a la SEDENA',
        prose: [
          'The largest debit is Defensa, up 186 percent. Federal contracting routed through SEDENA grew from 59.2 billion pesos under Peña Nieto to 168.9 billion under AMLO. It is not a story of weapons modernization; it is a story of mission expansion. The same six years saw SEDENA take operational control over civilian airport construction (AIFA), tourist rail infrastructure (Tren Maya), customs administration, social-program logistics, and a portfolio of public works that previous administrations contracted through SCT and CONAGUA.',
          'The annual series shows the takeover was monotonic, not episodic. In 2018, the last year of Peña Nieto, SEDENA contracted 9.94 billion pesos — 2.2 percent of all federal spending. By 2024 it contracted 22.43 billion — 5.4 percent of all federal spending, 2.5 times its pre-AMLO floor and 5 times its 2015 share. Not a single year of the AMLO administration saw SEDENA contracting fall below its 2018 level. Over the eleven-year window SEDENA contracted 135.9 billion pesos in total; the 2025 partial figure of 12.06 billion reflects only the first months of that year and is not yet directly comparable.',
          "The mechanism was legal, and it was applied harder than ever before. A series of presidential decrees beginning in 2019 reclassified increasingly broad categories of public works as matters of national security, moving their contracting authority from civilian agencies to SEDENA. Articles 41 and 42 of the Ley de Adquisiciones, in combination with Article 32 of the Ley de Obras Públicas, permit the executive to designate national-security exceptions to competitive bidding. AMLO's administration invoked that exception more aggressively than any prior term in the dataset.",
          'The reclassification carried a visibility cost. The contracts surface in COMPRANET only in fragmented form: the 465 contracts whose titles explicitly mention "Tren Maya" total 125.3 billion pesos, yet reporting and Auditoría Superior de la Federación findings indicate the project\'s real budget exceeded 500 billion, most of it executed through SEDENA-controlled trust funds (FONATUR/Tren Maya/SEDENA-Bienestar) that publish less granular data than civilian COMPRANET. Reporting in 2023 by Animal Político, MCCI (Mexicanos Contra la Corrupción y la Impunidad), and Aristegui Noticias alleged that contractors on Tren Maya and AIFA were required to channel a percentage of contract value through designated intermediary firms — a pattern that, if substantiated, fits RUBLI\'s P3 (intermediary capture) signature precisely. RUBLI cannot independently verify those allegations from procurement data alone, but the structural conditions match: concentrated awards, intermediary vendors, classified procurement, and limited public visibility.',
        ],
        prose_es: [
          'El cargo mayor es Defensa, con un alza del 186 por ciento. La contratación federal canalizada a través de la SEDENA creció de 59.2 mil millones de pesos bajo Peña Nieto a 168.9 mil millones bajo AMLO. No es una historia de modernización armamentista; es una historia de expansión de misión. Esos mismos seis años vieron a la SEDENA tomar control operativo de la construcción del aeropuerto civil (AIFA), infraestructura ferroviaria turística (Tren Maya), administración aduanera, logística de programas sociales y una cartera de obras públicas que administraciones anteriores contrataban a través de la SCT y la CONAGUA.',
          'La serie anual muestra que la toma de control fue monótona, no episódica. En 2018, el último año de Peña Nieto, la SEDENA contrató 9.94 mil millones de pesos — el 2.2 por ciento de todo el gasto federal. Para 2024 contrató 22.43 mil millones — el 5.4 por ciento de todo el gasto federal, 2.5 veces su piso previo a AMLO y 5 veces su participación de 2015. Ni un solo año de la administración AMLO vio caer la contratación de la SEDENA por debajo de su nivel de 2018. En la ventana de once años la SEDENA contrató 135.9 mil millones de pesos en total; la cifra parcial de 2025 de 12.06 mil millones refleja solo los primeros meses de ese año y aún no es directamente comparable.',
          'El mecanismo fue legal, y se aplicó con más fuerza que nunca. Una serie de decretos presidenciales a partir de 2019 reclasificó categorías cada vez más amplias de obras públicas como asuntos de seguridad nacional, transfiriendo su autoridad de contratación de dependencias civiles a la SEDENA. Los Artículos 41 y 42 de la Ley de Adquisiciones, en combinación con el Artículo 32 de la Ley de Obras Públicas, permiten al ejecutivo designar excepciones de seguridad nacional a la licitación competitiva. La administración de AMLO invocó esa excepción de manera más agresiva que cualquier sexenio anterior en el conjunto de datos.',
          'La reclasificación tuvo un costo de visibilidad. Los contratos aparecen en el COMPRANET solo de forma fragmentada: los 465 contratos cuyos títulos mencionan explícitamente "Tren Maya" suman 125.3 mil millones de pesos, pero los reportajes y los hallazgos de la Auditoría Superior de la Federación indican que el presupuesto real del proyecto superó los 500 mil millones, en su mayoría ejecutado a través de fideicomisos controlados por la SEDENA (FONATUR/Tren Maya/SEDENA-Bienestar) que publican datos menos granulares que el COMPRANET civil. Reportajes de 2023 de Animal Político, MCCI (Mexicanos Contra la Corrupción y la Impunidad) y Aristegui Noticias alegaron que a los contratistas del Tren Maya y el AIFA se les exigía canalizar un porcentaje del valor del contrato a través de empresas intermediarias designadas — un patrón que, de comprobarse, encaja con precisión con la firma P3 (captura de intermediario) de RUBLI. RUBLI no puede verificar de forma independiente esas alegaciones a partir de los datos de contratación, pero las condiciones estructurales coinciden: adjudicaciones concentradas, proveedores intermediarios, contratación clasificada y visibilidad pública limitada.',
        ],
        chartConfig: {
          type: 'inline-multi-line',
          title: 'SEDENA Annual Federal Contracting, 2015-2025',
          title_es: 'Contratación federal anual de SEDENA, 2015-2025',
          multiSeries: {
            xLabels: [
              '2015',
              '2016',
              '2017',
              '2018',
              '2019',
              '2020',
              '2021',
              '2022',
              '2023',
              '2024',
              '2025',
            ],
            unit: 'B MXN',
            yLabel: 'Annual SEDENA contracting',
            yLabel_es: 'Contratación anual de SEDENA',
            series: [
              {
                name: 'SEDENA',
                name_es: 'SEDENA',
                color: '#1e3a5f',
                values: [5.78, 5.99, 4.83, 9.94, 9.69, 15.18, 18.02, 12.49, 19.55, 22.43, 12.06],
                annotation: {
                  xIndex: 9,
                  text: '22.43B (5.4% of fed)',
                  text_es: '22.43B (5.4% de fed)',
                },
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
            annotation:
              'Pre-AMLO (2015-2018), SEDENA contracted 4.8-9.9B/year — roughly 1-2% of federal procurement. Under AMLO (2019-2024), it climbed to 22.4B annually and 5.4% of federal procurement, monotonically. The 2025 partial figure (12.06B) represents only the first months of the year and is not yet directly comparable.',
            annotation_es:
              'Pre-AMLO (2015-2018), SEDENA contrataba 4.8-9.9 mil millones/año — aproximadamente 1-2% de la contratación federal. Bajo AMLO (2019-2024), subió monotónicamente a 22.4 mil millones anuales y 5.4% de la contratación federal. La cifra parcial de 2025 (12.06 mil millones) representa solo los primeros meses del año y aún no es directamente comparable.',
          },
        },
        pullquote: {
          quote:
            "SEDENA contracted 9.94 billion pesos in 2018 and 22.43 billion in 2024. Every year of the AMLO sexenio expanded the army's procurement footprint.",
          quote_es:
            'La SEDENA contrató 9.94 mil millones de pesos en 2018 y 22.43 mil millones en 2024. Cada año del sexenio AMLO expandió la huella de contratación del ejército.',
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
        title: 'Reading the Hot Lines',
        title_es: 'Leer las partidas calientes',
        subtitle:
          'The category entries where the risk indicator runs hottest — and who occupies them',
        subtitle_es:
          'Las partidas donde el indicador de riesgo corre más caliente — y quién las ocupa',
        prose: [
          "An auditor does not stop at the term total. The 12.6 percent is an average, and an average conceals an uneven distribution. Drill from the column into the line items and the picture splits in two: some AMLO categories ran near the OECD acceptable range; others ran two to three times the national average. The hottest lines map directly onto the administration's signature policy choices. Eight categories measured against the OECD 15 percent ceiling tell the story, and three breach it.",
          'The top line is Alimentos y Víveres — food and provisions — at a 32.4 percent high-risk rate across 224.9 billion pesos of AMLO-era contracting. That is 17.4 percentage points above the OECD ceiling, the highest of any major AMLO category. It is the line that contains the Segalmex network: 1,258 contracts at a 1.000 risk score, already documented as the largest financial-corruption case in MORENA-government history. Yet Segalmex accounts for only a fraction of the at-risk pesos on this line. The pattern extends into welfare-card vendors, military food-distribution contractors, and rural supply chains operating under the same concentration conditions.',
          'Below it sit two health lines. Medicamentos y Farmacéuticos at 22.4 percent — 7.4 points above the ceiling — reflects the IMSS pharmaceutical-cartel pattern documented in The Invisible Monopoly. Servicios Hospitalarios at 19.4 percent — 4.4 points above — is the same IMSS architecture extended to outsourced clinical services. The other measured lines run cooler: Servicios Generales 14.3 percent, Carreteras 12.2, Material de Curación 12.1, Mantenimiento 9.4, Construcción de Edificios 8.5, all against the 15.0 ceiling. The last reading carries a discipline note. Construcción de Edificios looks low only because the highest-risk military construction bypasses civilian COMPRANET — the 8.5 percent is biased downward, not clean.',
          'Name the vendor who anchors the welfare line. TOKA Internacional — a single voucher company — collected 40.6 billion pesos under AMLO at a 0.78 risk score, with 897 contracts and 25 billion at 0.916 risk. It is the largest individual vendor of the AMLO era after the pharmaceutical and Tren Maya clusters. Edenred, Sodexo, and the family of payment-card operators that captured Mexican welfare-program logistics occupy a position structurally identical to the IMSS pharmaceutical cartel: a small set of vendors, critical-tier risk indicators, dominant institutional shares, and legal authority for direct adjudication built into the program design. The line is hot because the program was built that way.',
        ],
        prose_es: [
          'Un auditor no se detiene en el total del sexenio. El 12.6 por ciento es un promedio, y un promedio oculta una distribución desigual. Al pasar de la columna a las partidas, el panorama se parte en dos: algunas categorías de AMLO operaron cerca del rango aceptable de la OCDE; otras registraron niveles dos o tres veces superiores al promedio nacional. Las líneas más calientes apuntan directamente a las decisiones de política distintivas de la administración. Ocho categorías medidas contra el techo del 15 por ciento de la OCDE cuentan la historia, y tres lo rebasan.',
          'La línea superior es Alimentos y Víveres — alimentos y abarrotes — con una tasa de alto riesgo del 32.4 por ciento en 224.9 mil millones de pesos de contratación en la era AMLO. Eso es 17.4 puntos porcentuales por encima del techo de la OCDE, la más alta de cualquier categoría AMLO importante. Es la línea que contiene la red de Segalmex: 1,258 contratos con puntuación de riesgo 1.000, ya documentada como el mayor caso de corrupción financiera en la historia del gobierno de MORENA. Sin embargo, Segalmex representa solo una fracción de los pesos en riesgo de esta línea. El patrón se extiende hacia proveedores de tarjetas de bienestar, contratistas de distribución de alimentos militar y cadenas de suministro rural que operan bajo las mismas condiciones de concentración.',
          'Debajo se ubican dos líneas de salud. Medicamentos y Farmacéuticos con 22.4 por ciento — 7.4 puntos por encima del techo — refleja el patrón del cártel farmacéutico del IMSS documentado en El Monopolio Invisible. Servicios Hospitalarios con 19.4 por ciento — 4.4 puntos por encima — es la misma arquitectura del IMSS extendida a servicios clínicos externalizados. Las demás líneas medidas corren más frías: Servicios Generales 14.3 por ciento, Carreteras 12.2, Material de Curación 12.1, Mantenimiento 9.4, Construcción de Edificios 8.5, todas contra el techo de 15.0. Esta última lectura lleva una nota de cautela. Construcción de Edificios parece baja solo porque la construcción militar de mayor riesgo elude el COMPRANET civil — el 8.5 por ciento está sesgado a la baja, no limpio.',
          'Hay que nombrar al proveedor que ancla la línea del bienestar. TOKA Internacional — una sola empresa de vales — recaudó 40.6 mil millones de pesos bajo AMLO con una puntuación de riesgo de 0.78, con 897 contratos y 25 mil millones con riesgo 0.916. Es el proveedor individual más grande de la era AMLO después de los clusters farmacéuticos y del Tren Maya. Edenred, Sodexo y la familia de operadores de tarjetas de pago que capturaron la logística de los programas de bienestar mexicanos ocupan una posición estructuralmente idéntica al cártel farmacéutico del IMSS: un pequeño conjunto de proveedores, indicadores de riesgo de nivel crítico, cuotas institucionales dominantes y autoridad legal para adjudicación directa integrada en el diseño del programa. La línea está caliente porque el programa se construyó así.',
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'The Hot Lines: AMLO-Era High-Risk Rate vs OECD 15% Ceiling, by Category',
          title_es:
            'Las partidas calientes: tasa de alto riesgo AMLO vs techo OCDE 15%, por categoría',
          chartId: 'amlo-categories-risk',
          data: {
            mode: 'excess',
            points: [
              {
                label: 'Alimentos y Víveres',
                label_en: 'Food & Provisions',
                value: 32.4,
                value2: 15,
                highlight: true,
              },
              {
                label: 'Medicamentos',
                label_en: 'Pharmaceuticals',
                value: 22.4,
                value2: 15,
                highlight: true,
              },
              {
                label: 'Servicios Hospitalarios',
                label_en: 'Hospital Services',
                value: 19.4,
                value2: 15,
                highlight: true,
              },
              {
                label: 'Servicios Generales',
                label_en: 'General Services',
                value: 14.3,
                value2: 15,
              },
              {
                label: 'Carreteras',
                label_en: 'Highways',
                value: 12.2,
                value2: 15,
              },
              {
                label: 'Material de Curación',
                label_en: 'Medical Supplies',
                value: 12.1,
                value2: 15,
              },
              {
                label: 'Mantenimiento',
                label_en: 'Maintenance',
                value: 9.4,
                value2: 15,
              },
              {
                label: 'Construcción de Edificios',
                label_en: 'Building Construction',
                value: 8.5,
                value2: 15,
              },
            ],
            unit: '%',
            yLabel: 'Excess above OECD 15% ceiling · positive = breach, negative = below',
            yLabel_es: 'Exceso sobre techo OCDE 15% · positivo = rebasa, negativo = debajo',
            annotation:
              'Bar = AMLO-era high-risk rate minus the OECD 15% upper ceiling for procurement (2023 Public Procurement Performance Report). Three categories breach: Food & Provisions (+17.4 pp), Pharmaceuticals (+7.4 pp), Hospital Services (+4.4 pp). The chapter pullquote uses the same OECD reference.',
            annotation_es:
              'Barra = tasa de alto riesgo AMLO menos el techo superior OCDE 15% para contratación (Reporte de Desempeño 2023). Tres categorías rebasan: Alimentos y Víveres (+17.4 pp), Medicamentos (+7.4 pp), Servicios Hospitalarios (+4.4 pp). El recuadro destacado usa la misma referencia OCDE.',
          },
        },
        pullquote: {
          quote:
            'Food procurement under AMLO ran at a 32.4 percent high-risk rate. Pharmaceuticals at 22.4. Hospital services at 19.4. The lines with the loudest political claims around them are the lines the model reads hottest.',
          quote_es:
            'Las compras de alimentos bajo AMLO operaron con tasa de alto riesgo de 32.4 por ciento. Farmacéuticos 22.4. Servicios hospitalarios 19.4. Las líneas con los reclamos políticos más fuertes son las que el modelo lee con mayor intensidad.',
          stat: '32.4%',
          statLabel: 'high-risk rate, "Alimentos y Víveres" — highest of any major AMLO category',
          statLabel_es:
            'tasa de alto riesgo, "Alimentos y Víveres" — la más alta de cualquier categoría AMLO',
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
        title: 'The Account Still Open',
        title_es: 'La cuenta aún abierta',
        subtitle: "Sheinbaum's partial books — and the liabilities carried forward",
        subtitle_es: 'Los libros parciales de Sheinbaum — y los pasivos heredados',
        prose: [
          'The fifth column is still being written. President Sheinbaum took office in October 2024, and RUBLI holds 92,631 contracts from her administration to date at an approximate 12.9 percent high-risk rate — below the AMLO peak but above the Calderón baseline. It is too early for a firm trajectory. But the architecture she is consolidating is inherited, not freely chosen, and an auditor closing the comparative reckoning lists the carried-forward liabilities the way unamortized obligations appear on a balance sheet.',
          'The first liability is pharmaceutical: procurement now centralized under IMSS-Bienestar, where the 2025 consolidated medicine tender awarded 19.46 billion pesos to PISA in a single year — the case documented in The Invisible Monopoly. The second is welfare logistics, routed through a few voucher operators; TOKA alone captures 0.78-risk contracts at billion-peso scale. The third is civilian infrastructure, functionally absorbed by SEDENA under national-security cover that protects the contracts from competitive scrutiny. The fourth is food procurement, running at 32.4 percent against the OECD 15 ceiling. Each is a structural condition that will keep producing risky contracts under any administration that does not deliberately dismantle it.',
          "The hardest line on the inherited balance sheet is AMLO's 79.4 percent direct-award rate — 1,063 of 2,758 billion pesos awarded without competition over six years. It is not a number that bends easily. The procurement officials who learned to work that way did not retire on October 1, 2024. The vendors who built businesses around AMLO-era programs did not pivot to new customers. The legal authorities — Articles 41 and 42, the national-security exceptions — remain on the books, ready to be invoked. Sheinbaum's 12.9 percent reads partly as her own choices and partly as inertia from what came before.",
          "The reckoning closes on the institutional argument that runs underneath all five columns. The OECD's 2023 Mexico Procurement Review, in Recommendation 7, urged building real-time analytical capacity into the oversight system. RUBLI is a working version of that recommendation: ASF audits the previous fiscal year each spring, while RUBLI's pipeline updates monthly. The gap between real-time visibility and formal accountability is what RUBLI closes. Whether the fifth term operationalizes that visibility — or becomes the fifth administration to promise procurement transparency while direct-award dependency climbs — is a verdict the open account will return one quarter at a time.",
        ],
        prose_es: [
          'La quinta columna aún se está escribiendo. La presidenta Sheinbaum tomó posesión en octubre de 2024, y RUBLI tiene 92,631 contratos de su administración hasta la fecha con una tasa de alto riesgo de aproximadamente 12.9 por ciento — por debajo del pico de AMLO pero por encima de la línea base de Calderón. Es demasiado pronto para una trayectoria firme. Pero la arquitectura que está consolidando es heredada, no elegida libremente, y un auditor que cierra el balance comparativo enumera los pasivos heredados como aparecen las obligaciones no amortizadas en una hoja de balance.',
          'El primer pasivo es farmacéutico: la contratación ahora centralizada bajo IMSS-Bienestar, donde la licitación de medicamentos consolidada de 2025 adjudicó 19.46 mil millones de pesos a PISA en un solo año — el caso documentado en El Monopolio Invisible. El segundo es la logística de bienestar, canalizada a través de unos pocos operadores de vales; solo TOKA captura contratos de riesgo 0.78 a escala de miles de millones de pesos. El tercero es la infraestructura civil, funcionalmente absorbida por la SEDENA bajo cobertura de seguridad nacional que protege los contratos del escrutinio competitivo. El cuarto es la contratación de alimentos, que opera con tasa del 32.4 por ciento frente al techo de la OCDE de 15. Cada uno es una condición estructural que seguirá produciendo contratos riesgosos bajo cualquier administración que no la desmantele deliberadamente.',
          'La línea más dura de la hoja de balance heredada es la tasa de adjudicación directa del 79.4 por ciento de AMLO — 1,063 de 2,758 mil millones de pesos adjudicados sin competencia durante seis años. No es un número que se dobla fácilmente. Los funcionarios de contratación que aprendieron a trabajar de esa manera no se jubilaron el 1 de octubre de 2024. Los proveedores que construyeron negocios alrededor de los programas de la era AMLO no migraron a nuevos clientes. Las autoridades legales — los Artículos 41 y 42, las excepciones de seguridad nacional — permanecen en los libros, listas para ser invocadas. El 12.9 por ciento de Sheinbaum se lee en parte como sus propias decisiones y en parte como inercia de lo que vino antes.',
          'El balance cierra con el argumento institucional que corre por debajo de las cinco columnas. La Revisión de Adquisiciones de México de la OCDE de 2023, en su Recomendación 7, urgió construir capacidad analítica en tiempo real en el sistema de supervisión. RUBLI es una versión funcional de esa recomendación: la ASF audita el año fiscal anterior cada primavera, mientras que el pipeline de RUBLI se actualiza mensualmente. La brecha entre la visibilidad en tiempo real y la rendición de cuentas formal es lo que RUBLI cierra. Si el quinto sexenio operacionaliza esa visibilidad — o se convierte en la quinta administración en prometer transparencia en las contrataciones mientras la dependencia de la adjudicación directa sigue creciendo — es un veredicto que la cuenta abierta devolverá trimestre a trimestre.',
        ],
        pullquote: {
          quote:
            'AMLO awarded 1,063 of 2,758 billion pesos without competition — a 79.4 percent direct-award rate. The officials, the vendors, and the legal exceptions all carried over October 1, 2024. The hardest line on the inherited balance sheet does not bend easily.',
          quote_es:
            'AMLO adjudicó 1,063 de 2,758 mil millones de pesos sin competencia — una tasa de adjudicación directa del 79.4 por ciento. Los funcionarios, los proveedores y las excepciones legales se heredaron todos el 1 de octubre de 2024. La línea más dura de la hoja de balance heredada no se dobla fácilmente.',
          stat: '79.4%',
          statLabel: 'AMLO direct-award rate — the liability carried into the open account',
          statLabel_es:
            'tasa de adjudicación directa AMLO — el pasivo heredado a la cuenta abierta',
          barValue: 0.794,
          barLabel: '1,063 of 2,758 billion pesos awarded without competition',
          barLabel_es: '1,063 de 2,758 mil millones de pesos adjudicados sin competencia',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI Sheinbaum-era contract analysis (contract_year=2025, partial). April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 7.',
          'RUBLI direct-award rate aggregation, AMLO-era contracts 2019-2024. April 2026.',
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
      "Analyze BIRMEX and INSABI contracts 2019-2022 for vendor overlap with RUBLI's P1 and P6 pattern vendors.",
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
      {
        type: 'vendor',
        id: 102627,
        name: 'TOKA Internacional',
        riskScore: 0.988,
        ariaTier: 1,
        role: 'Welfare-voucher dominant vendor',
        role_es: 'Proveedor dominante de vales del bienestar',
      },
      {
        type: 'vendor',
        id: 36961,
        name: 'Operadora CICSA',
        riskScore: 0.641,
        ariaTier: 2,
        role: 'Tren Maya contractor · 139.0B MXN',
        role_es: 'Contratista Tren Maya · 139.0 MDP',
      },
      {
        type: 'vendor',
        id: 8143,
        name: 'Dowell Schlumberger',
        riskScore: 0.971,
        ariaTier: 1,
        role: 'Pemex contractor · risk 0.97',
        role_es: 'Contratista Pemex · riesgo 0.97',
      },
      {
        type: 'vendor',
        id: 139711,
        name: 'Alstom Transport Mexico',
        riskScore: 1,
        ariaTier: 1,
        role: 'Tren Maya contractor · risk 1.00',
        role_es: 'Contratista Tren Maya · riesgo 1.00',
      },
      {
        type: 'vendor',
        id: 28111,
        name: 'Constructora Arhnos',
        riskScore: 0.516,
        ariaTier: 2,
        role: 'Military construction operator',
        role_es: 'Operador de construcción militar',
      },
    ],
  },

  // === STORY 8: Follow the Middleman ===
  {
    slug: 'la-industria-del-intermediario',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'Follow the Middleman',
    headline_es: 'Sigan al Intermediario',
    subheadline:
      "A peso of public money leaves the federal treasury and meets a company that builds nothing, ships nothing, and produces only a contract. RUBLI's P3 algorithm flags 2,974 vendors whose footprint matches this pass-through signature. Trace one flow and you find an industry: 526.8 billion pesos across eight sectors, 179.5 billion in infrastructure alone.",
    subheadline_es:
      'Un peso de dinero público sale de la Tesorería federal y se topa con una empresa que no construye nada, no entrega nada y solo produce un contrato. El algoritmo P3 de RUBLI marca 2,974 proveedores cuya huella coincide con esta firma de paso. Sigan un solo flujo y encontrarán una industria: 526.8 mil millones de pesos en ocho sectores, 179.5 mil millones solo en infraestructura.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 14,
    status: 'solo_datos',
    leadStat: {
      value: '2,974',
      label: 'vendors matching the P3 pass-through signature',
      label_es: 'proveedores que coinciden con la firma de paso P3',
      sublabel: '526.8B MXN routed across 8 key sectors',
      sublabel_es: '526.8 mil millones canalizados en 8 sectores clave',
      color: '#8b5cf6',
    },
    kickerStats: [
      {
        value: '2,974',
        suffix: 'pass-through-pattern vendors',
        suffix_es: 'proveedores con patrón de paso',
        tone: 'data',
      },
      {
        value: '526.8B',
        suffix: 'MXN routed through brokers, 8 sectors',
        suffix_es: 'MXN canalizados por intermediarios, 8 sectores',
        tone: 'critical',
      },
      {
        value: '0',
        suffix: 'COFECE procurement cartel cases, 5 yrs',
        suffix_es: 'casos COFECE de cártel de compras, 5 años',
        tone: 'critical',
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'captura-institucional', 'el-umbral-de-los-300k'],
    caseIds: [],
    lensTags: {
      patterns: ['P3'],
      sectors: ['infraestructura', 'energia', 'salud'],
      terms: ['intermediario', 'La Estafa Maestra', 'subcontratación'],
    },
    entities: [],
    nextSteps: [
      'File UIF intelligence request for bank transaction data on the top 20 P3-classified vendors in infrastructure by contract value.',
      'Identify which public universities continue to be used as procurement intermediaries after La Estafa Maestra — cross-reference with COMPRANET university contracts 2018-2025.',
      'Request from SFP the complete list of vendors sanctioned for improper subcontracting and cross-reference with RUBLI P3 list.',
      "Research whether Mexico's 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.",
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
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Peso and the Broker',
        title_es: 'El peso y el intermediario',
        subtitle: 'What a middleman adds, and what it skims',
        subtitle_es: 'Qué agrega un intermediario y qué se queda',
        prose: [
          'Follow one peso. It leaves the federal treasury as a contract payment and lands in the account of a company. The company subcontracts the actual work — the road, the hospital wing, the oilfield service — to another firm at a lower price. The difference between what the government paid and what the subcontractor charged stays behind. That spread is the entire business. The company built nothing, shipped nothing, and produced only a contract.',
          'Not every middleman is a problem. In legitimate procurement an intermediary can add operational value: a distributor with established supply chains may deliver goods more cheaply than direct manufacturer sourcing; a general contractor coordinating dozens of specialized trades on a construction project provides project-management value a government unit cannot easily replicate internally. These are necessary functions. The fraud variant is narrower and harder to see. It occurs when the intermediary adds no operational value beyond the act of contracting, yet the government pays more than it would have paid the real delivery entity. The mechanism is subtle enough to survive a single-contract audit and persistent enough to run at scale across decades.',
          "RUBLI's Pattern 3 (P3) algorithm catches the broker mid-flow rather than after the fact. It reads three signals in a vendor's procurement footprint: an industry-code mismatch between the firm's declared economic activity and what its contracts actually require; rapid growth from a thin contracting history to a massive portfolio; and the financial signature of a pass-through entity — large contract values carried on minimal fixed assets. None of these proves fraud. Together they describe a shape: money entering, money leaving, and a firm in between that does not look built to do the work it is paid for.",
          'Widen the lens from one flow to the population and the shape repeats 2,974 times. The P3-classified vendors cluster in the highest-value procurement sectors, where the spread is worth the trouble. Infrastructure leads: 1,128 P3 vendors moved 179.5 billion pesos through intermediary structures in construction and public works. Energy is second: 463 P3 vendors in the PEMEX and CFE ecosystems account for 130.6 billion pesos. Health is third: 476 P3 vendors handled 104.2 billion pesos in pharmaceutical and medical-equipment procurement. Three sectors, 414 billion pesos — and the channels they run through are the subject of the next chapter.',
        ],
        prose_es: [
          'Sigan un peso. Sale de la Tesorería federal como pago de un contrato y aterriza en la cuenta de una empresa. La empresa subcontrata el trabajo real — el camino, el ala del hospital, el servicio petrolero — con otra firma a un precio menor. La diferencia entre lo que pagó el gobierno y lo que cobró el subcontratista se queda atrás. Esa diferencia es todo el negocio. La empresa no construyó nada, no entregó nada y solo produjo un contrato.',
          'No todo intermediario es un problema. En la contratación pública legítima un intermediario puede agregar valor operativo: un distribuidor con cadenas de suministro establecidas puede entregar bienes más baratos que la compra directa al fabricante; un contratista general que coordina decenas de oficios especializados en un proyecto de construcción provee un valor de gestión de proyecto que una unidad del gobierno no puede replicar internamente con facilidad. Son funciones necesarias. La variante de fraude es más estrecha y más difícil de ver. Ocurre cuando el intermediario no agrega valor operativo más allá del acto de contratar y, aun así, el gobierno paga más de lo que habría pagado a la entidad ejecutora real. El mecanismo es lo bastante sutil para sobrevivir a una auditoría contrato por contrato y lo bastante persistente para operar a escala durante décadas.',
          'El algoritmo del Patrón 3 (P3) de RUBLI atrapa al intermediario en pleno flujo en vez de hacerlo después. Lee tres señales en la huella de contratación de un proveedor: un desajuste entre el código de industria de la actividad económica declarada de la firma y lo que sus contratos realmente requieren; crecimiento rápido desde un historial delgado de contratación hacia un portafolio masivo; y la firma financiera de una entidad de paso — grandes valores de contrato sostenidos sobre activos fijos mínimos. Ninguna de estas señales prueba fraude. Juntas describen una forma: dinero que entra, dinero que sale y una firma en medio que no parece construida para hacer el trabajo por el que se le paga.',
          'Amplíen el lente de un flujo a la población y la forma se repite 2,974 veces. Los proveedores clasificados como P3 se agrupan en los sectores de contratación de mayor valor, donde la diferencia vale la pena. Infraestructura encabeza: 1,128 proveedores P3 movieron 179.5 mil millones de pesos por estructuras de intermediación en construcción y obra pública. Energía es segundo: 463 proveedores P3 en los ecosistemas de PEMEX y CFE acumulan 130.6 mil millones de pesos. Salud es tercero: 476 proveedores P3 manejaron 104.2 mil millones en adquisiciones farmacéuticas y de equipo médico. Tres sectores, 414 mil millones de pesos — y los canales por donde corren son el tema del próximo capítulo.',
        ],
        pullquote: {
          quote:
            'A peso enters, a peso leaves, and a firm in between produces only a contract. Repeat 2,974 times across three sectors and the spread is worth 414 billion pesos.',
          quote_es:
            'Entra un peso, sale un peso, y una firma en medio solo produce un contrato. Repítanlo 2,974 veces en tres sectores y la diferencia vale 414 mil millones de pesos.',
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
        title: 'The Channels the Money Runs Through',
        title_es: 'Los canales por donde corre el dinero',
        subtitle: 'Where the broker layer is thickest',
        subtitle_es: 'Dónde es más espesa la capa de intermediación',
        prose: [
          'The broker layer is not spread evenly across Mexican procurement. It pools where three currents meet: high contract value, technical complexity, and thin oversight. Where all three run together the layer is thickest, and the chart below ranks every channel by the peso volume the pattern moves through it — 526.8 billion in total.',
          "Infrastructure is the widest gate at 179.5 billion pesos. The money enters as civil works (roads, water projects, urban infrastructure), as construction services (demolition, earthworks, specialized trades), and as project-management intermediation. SCT / SICT and CONAGUA are the largest procuring entities, with regional infrastructure funds distributing significant additional contracting at state and municipal levels. Pemex's own infrastructure needs — offshore platforms, refinery upgrades, pipeline construction — feed substantial P3-pattern intermediation on top of that.",
          "Energy's 130.6 billion pesos pass through PEMEX Exploración y Producción and CFE, where P3 vendors supply equipment, specialized services, and technical consultancy. This channel is distinctive because the real suppliers are often international manufacturers — Schlumberger, Siemens, GE — reached through local intermediary partners. The markup the intermediary takes can represent legitimate localization services or pure rent extraction. Which one it is shows up only in detailed contract analysis.",
          "Health's 104.2 billion pesos run through pharmaceutical distribution (the Maypo-Grupo Fármacos-PISA-DIMM cluster examined in earlier stories), medical-equipment resellers, and laboratory-service providers. This is the easiest channel to investigate, because the real manufacturers are internationally known and their direct-to-government contract prices are public in other countries — a ready benchmark for what the intermediary's spread actually costs. Below health the volumes fall off sharply: Hacienda 40.9 billion, Educación 19.1 billion, Agricultura 18.8 billion, Gobernación 17.8 billion, Defensa 15.9 billion. The pattern follows the value.",
        ],
        prose_es: [
          'La capa de intermediación no se distribuye uniformemente a través de la contratación pública mexicana. Se acumula donde se encuentran tres corrientes: alto valor del contrato, complejidad técnica y delgadez de la fiscalización. Donde las tres corren juntas la capa es más espesa, y la gráfica de abajo ordena cada canal por el volumen de pesos que el patrón mueve a través de él — 526.8 mil millones en total.',
          'Infraestructura es la compuerta más ancha con 179.5 mil millones de pesos. El dinero entra como obra civil (caminos, proyectos hidráulicos, infraestructura urbana), como servicios de construcción (demolición, movimientos de tierra, oficios especializados) y como intermediación de gestión de proyecto. SCT / SICT y CONAGUA son las entidades compradoras más grandes, con fondos regionales de infraestructura distribuyendo contratación adicional significativa a niveles estatal y municipal. Las propias necesidades de infraestructura de Pemex — plataformas costa afuera, modernización de refinerías, construcción de ductos — alimentan una intermediación sustancial con patrón P3 además de eso.',
          'Los 130.6 mil millones de pesos de energía pasan por PEMEX Exploración y Producción y por la CFE, donde los proveedores P3 suministran equipo, servicios especializados y consultoría técnica. Este canal es distintivo porque los suministradores reales son a menudo fabricantes internacionales — Schlumberger, Siemens, GE — alcanzados a través de socios locales de intermediación. La sobreposición que toma el intermediario puede representar servicios legítimos de localización o pura extracción de renta. Cuál de las dos es solo aparece en el análisis detallado del contrato.',
          'Los 104.2 mil millones de pesos de salud corren por la distribución farmacéutica (el cúmulo Maypo-Grupo Fármacos-PISA-DIMM examinado en historias anteriores), revendedores de equipo médico y proveedores de servicios de laboratorio. Este es el canal más fácil de investigar, porque los fabricantes reales son internacionalmente conocidos y sus precios de contrato directo-a-gobierno son públicos en otros países — un referente listo para saber cuánto cuesta en realidad la diferencia del intermediario. Por debajo de salud los volúmenes caen abruptamente: Hacienda 40.9 mil millones, Educación 19.1 mil millones, Agricultura 18.8 mil millones, Gobernación 17.8 mil millones, Defensa 15.9 mil millones. El patrón sigue al valor.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'The Channels: P3 Contract Value by Sector',
          title_es: 'Los canales: valor de contratación P3 por sector',
          chartId: 'p3-intermediary-sectors',
          data: {
            points: [
              {
                label: 'Infraestructura',
                value: 179.5,
                color: '#ea580c',
                annotation: '2.7× the average channel',
                annotation_es: '2.7× el canal promedio',
              },
              {
                label: 'Energía',
                value: 130.6,
                color: '#eab308',
              },
              {
                label: 'Salud',
                value: 104.2,
                color: '#dc2626',
              },
              {
                label: 'Hacienda',
                value: 40.9,
                color: '#16a34a',
              },
              {
                label: 'Educación',
                value: 19.1,
                color: '#3b82f6',
              },
              {
                label: 'Agricultura',
                value: 18.8,
                color: '#22c55e',
              },
              {
                label: 'Gobernación',
                value: 17.8,
                color: '#be123c',
              },
              {
                label: 'Defensa',
                value: 15.9,
                color: '#1e3a5f',
              },
            ],
            unit: 'B MXN',
            referenceLine: {
              value: 65.85,
              label: 'avg channel · 65.8B',
              label_es: 'canal promedio · 65.8B',
              color: 'var(--color-text-secondary)',
            },
            annotation:
              'Mechanistically: contract won by intermediary, work subcontracted, fee extracted. Top 3 channels (infra · energy · health) = 79% of the 526.8B P3 total; dashed line marks the 65.8B average channel.',
            annotation_es:
              'Mecánica: el intermediario gana el contrato, subcontrata el trabajo, extrae la comisión. Los 3 canales mayores (infra · energía · salud) = 79% del total P3 de 526.8 mil millones; la línea punteada marca el canal promedio de 65.8 mil millones.',
          },
        },
        pullquote: {
          quote:
            "1,128 intermediary-pattern vendors in infrastructure alone. The pass-through industry is larger than Mexico's annual federal education budget.",
          quote_es:
            '1,128 proveedores con patrón de intermediario solo en infraestructura. La industria del paso es más grande que el presupuesto federal anual de educación de México.',
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
        title: 'Where the Margin Is Skimmed',
        title_es: 'Donde se descrema el margen',
        subtitle: 'Named brokers, the ticket signature, and the prototype',
        subtitle_es: 'Intermediarios con nombre, la firma del ticket y el prototipo',
        prose: [
          'The abstract flow becomes concrete in a single number: the ticket size. A microscopic contract count multiplied by an enormous per-contract value, in sectors where legitimate firms operate orders of magnitude smaller. That ratio is where the margin is skimmed, and it has names.',
          'CONSTRUCTORA ARHNOS won 32.0 billion pesos across just six contracts with state-level public-works secretariats — an average ticket of 5.3 billion pesos per contract, against an industry-typical infrastructure ticket of one to ten million. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA collected 21.1 billion pesos across three IMSS contracts, an average ticket of 7.0 billion. CAABSA CONSTRUCTORA took 9.2 billion across three CDMX contracts. GX2 DESARROLLOS took 5.9 billion across two Sinaloa contracts at a risk score of 0.54 — squarely in the high-risk band. The signature is identical in each case: a handful of contracts, each carrying a value that legitimate firms reach only across a lifetime of work.',
          "The pattern has a documented prototype. La Estafa Maestra is the archetype of exactly this flow — federal agencies contracting with public universities, which subcontracted to phantom companies, which effectively returned money to the original agencies' officials. The Parliamentary investigation of 2017 and the MCCI/Animal Político journalistic investigation of the same year found 7.67 billion pesos moved through this structure between 2013 and 2014 alone. It was possible because procurement law carves out university contracts, exempting them from competitive bidding under Art. 1, penultimate paragraph of the Ley de Adquisiciones. RUBLI's ground-truth database includes the case; the vendors directly linked to it carry risk scores averaging 0.55 to 0.65.",
          'The structure outlived its legal vehicle. The universities were one mechanism; the flow itself can run through any statute that permits subcontracting — Art. 5 of the Ley de Obras Públicas in public works, or Art. 41 of the Ley de Adquisiciones for recurring-vendor direct awards. The 2,974 P3 vendors are the structural successors to that architecture: different entities, same functional role. Each is an investigative thread — who owns it, which subcontractor does the real work, and what is the spread between what the government pays and what the subcontractor receives.',
          "Where the flow stops being clean is the model-versus-editorial disagreement at the high end. Adjacent to the likely pass-throughs sit international oilfield-services contractors — TÉCNICAS REUNIDAS S.A. (7.2B / 2 contracts at PEMEX, risk 0.89), a PETROBRAS-led joint venture (5.9B / 2 contracts at PEMEX, risk 0.90), and PRIDE INTERNATIONAL (5.5B / 6 contracts at PEMEX, risk 0.95) — all rated critical by v0.8.5 despite their reputation as legitimate foreign specialists. These three sit on RUBLI's structural-FP exclusion list precisely because the model otherwise flags them: a narrow-supplier-market produces the same statistical signature as pass-through fraud. The investigative question is no longer 'separate two populations.' It is sharper: which of these critical-band scores reflect real fraud, and which are model artifacts of legitimately concentrated supplier markets? The P3 algorithm flags them all as the same shape; the human work is telling them apart.",
        ],
        prose_es: [
          'El flujo abstracto se vuelve concreto en un solo número: el tamaño del ticket. Una cuenta de contratos minúscula multiplicada por un valor por contrato enorme, en sectores donde las firmas legítimas operan a tamaños órdenes de magnitud menores. Esa proporción es donde se descrema el margen, y tiene nombres.',
          'CONSTRUCTORA ARHNOS ganó 32.0 mil millones de pesos en apenas seis contratos con secretarías estatales de obras públicas — un ticket promedio de 5.3 mil millones de pesos por contrato, contra un ticket típico de la industria de infraestructura de uno a diez millones. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA cobró 21.1 mil millones de pesos en tres contratos del IMSS, un ticket promedio de 7.0 mil millones. CAABSA CONSTRUCTORA tomó 9.2 mil millones en tres contratos de la CDMX. GX2 DESARROLLOS tomó 5.9 mil millones en dos contratos de Sinaloa con una calificación de riesgo de 0.54 — de lleno en la banda de alto riesgo. La firma es idéntica en cada caso: un puñado de contratos, cada uno con un valor que las firmas legítimas alcanzan apenas a lo largo de toda una vida de trabajo.',
          'El patrón tiene un prototipo documentado. La Estafa Maestra es el arquetipo de exactamente este flujo — dependencias federales contratando con universidades públicas, que subcontrataban con empresas fantasma, que en efecto devolvían el dinero a los funcionarios de las dependencias originales. La investigación parlamentaria de 2017 y la investigación periodística de MCCI/Animal Político del mismo año encontraron que 7.67 mil millones de pesos se movieron por esta estructura solo entre 2013 y 2014. Fue posible porque la ley de adquisiciones tiene una excepción para los contratos con universidades, eximiéndolos de la licitación competitiva bajo el Art. 1, último párrafo, de la Ley de Adquisiciones. La base de datos de verdad-base de RUBLI incluye el caso; los proveedores directamente vinculados a él cargan calificaciones de riesgo que promedian de 0.55 a 0.65.',
          'La estructura sobrevivió a su vehículo legal. Las universidades fueron un mecanismo; el flujo mismo puede correr por cualquier precepto que permita la subcontratación — el Art. 5 de la Ley de Obras Públicas en obra pública, o el Art. 41 de la Ley de Adquisiciones para adjudicaciones directas a proveedores recurrentes. Los 2,974 proveedores P3 son los sucesores estructurales de esa arquitectura: distintas entidades, mismo papel funcional. Cada uno es un hilo investigativo — quién lo posee, qué subcontratista hace el trabajo real y cuál es la diferencia entre lo que paga el gobierno y lo que recibe el subcontratista.',
          "Donde el flujo deja de ser limpio es en el desacuerdo modelo-contra-redacción en la cima. Adyacentes a los probables pasos están contratistas internacionales de servicios petroleros — TÉCNICAS REUNIDAS S.A. (7.2 mil millones / 2 contratos en PEMEX, riesgo 0.89), un consorcio liderado por PETROBRAS (5.9 mil millones / 2 contratos en PEMEX, riesgo 0.90) y PRIDE INTERNATIONAL (5.5 mil millones / 6 contratos en PEMEX, riesgo 0.95) — todos calificados como críticos por v0.8.5 a pesar de su reputación como especialistas extranjeros legítimos. Estos tres están en la lista de exclusión de FP estructurales de RUBLI precisamente porque el modelo de otra forma los marca: un mercado de proveedores reducido produce la misma firma estadística que el fraude por intermediación. La pregunta investigativa ya no es 'separar dos poblaciones'. Es más aguda: ¿cuáles de estas calificaciones en banda crítica reflejan fraude real, y cuáles son artefactos del modelo en mercados de proveedores legítimamente concentrados? El algoritmo P3 marca a todos con la misma forma; el trabajo humano consiste en distinguirlos.",
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'The Skim: Top P3 Vendors by Total Contract Value',
          title_es: 'El descreme: top proveedores P3 por valor total de contratos',
          chartId: 'p3-top-vendors',
          data: {
            points: [
              {
                label: 'Constructora ARHNOS',
                value: 32,
                riskScore: 0.52,
                highlight: true,
                annotation: '6 contracts · state public works · risk 0.52',
                annotation_es: '6 contratos · obras públicas estatales · riesgo 0.52',
              },
              {
                label: 'Promotora y Desarrolladora',
                value: 21.1,
                riskScore: 0.59,
                annotation: '3 contracts · IMSS hospitals · risk 0.59',
                annotation_es: '3 contratos · hospitales IMSS · riesgo 0.59',
              },
              {
                label: 'Antonio Vigil Maximino',
                value: 9.75,
                riskScore: 0.5,
                annotation: '2 contracts · IMSS · risk 0.50',
                annotation_es: '2 contratos · IMSS · riesgo 0.50',
              },
              {
                label: 'CAABSA Constructora',
                value: 9.18,
                riskScore: 0.72,
                annotation: '3 contracts · CDMX · risk 0.72',
                annotation_es: '3 contratos · CDMX · riesgo 0.72',
              },
              {
                label: 'GTECH Printing',
                value: 7.72,
                riskScore: 0.58,
                annotation: '2 contracts · lottery printing · risk 0.58',
                annotation_es: '2 contratos · impresión lotería · riesgo 0.58',
              },
              {
                label: 'Técnicas Reunidas (ES)',
                value: 7.24,
                riskScore: 0.89,
                annotation: '2 contracts · PEMEX engineering · risk 0.89 (structural FP)',
                annotation_es: '2 contratos · ingeniería PEMEX · riesgo 0.89 (FP estructural)',
              },
              {
                label: 'GX2 Desarrollos',
                value: 5.89,
                riskScore: 0.54,
                annotation: '2 contracts · Sinaloa · risk 0.54',
                annotation_es: '2 contratos · Sinaloa · riesgo 0.54',
              },
              {
                label: 'Petrobras JV (BR)',
                value: 5.86,
                riskScore: 0.9,
                annotation: '2 contracts · PEMEX · risk 0.90',
                annotation_es: '2 contratos · PEMEX · riesgo 0.90',
              },
              {
                label: 'Pride International (US)',
                value: 5.48,
                riskScore: 0.95,
                annotation: '6 contracts · PEMEX offshore · risk 0.95',
                annotation_es: '6 contratos · PEMEX costa afuera · riesgo 0.95',
              },
              {
                label: 'LAMAP',
                value: 4.73,
                riskScore: 0.47,
                annotation: '17 contracts · IMSS-Bienestar · risk 0.47',
                annotation_es: '17 contratos · IMSS-Bienestar · riesgo 0.47',
              },
            ],
            unit: 'B MXN',
            annotation:
              'Bar color = v0.8.5 risk score (critical / high). All 10 top-value P3 vendors land in the high-or-critical band — the model rejects the prose\'s "legitimate foreign specialist" framing for PEMEX contractors (Petrobras JV 0.90, Técnicas Reunidas 0.89, Pride International 0.95), which sit on RUBLI\'s structural-FP exclusion list precisely because the model otherwise flags them. The investigative question shifts: which of these critical-band scores reflect real intermediary fraud and which are model artifacts of structurally narrow supplier markets?',
            annotation_es:
              'Color de barra = calificación de riesgo v0.8.5 (crítica / alta). Los 10 proveedores P3 de mayor valor caen en la banda alta-o-crítica — el modelo rechaza la lectura del cuerpo del texto de "especialista extranjero legítimo" para los contratistas de PEMEX (Petrobras JV 0.90, Técnicas Reunidas 0.89, Pride International 0.95), que están en la lista de exclusión de FP estructurales de RUBLI precisamente porque el modelo de otra forma los marca. La pregunta investigativa cambia: ¿cuáles de estas calificaciones de banda crítica reflejan fraude real por intermediación y cuáles son artefactos del modelo en mercados de proveedores estructuralmente reducidos?',
          },
        },
        pullquote: {
          quote:
            'CONSTRUCTORA ARHNOS won 32 billion pesos across six contracts. The average ticket is 5.3 billion. Legitimate infrastructure firms operate at one-thousandth of that scale.',
          quote_es:
            'CONSTRUCTORA ARHNOS ganó 32 mil millones de pesos en seis contratos. El ticket promedio es 5.3 mil millones. Las firmas legítimas de infraestructura operan a una milésima de esa escala.',
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
        title: 'Where It Lands',
        title_es: 'Dónde aterriza',
        subtitle: 'The flow dead-ends in an enforcement void',
        subtitle_es: 'El flujo termina en un vacío de fiscalización',
        prose: [
          'Follow the peso to its destination and it dead-ends in an enforcement void. The core obstruction is simple: subcontracting is legal. A company that wins a government contract and subcontracts the work commits no crime unless the subcontracting inflates prices, launders money, or circumvents competitive requirements. Proving which of the three occurred means following the money through multiple corporate structures and bank accounts — forensic work Mexican enforcement agencies rarely complete at scale. The crime, if there is one, lives in the spread, and the spread lives in bank records no one has subpoenaed.',
          "The legal tools exist but sit idle. Mexico's UIF (Unidad de Inteligencia Financiera) has jurisdiction over financial flows that may constitute money laundering, but it does not systematically monitor procurement payment chains and is buried under roughly 20,000 suspicious-activity reports a year across the whole economy; dedicating capacity to procurement intermediation means choosing it over currency trafficking and narcotics proceeds. The UNCAC (UN Convention Against Corruption), which Mexico ratified in 2004, requires state parties to criminalize 'abuse of functions' — a category broad enough to cover systematic overpriced intermediation — yet it has never been applied to procurement intermediation at scale, and UNCAC procurement prosecutions are rare in Mexican federal courts, where most corruption cases proceed under domestic statutes with lower evidentiary burdens.",
          "The void has a specific institutional shape. UIF traces flows but not payment chains. SFP audits the conduct of procurement units and individual officials, not vendor-level patterns. ASF audits individual contracts, not aggregate sectoral intermediary density. The one body with explicit jurisdiction over anticompetitive practices in public procurement is COFECE, under the Ley Federal de Competencia Económica — and it has brought essentially no procurement-cartel cases in a decade, despite the OECD's repeated recommendations that Mexico develop the practice. Its public docket runs to telecommunications, banking, and retail. Even if COFECE acted, the law may not fit: its cartel provisions (Art. 53) require proof of coordination between competing bidders, and a pure pass-through that bids against no one — simply extracting rent from an uncompetitive contract — may fall outside that jurisprudence.",
          "This is the structural mismatch the data exposes. Mexico's legal and institutional architecture was built to address corruption one contract, one bribe, one official at a time. The intermediary industry RUBLI documents runs at pattern scale — 2,974 vendors, 526 billion pesos. The P3 list is the pre-filter that could change the economics of enforcement: instead of UIF triaging tens of thousands of generic suspicious-activity reports, it names the specific vendors and poses three diagnostic questions for each — who is the underlying subcontractor, what is the price spread between the government contract and the subcontract, and is that spread consistent with legitimate coordination value or with rent extraction. Until the legal architecture catches up to the pattern, enforcement keeps targeting individual trees while the forest grows.",
        ],
        prose_es: [
          'Sigan el peso hasta su destino y termina en un vacío de fiscalización. La obstrucción central es simple: subcontratar es legal. Una empresa que gana un contrato del gobierno y subcontrata el trabajo no comete delito alguno a menos que la subcontratación infle precios, lave dinero o sortee requisitos competitivos. Probar cuál de las tres cosas ocurrió significa seguir el dinero a través de múltiples estructuras corporativas y cuentas bancarias — trabajo forense que las agencias mexicanas de fiscalización rara vez completan a escala. El delito, si lo hay, vive en la diferencia, y la diferencia vive en registros bancarios que nadie ha solicitado.',
          "Las herramientas legales existen pero permanecen ociosas. La UIF (Unidad de Inteligencia Financiera) de México tiene jurisdicción sobre flujos financieros que puedan constituir lavado de dinero, pero no monitorea sistemáticamente las cadenas de pago de la contratación y está sepultada bajo aproximadamente 20,000 reportes de actividad sospechosa al año en toda la economía; dedicar capacidad a la intermediación en contratación significa elegirla por encima del tráfico de divisas y los recursos del narcotráfico. La CNUCC (Convención de las Naciones Unidas contra la Corrupción), que México ratificó en 2004, exige a los estados parte tipificar el 'abuso de funciones' — categoría lo bastante amplia para cubrir intermediación sistemática con sobreprecio — y aun así nunca se ha aplicado a la intermediación en contratación a escala, y las imputaciones bajo CNUCC en materia de contratación son raras en los tribunales federales mexicanos, donde la mayoría de los casos de corrupción procede bajo estatutos domésticos con cargas probatorias menores.",
          'El vacío tiene una forma institucional específica. La UIF rastrea flujos pero no cadenas de pago. La SFP audita la conducta de las unidades compradoras y de funcionarios individuales, no patrones a nivel proveedor. La ASF audita contratos individuales, no la densidad sectorial agregada de intermediación. El único organismo con jurisdicción expresa sobre prácticas anticompetitivas en la contratación pública es la COFECE, bajo la Ley Federal de Competencia Económica — y no ha presentado prácticamente ningún caso de cártel de contratación en una década, a pesar de las recomendaciones repetidas de la OCDE para que México desarrolle dicha práctica. Su agenda pública se va a telecomunicaciones, banca y comercio minorista. Aun si la COFECE actuara, la ley puede no encajar: sus disposiciones de cártel (Art. 53) exigen prueba de coordinación entre licitantes competidores, y una estructura pura de paso que no licita contra nadie — que simplemente extrae renta de un contrato no competitivo — puede quedar fuera de esa jurisprudencia.',
          'Este es el desajuste estructural que los datos exponen. La arquitectura legal e institucional de México fue construida para atender la corrupción un contrato, un soborno, un funcionario a la vez. La industria del intermediario que RUBLI documenta corre a escala de patrón — 2,974 proveedores, 526 mil millones de pesos. La lista P3 es el pre-filtro que podría cambiar la economía de la aplicación: en vez de que la UIF triiara decenas de miles de reportes genéricos de actividad sospechosa, nombra a los proveedores específicos y plantea tres preguntas diagnósticas para cada uno — quién es el subcontratista subyacente, cuál es la diferencia de precio entre el contrato con el gobierno y el subcontrato, y si esa diferencia es consistente con un valor legítimo de coordinación o con extracción de renta. Hasta que la arquitectura legal alcance al patrón, la aplicación seguirá apuntando a árboles individuales mientras el bosque crece.',
        ],
        pullquote: {
          quote:
            "Mexico's architecture targets one contract, one bribe, one official. The broker industry runs at pattern scale — and COFECE, the one body with jurisdiction, has brought essentially no procurement-cartel cases in five years.",
          quote_es:
            'La arquitectura mexicana ataca un contrato, un soborno, un funcionario. La industria del intermediario corre a escala de patrón — y la COFECE, el único organismo con jurisdicción, no ha presentado prácticamente ningún caso de cártel de contratación en cinco años.',
          stat: '0',
          statLabel: 'major COFECE procurement cartel cases, last 5 years',
          statLabel_es: 'casos COFECE de cártel de contratación, últimos 5 años',
          barValue: 0,
          barLabel: 'despite OECD recommendations',
          barLabel_es: 'a pesar de las recomendaciones OCDE',
          vizTemplate: 'zero-bar',
        },
        sources: [
          'UNODC. (2020). UN Convention Against Corruption: Implementation Guide. Article 19 (abuse of functions).',
          'UIF/SHCP. (2024). Informe Anual de Actividades 2024.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 5.',
          'Ley Federal de Competencia Económica, Art. 53 (prácticas monopólicas absolutas).',
        ],
      },
    ],
  },

  // === STORY 9: A Line in the Law, and the Crowd Beneath It ===
  {
    slug: 'el-umbral-de-los-300k',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'A Line in the Law, and the Crowd Beneath It',
    headline_es: 'Una línea en la ley, y la multitud debajo de ella',
    subheadline:
      'Mexican procurement rules switch off competition at fixed contract values. Plot 3.05 million federal contracts against those lines and the data bunches hard just below them — 28,264 contracts at exactly 210,000 pesos, more spikes at 250K and 300K. The clustering is mathematically impossible in honest pricing and consistent with contracts deliberately sized to escape the rules.',
    subheadline_es:
      'Las reglas mexicanas de contratación apagan la competencia en valores fijos de contrato. Al graficar los contratos federales contra esas líneas, los datos se amontonan justo debajo de ellas — 28,264 contratos exactamente en 210,000 pesos, y más picos en 250K y 300K. El agrupamiento es matemáticamente imposible en una fijación honesta de precios y consistente con contratos dimensionados deliberadamente para escapar de las reglas.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 14,
    status: 'solo_datos',
    leadStat: {
      value: '28,264',
      label: 'contracts piled at exactly 210K MXN',
      label_es: 'contratos amontonados exactamente en 210 mil pesos',
      sublabel: '76% above the baseline just below it',
      sublabel_es: '76% sobre la línea base justo debajo',
      color: '#f59e0b',
    },
    kickerStats: [
      {
        value: '28,264',
        suffix: 'contracts at exactly 210K MXN',
        suffix_es: 'contratos exactamente en 210 mil pesos',
        tone: 'critical',
      },
      {
        value: '76%',
        suffix: 'above baseline at the line',
        suffix_es: 'sobre la línea base en el umbral',
        tone: 'data',
      },
      {
        value: 'Art. 17',
        suffix: 'LAASSP bans the splitting; the data ignores it',
        suffix_es: 'la LAASSP lo prohíbe; los datos lo ignoran',
        tone: 'critical',
      },
    ],
    relatedSlugs: [
      'el-ejercito-fantasma',
      'la-ilusion-competitiva',
      'la-industria-del-intermediario',
    ],
    lensTags: {
      patterns: ['P5'],
      sectors: ['salud'],
      terms: ['umbral', 'threshold', 'fragmentación', 'Art. 17', 'DICONSA'],
    },
    nextSteps: [
      "File INAI information request for SFP's records of any Art. 17 LAASSP investigations for contract fragmentation in the last 5 years.",
      'Identify the top 20 institutions with the highest concentration of exactly-300K and exactly-210K contracts and request their procurement records for those awards.',
      'Compare threshold values across years against the spike bucket sizes — does the cluster shift when UMA-denominated thresholds change?',
      'Contact SHCP/SFP policy unit to ask whether automated threshold-clustering detection has been considered for CompraNet.',
      'File criminal complaints under Art. 17 LAASSP for specific procurement units showing systematic same-day, same-vendor, threshold-value contract splitting.',
      "Compile a journalistic investigation of the 10 most egregious same-day contract splitting cases identified by RUBLI's z-score analysis.",
    ],
    nextSteps_es: [
      'Solicitar vía INAI a la SFP los registros de cualquier investigación del Art. 17 de la LAASSP por fragmentación de contratos en los últimos 5 años.',
      'Identificar las 20 instituciones con mayor concentración de contratos exactamente en 300K y 210K MXN y solicitar sus expedientes de compra para esas adjudicaciones.',
      'Comparar los valores de umbral a lo largo del tiempo contra los tamaños de los picos — ¿se desplaza el clúster cuando los umbrales denominados en UMA cambian?',
      'Contactar a la unidad de política de la SHCP/SFP para preguntar si se ha considerado la detección automatizada de agrupamiento en umbrales para COMPRANET.',
      'Interponer denuncias penales bajo el Art. 17 de la LAASSP para unidades de compra específicas que muestren fraccionamiento sistemático de contratos en el mismo día, mismo proveedor, mismo valor umbral.',
      'Compilar una investigación periodística sobre los 10 casos más flagrantes de fraccionamiento de contratos en el mismo día identificados por el análisis z-score de RUBLI.',
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'Stand at the Line',
        title_es: 'Párate en la línea',
        subtitle: 'Contract volume from 200K to 400K pesos, in 10K buckets',
        subtitle_es: 'Volumen de contratos de 200K a 400K pesos, en cubos de 10K',
        prose: [
          'Stand at 210,000 pesos. It is not a price. It is a line in Mexican procurement law — a value at which the rules quietly change and competition can be switched off. Plot all 3.05 million federal contracts awarded between 2002 and 2025 in the band from 200,000 to 400,000 pesos, in buckets of 10,000 pesos each, and the data does not slope away smoothly. It bunches. It piles against invisible walls and crowds beneath them.',
          'The largest crowd sits exactly on the line. At 210,000 pesos, 28,264 contracts cluster — 76 percent above the baseline count of 16,075 contracts at 200,000 pesos just below. Two more crowds form at 250,000 pesos (24,966 contracts) and at 300,000 pesos (22,064 contracts). The histogram makes the shape unmistakable: the baseline descends from roughly 16,000 contracts at 200K to about 12,000 at 400K, exactly as you would expect when larger contracts are somewhat rarer than smaller ones. Against that downward slope, three buckets jut upward.',
          'Walk the silhouette. The 210K bucket reaches 28,264. The 250K bucket holds 24,966, lifted above its neighbors at 240K (23,331) and 260K (24,841). The 300K bucket holds 22,064, elevated above 290K (18,925) and 310K (16,024). Between the three primary spikes runs a secondary plateau across 220K-260K — 220K at 27,773, 230K at 24,820 — staying elevated where the rest of the curve has begun to fall. Past 300K the slope resumes its descent: 320K at 15,914, 350K at 14,304, 380K at 12,599, 400K at 12,045.',
          'Now the contrast that explains why this matters. In an honest pricing universe a vendor delivering 300,000 pesos of goods is no likelier to invoice exactly 300,000 than 297,000 or 303,000; the probability mass would spread continuously, with small peaks only where real-world pricing genuinely clusters — UMA multiples, catalog round numbers, fixed regulatory fees. The data does the opposite. The spikes at 210K, 250K and 300K are not a pricing pattern. They are a statistical signature — a crowd that forms because the line is worth crowding beneath.',
        ],
        prose_es: [
          'Párate en 210,000 pesos. No es un precio. Es una línea en la ley mexicana de contratación — un valor en el que las reglas cambian discretamente y la competencia puede apagarse. Grafica los 3.05 millones de contratos federales adjudicados entre 2002 y 2025 en la banda de 200,000 a 400,000 pesos, en cubos de 10,000 pesos cada uno, y los datos no descienden de forma suave. Se amontonan. Se apilan contra muros invisibles y se aglomeran debajo de ellos.',
          'La multitud más grande se sienta exactamente sobre la línea. En 210,000 pesos se agrupan 28,264 contratos — 76 por ciento por encima de la línea base de 16,075 contratos en 200,000 pesos justo debajo. Se forman dos multitudes más en 250,000 pesos (24,966 contratos) y en 300,000 pesos (22,064 contratos). El histograma vuelve la forma inconfundible: la línea base desciende desde alrededor de 16,000 contratos en 200K hasta cerca de 12,000 en 400K, exactamente lo que se esperaría cuando los contratos más grandes son algo más raros que los más pequeños. Contra esa pendiente descendente, tres cubos sobresalen hacia arriba.',
          'Recorre la silueta. El cubo de 210K llega a 28,264. El cubo de 250K guarda 24,966, levantado por encima de sus vecinos en 240K (23,331) y 260K (24,841). El cubo de 300K guarda 22,064, elevado sobre 290K (18,925) y 310K (16,024). Entre los tres picos primarios corre una meseta secundaria a través de 220K-260K — 220K en 27,773, 230K en 24,820 — que se mantiene elevada donde el resto de la curva ya empezó a caer. Pasando 300K la pendiente retoma su descenso: 320K en 15,914, 350K en 14,304, 380K en 12,599, 400K en 12,045.',
          'Ahora el contraste que explica por qué importa. En un universo honesto de precios, un proveedor que entrega 300,000 pesos en bienes no tiene más probabilidad de facturar exactamente 300,000 que 297,000 o 303,000; la masa de probabilidad se repartiría de forma continua, con picos pequeños solo donde la fijación de precios del mundo real genuinamente se agrupa — múltiplos de UMA, números redondos de catálogo, tarifas regulatorias fijas. Los datos hacen lo contrario. Los picos en 210K, 250K y 300K no son un patrón de precio. Son una firma estadística — una multitud que se forma porque la línea vale la pena aglomerarse debajo.',
        ],
        chartConfig: {
          type: 'inline-spike',
          title: 'The Line and the Crowd: Contract Volume, 200K-400K MXN',
          title_es: 'La línea y la multitud: volumen de contratos, 200K-400K MXN',
          chartId: 'threshold-spikes',
          data: {
            points: [
              {
                label: '200K',
                value: 16075,
              },
              {
                label: '210K',
                value: 28264,
                highlight: true,
                annotation: 'spike',
                annotation_es: 'pico',
              },
              {
                label: '220K',
                value: 27773,
              },
              {
                label: '230K',
                value: 24820,
              },
              {
                label: '240K',
                value: 23331,
              },
              {
                label: '250K',
                value: 24966,
                highlight: true,
                annotation: 'threshold?',
                annotation_es: '¿umbral?',
              },
              {
                label: '260K',
                value: 24841,
              },
              {
                label: '270K',
                value: 19259,
              },
              {
                label: '280K',
                value: 19805,
              },
              {
                label: '290K',
                value: 18925,
              },
              {
                label: '300K',
                value: 22064,
                highlight: true,
                annotation: '300K',
                annotation_es: '300K',
              },
              {
                label: '310K',
                value: 16024,
              },
              {
                label: '320K',
                value: 15914,
              },
              {
                label: '330K',
                value: 14986,
              },
              {
                label: '340K',
                value: 16707,
              },
              {
                label: '350K',
                value: 14304,
              },
              {
                label: '360K',
                value: 13580,
              },
              {
                label: '370K',
                value: 12260,
              },
              {
                label: '380K',
                value: 12599,
              },
              {
                label: '390K',
                value: 14318,
              },
              {
                label: '400K',
                value: 12045,
              },
            ],
            unit: 'contracts',
            annotation:
              'Anomalous spikes at 210K, 250K, and 300K suggest artificial contract splitting.',
            annotation_es:
              'Picos anómalos en 210K, 250K y 300K sugieren división artificial de contratos.',
          },
        },
        pullquote: {
          quote:
            '28,264 contracts at exactly 210,000 pesos. The baseline immediately below is 16,075. This is not a pricing pattern. It is a procedural escape.',
          quote_es:
            '28,264 contratos exactamente en 210,000 pesos. La línea base inmediatamente debajo es 16,075. No es un patrón de precio. Es un escape procedimental.',
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
          'RUBLI histogram analysis of contract amounts, 200K-400K range in 10K buckets.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público, Art. 42 (simplified procedures).',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Why the Crowd Forms',
        title_es: 'Por qué se forma la multitud',
        subtitle: 'The legal magnet, the splitting engine, and the roster that works the line',
        subtitle_es: 'El imán legal, el motor de fragmentación y el padrón que trabaja la línea',
        prose: [
          'The line has a pull, and the pull is written in law. Below certain contract values a procurement unit may use "invitación a cuando menos tres personas" — a simplified three-vendor invitation, governed by Art. 42 of the Ley de Adquisiciones — instead of full competitive bidding. Below other values it may use direct adjudication with no procedure at all. The 300,000-peso value has historically sat close to the invitación-a-tres threshold for certain contract categories; 210,000 and 250,000 map to subdivision limits and small-value thresholds that permit fully simplified procedures. The exact figures drift year to year as UMA values update, but the structure of Art. 43 — and the bunching just below it — is a constant. When an official wants a predetermined vendor without competition, sizing the contract just under the line is the reliable legal route.',
          "Then there is the engine that mass-produces the crowd. Threshold splitting — fragmenting one procurement need into several sub-threshold contracts — is among the oldest fraud techniques in public contracting, and Mexican law bans it outright: Art. 17 of the Ley de Adquisiciones states that the procurement of the same good or service shall not be fragmented to evade the procedures the statute requires. The prohibition exists. The data ignores it. RUBLI's z-score analysis of same-day counts — contracts awarded to the same vendor, on the same day, by the same institution — finds thousands of cases split into multiple same-day awards, each below threshold, in what read as structured package purchases. In extreme cases a single procurement unit fires 10 to 20 contracts on one day to one vendor, each at or just below the line, for what is plainly one underlying need.",
          'The cost is not abstract. A 2019 World Bank study of Eastern European procurement found that threshold splitting added 8 to 12 percent to unit prices by killing volume discounts and competitive pressure. Across the tens of thousands of Mexican contracts sitting at threshold values, the aggregate distortion is plausibly in the billions of pesos per year. And the units most prone to it are municipal and state-level procurement bodies operating under federal spending programs, where oversight density is thinnest; the same-day clustering is statistically strongest in the gobernación and infrastructure sectors, where decentralized execution is the norm and one unit may handle hundreds of contracts a month with no federal-level review.',
          'Pulled from the data, the institutional roster is sharper than the sector framing. Count "suspicious clusters" — one institution awarding three or more contracts to the same vendor on the same day, each in the 195K-305K threshold band — and DICONSA tops the list: 985 clusters, 3,395 split contracts, 829.6 million pesos. Its renamed successor, Alimentación para el Bienestar, adds 230 clusters and 869 contracts (214.2M MXN). But the bulk-staples profile of those two is a different mechanism — large recurrent purchases against a thin oversight surface, not day-of fragmentation.',
          "The editorial finding is healthcare. IMSS ranks second by cluster count — 588 clusters, 2,109 split contracts, 519.5M MXN routed through the splitting structure — followed by ISSSTE (77 clusters, 302 contracts, 75.1M), the INCMNSZ-Salvador Zubirán (69 clusters, 268 contracts, 65.7M) and the federal Secretaría de Salud (15 clusters, 132 contracts, 30.1M). Beyond the spike at exactly 300,000 pesos, the rest of the field fills out the same shape: CFE (47 clusters, 162 contracts, 40.1M), CONALITEG (36 clusters, 132 contracts, 31.7M), Puebla's Comité Educativo (27 clusters, 186 contracts, 46.2M), SEMAR (19 clusters, 61 contracts, 15.2M), PROFECO (18 clusters, 89 contracts, 20.8M) and IPN (14 clusters, 53 contracts, 13.0M). Medical-supply procurement rarely needs day-of fragmentation, which is precisely why the pattern is most loaded there: the contract structure implies a fragmentation the underlying need does not. Summing the excess across the spike buckets — the counts above what the baseline would predict — yields an estimate of roughly 30,000 to 40,000 contracts structured at threshold values rather than at natural pricing points. Each is a procurement that could have gone to competition and was deliberately sized to avoid it.",
        ],
        prose_es: [
          'La línea tiene un imán, y el imán está escrito en la ley. Por debajo de ciertos valores de contrato, una unidad compradora puede usar la "invitación a cuando menos tres personas" — un procedimiento simplificado de tres proveedores, regido por el Art. 42 de la Ley de Adquisiciones — en vez de licitación competitiva plena. Por debajo de otros valores puede usar adjudicación directa sin procedimiento alguno. El valor de 300,000 pesos ha estado históricamente cerca del umbral de invitación a tres para ciertas categorías de contrato; 210,000 y 250,000 corresponden a límites de subdivisión y umbrales de bajo valor que permiten procedimientos plenamente simplificados. Los números exactos se desplazan año con año conforme se actualizan los valores de la UMA, pero la estructura del Art. 43 — y el agrupamiento justo por debajo de ella — es constante. Cuando un funcionario quiere un proveedor predeterminado sin competencia, dimensionar el contrato justo por debajo de la línea es la ruta legal confiable.',
          'Luego está el motor que produce la multitud en masa. La fragmentación por umbral — dividir una necesidad de contratación en varios contratos por debajo del umbral — es de las técnicas más antiguas de fraude en la contratación pública, y la ley mexicana la prohíbe de plano: el Art. 17 de la Ley de Adquisiciones establece que la contratación del mismo bien o servicio no podrá fragmentarse para evadir los procedimientos que exige la ley. La prohibición existe. Los datos la ignoran. El análisis z-score de RUBLI sobre conteos del mismo día — contratos adjudicados al mismo proveedor, el mismo día, por la misma institución — encuentra miles de casos divididos en múltiples adjudicaciones del mismo día, cada una por debajo del umbral, en lo que se leen como compras estructuradas en paquete. En casos extremos, una sola unidad compradora adjudica de 10 a 20 contratos en un día a un solo proveedor, cada uno en o justo debajo de la línea, para lo que claramente es una sola necesidad subyacente.',
          'El costo no es abstracto. Un estudio del Banco Mundial de 2019 sobre la contratación pública en Europa Oriental halló que la fragmentación por umbral añadía entre 8 y 12 por ciento a los precios unitarios al eliminar los descuentos por volumen y la presión competitiva. A través de las decenas de miles de contratos mexicanos asentados en valores umbral, la distorsión agregada es plausiblemente del orden de miles de millones de pesos por año. Y las unidades más propensas son los cuerpos de adquisiciones municipales y estatales que operan bajo programas federales de gasto, donde la densidad de fiscalización es la más delgada; el agrupamiento del mismo día es estadísticamente más fuerte en los sectores de gobernación e infraestructura, donde la ejecución descentralizada es la norma y una sola unidad puede manejar cientos de contratos al mes sin revisión a nivel federal.',
          'Extraído de los datos, el padrón institucional es más nítido que el encuadre sectorial. Cuenta los "cúmulos sospechosos" — una institución que adjudica tres o más contratos al mismo proveedor el mismo día, cada uno en la banda umbral de 195K-305K — y DICONSA encabeza la lista: 985 cúmulos, 3,395 contratos divididos, 829.6 millones de pesos. Su entidad sucesora renombrada, Alimentación para el Bienestar, suma 230 cúmulos y 869 contratos (214.2 M MXN). Pero el perfil de productos básicos a granel de esas dos es un mecanismo distinto — compras grandes y recurrentes contra una superficie de fiscalización delgada, no fragmentación de un mismo día.',
          'El hallazgo editorial es el sector salud. El IMSS se ubica segundo por número de cúmulos — 588 cúmulos, 2,109 contratos divididos, 519.5 M MXN canalizados por la estructura de fragmentación — seguido por ISSSTE (77 cúmulos, 302 contratos, 75.1 M), el INCMNSZ-Salvador Zubirán (69 cúmulos, 268 contratos, 65.7 M) y la Secretaría de Salud federal (15 cúmulos, 132 contratos, 30.1 M). Más allá del pico exactamente en 300,000 pesos, el resto del campo completa la misma forma: CFE (47 cúmulos, 162 contratos, 40.1 M), CONALITEG (36 cúmulos, 132 contratos, 31.7 M), el Comité Educativo de Puebla (27 cúmulos, 186 contratos, 46.2 M), SEMAR (19 cúmulos, 61 contratos, 15.2 M), PROFECO (18 cúmulos, 89 contratos, 20.8 M) e IPN (14 cúmulos, 53 contratos, 13.0 M). La contratación de insumos médicos rara vez necesita fragmentarse en un mismo día, y por eso ahí el patrón está más cargado: la estructura del contrato implica una fragmentación que la necesidad subyacente no tiene. Sumar el exceso en los cubos pico — los conteos por encima de lo que la línea base predeciría — arroja una estimación de aproximadamente 30,000 a 40,000 contratos estructurados en valores umbral en vez de en puntos naturales de precio. Cada uno es una contratación que pudo ir a competencia y fue dimensionada deliberadamente para evitarla.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'Who Works the Line: Same-Day, Same-Vendor Threshold-Cluster Splits',
          title_es: 'Quién trabaja la línea: divisiones umbral con mismo proveedor en el mismo día',
          chartId: 'threshold-split-institutions',
          data: {
            points: [
              {
                label: 'DICONSA',
                label_es: 'DICONSA',
                value: 985,
                annotation: 'HACIENDA · SOCIAL PROGRAMS · 3,395 CONTRACTS · 829.6M MXN',
                annotation_es: 'HACIENDA · PROGRAMAS SOCIALES · 3,395 CONTRATOS · 829.6 M MXN',
              },
              {
                label: 'IMSS',
                label_es: 'IMSS',
                value: 588,
                highlight: true,
                annotation: 'SALUD · MEDICAL SUPPLY · 2,109 CONTRACTS · 519.5M MXN',
                annotation_es: 'SALUD · INSUMOS MÉDICOS · 2,109 CONTRATOS · 519.5 M MXN',
              },
              {
                label: 'Alimentación p/ Bienestar',
                label_es: 'Alimentación p/ Bienestar',
                value: 230,
                annotation: 'HACIENDA · SOCIAL PROGRAMS · 869 CONTRACTS · 214.2M MXN',
                annotation_es: 'HACIENDA · PROGRAMAS SOCIALES · 869 CONTRATOS · 214.2 M MXN',
              },
              {
                label: 'ISSSTE',
                label_es: 'ISSSTE',
                value: 77,
                highlight: true,
                annotation: 'SALUD · MEDICAL SUPPLY · 302 CONTRACTS · 75.1M MXN',
                annotation_es: 'SALUD · INSUMOS MÉDICOS · 302 CONTRATOS · 75.1 M MXN',
              },
              {
                label: 'INCMNSZ Salvador Zubirán',
                label_es: 'INCMNSZ Salvador Zubirán',
                value: 69,
                highlight: true,
                annotation: 'SALUD · MEDICAL SUPPLY · 268 CONTRACTS · 65.7M MXN',
                annotation_es: 'SALUD · INSUMOS MÉDICOS · 268 CONTRATOS · 65.7 M MXN',
              },
              {
                label: 'CFE',
                label_es: 'CFE',
                value: 47,
                annotation: 'ENERGÍA · ELECTRICITY · 162 CONTRACTS · 40.1M MXN',
                annotation_es: 'ENERGÍA · ELECTRICIDAD · 162 CONTRATOS · 40.1 M MXN',
              },
              {
                label: 'CONALITEG',
                label_es: 'CONALITEG',
                value: 36,
                annotation: 'EDUCACIÓN · TEXTBOOKS · 132 CONTRACTS · 31.7M MXN',
                annotation_es: 'EDUCACIÓN · LIBROS DE TEXTO · 132 CONTRATOS · 31.7 M MXN',
              },
              {
                label: 'Puebla — Comité Educativo',
                label_es: 'Puebla — Comité Educativo',
                value: 27,
                annotation: 'EDUCACIÓN · STATE-LEVEL · 186 CONTRACTS · 46.2M MXN',
                annotation_es: 'EDUCACIÓN · NIVEL ESTATAL · 186 CONTRATOS · 46.2 M MXN',
              },
              {
                label: 'SEMAR',
                label_es: 'SEMAR',
                value: 19,
                annotation: 'DEFENSA · NAVAL · 61 CONTRACTS · 15.2M MXN',
                annotation_es: 'DEFENSA · MARINA · 61 CONTRATOS · 15.2 M MXN',
              },
              {
                label: 'PROFECO',
                label_es: 'PROFECO',
                value: 18,
                annotation: 'GOBERNACIÓN · CONSUMER PROTECTION · 89 CONTRACTS · 20.8M MXN',
                annotation_es:
                  'GOBERNACIÓN · PROCURADURÍA DEL CONSUMIDOR · 89 CONTRATOS · 20.8 M MXN',
              },
              {
                label: 'Secretaría de Salud',
                label_es: 'Secretaría de Salud',
                value: 15,
                highlight: true,
                annotation: 'SALUD · FEDERAL HEALTH · 132 CONTRACTS · 30.1M MXN',
                annotation_es: 'SALUD · SALUD FEDERAL · 132 CONTRATOS · 30.1 M MXN',
              },
              {
                label: 'IPN',
                label_es: 'IPN',
                value: 14,
                annotation: 'EDUCACIÓN · POLYTECHNIC · 53 CONTRACTS · 13.0M MXN',
                annotation_es: 'EDUCACIÓN · POLITÉCNICO · 53 CONTRATOS · 13.0 M MXN',
              },
            ],
            unit: 'clusters',
            annotation:
              'Each cluster = one institution awarding 3+ contracts to the same vendor on the same day, each between 195K and 305K MXN. The healthcare cluster (IMSS / ISSSTE / INCMNSZ / SSA — ochre rail) is the editorial finding: medical procurement rarely needs day-of fragmentation, so the threshold-splitting pattern is most editorially loaded there. DICONSA and Alimentación p/ Bienestar lead by raw count, but their bulk-staples profile is a different mechanism — large recurrent purchases against a thin oversight surface.',
            annotation_es:
              'Cada cúmulo = una institución que adjudicó 3 o más contratos al mismo proveedor el mismo día, cada uno entre 195 mil y 305 mil pesos. El cúmulo de salud (IMSS / ISSSTE / INCMNSZ / SSA — riel ocre) es el hallazgo editorial: la contratación médica rara vez necesita fragmentarse en un mismo día, por lo que ahí el patrón de fragmentación por umbral está más editorialmente cargado. DICONSA y Alimentación para el Bienestar encabezan por conteo bruto, pero su perfil de compra de productos básicos a granel es un mecanismo distinto — compras grandes y recurrentes contra una superficie de fiscalización delgada.',
          },
        },
        pullquote: {
          quote:
            'Three statistical spikes in a 200K range, each aligned precisely with a regulatory threshold. Sum the excess and roughly 40,000 contracts were structured to escape competition.',
          quote_es:
            'Tres picos estadísticos en un rango de 200K, cada uno alineado precisamente con un umbral regulatorio. Suma el exceso y unos 40,000 contratos fueron estructurados para escapar de la competencia.',
          stat: '~40,000',
          statLabel: 'excess contracts at threshold values',
          statLabel_es: 'contratos en exceso en valores umbral',
        },
        sources: [
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. Art. 42 and Art. 43 threshold structure.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. Art. 17 (fragmentation prohibition).',
          'World Bank. (2019). Procurement Fraud Indicators: Threshold Manipulation in Public Contracting.',
          'RUBLI same-day same-vendor cluster analysis: contracts in 195K-305K band, GROUP BY institution × vendor × contract_date HAVING COUNT ≥ 3. April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Visible to Everyone, Enforced by No One',
        title_es: 'Visible para todos, fiscalizado por nadie',
        subtitle: 'Easy to detect, hard to prosecute, audited at neither end',
        subtitle_es: 'Fácil de detectar, difícil de imputar, sin auditoría en ningún extremo',
        prose: [
          'Here is the paradox. Threshold manipulation is among the easiest procurement fraud patterns to detect: counting contracts at fixed values against a baseline distribution is a statistical operation that runs in seconds on the full CompraNet dataset. It is also among the hardest to prosecute. Each individual contract is a legitimate, documented, defensible purchase. The fraud lives in the aggregate decision to fragment, not in any single transaction — which is why the aggregate is the only place it can be proven.',
          'One number shows the rules are already switched off. Among threshold-cluster contracts, 75 percent are direct awards — no competition, no public tender — against an OECD ceiling of 30 percent for non-competitive procedures. The procedural escape the line was built to enable has become the default.',
          'The enforcement geography explains why no one stops it. Small sub-threshold contracts fall outside the default federal audit scope: the ASF spends its limited capacity on large contracts, and SFP pattern audits, when they happen, hit high-profile units rather than the diffuse municipal and decentralized population where splitting concentrates. This is the mirror image of the failure at the high end. There, 5-billion-peso contracts escape audit because they are politically dangerous to investigate. Here, 210,000-peso contracts escape because they are individually too small to be worth the cost of investigation. Opposite ends of the value spectrum, opposite failure modes, the same result: procurement proceeds without meaningful oversight.',
          "What is missing is not capability but will. RUBLI's same-day and threshold-clustering detection already hands investigators a ready target list — units firing 20 contracts of exactly 300,000 pesos in a week, vendors that live only in threshold-adjacent awards. The fixes are well-established in reform literature: automatic threshold-adjacency flagging at data entry, mandatory explanation when same-vendor same-day awards aggregate above threshold, SFP audits prioritized algorithmically, and aggregation rules that treat a series of related contracts as a single procurement — exactly what the EU's Procurement Directive 2014/24/EU requires in Art. 5 and what Mexican law has not fully adopted, though Art. 17 already supplies the prohibition. CompraNet holds every byte needed. None of this requires new legal authority — only the institutional decision to use the authority that exists.",
          'The line is not hidden. The spikes at 210K, 250K and 300K are printed, statistically, in public procurement data for anyone able to read them. After 14 years there have been 0 systemic enforcement cases against threshold-clustering. The question is no longer whether it happens at scale in Mexican federal procurement — it does — but when Mexican institutions will act on a number they can already see.',
        ],
        prose_es: [
          'Aquí está la paradoja. La manipulación de umbrales está entre los patrones de fraude en contratación más fáciles de detectar: contar contratos en valores fijos contra una distribución base es una operación estadística que corre en segundos sobre todo el dataset de CompraNet. Es también de los más difíciles de imputar penalmente. Cada contrato individual es una compra legítima, documentada y defendible. El fraude vive en la decisión agregada de fragmentar, no en transacción individual alguna — y por eso el agregado es el único lugar donde puede probarse.',
          'Un número muestra que las reglas ya están apagadas. Entre los contratos en cúmulo de umbral, el 75 por ciento son adjudicaciones directas — sin competencia, sin licitación pública — contra un techo de la OCDE de 30 por ciento para procedimientos no competitivos. El escape procedimental que la línea fue construida para habilitar se ha vuelto la regla por defecto.',
          'La geografía de la fiscalización explica por qué nadie lo detiene. Los contratos de bajo valor por debajo del umbral caen fuera del alcance de auditoría federal por defecto: la ASF gasta su capacidad limitada en contratos grandes, y las auditorías de patrón de la SFP, cuando ocurren, golpean unidades de alto perfil en vez de la población difusa de oficinas municipales y agencias descentralizadas donde se concentra la fragmentación. Este es el espejo de la falla en el extremo alto. Allá, los contratos de 5 mil millones de pesos escapan a la auditoría porque son políticamente peligrosos de investigar. Aquí, los contratos de 210,000 pesos escapan porque son individualmente demasiado chicos para justificar el costo de la investigación. Extremos opuestos del espectro de valor, modos de falla opuestos, el mismo resultado: la contratación procede sin fiscalización significativa.',
          'Lo que falta no es capacidad sino voluntad. La detección del mismo día y de cúmulos por umbral de RUBLI ya entrega a los investigadores una lista de blancos lista para usar — unidades que adjudican 20 contratos de exactamente 300,000 pesos en una semana, proveedores que viven solo en adjudicaciones colindantes a umbrales. Los remedios están bien establecidos en la literatura de reforma: marcado automático de colindancia con umbral al momento del registro, explicación obligatoria cuando las adjudicaciones del mismo día al mismo proveedor agregan por encima del umbral, auditorías de la SFP priorizadas algorítmicamente, y reglas de agregación que tratan una serie de contratos relacionados como una sola contratación — exactamente lo que exige la Directiva de Contratación Pública 2014/24/UE de la UE en su Art. 5 y lo que la ley mexicana no ha adoptado plenamente, aunque el Art. 17 ya provee la prohibición. CompraNet guarda cada byte necesario. Nada de esto requiere nueva autoridad legal — solo la decisión institucional de usar la autoridad que existe.',
          'La línea no está escondida. Los picos en 210K, 250K y 300K están impresos, estadísticamente, en los datos públicos de contratación para cualquiera capaz de leerlos. Tras 14 años ha habido 0 casos sistémicos de fiscalización contra el agrupamiento en umbrales. La pregunta ya no es si ocurre a escala en la contratación federal mexicana — sí ocurre — sino cuándo las instituciones mexicanas actuarán sobre un número que ya pueden ver.',
        ],
        pullquote: {
          quote:
            'The line is printed, statistically, in public data for anyone able to read it. In 14 years it has produced zero systemic enforcement cases.',
          quote_es:
            'La línea está impresa, estadísticamente, en datos públicos para cualquiera capaz de leerla. En 14 años ha producido cero casos sistémicos de fiscalización.',
          stat: '0',
          statLabel: 'systemic enforcement cases against threshold-clustering in 14 years',
          statLabel_es:
            'casos sistémicos de fiscalización contra el agrupamiento en umbrales en 14 años',
        },
        sources: [
          'OECD. (2015). Recommendation of the Council on Public Procurement. Principle 7: accountability.',
          'EU Procurement Directive 2014/24/EU. Art. 5 (aggregation rules and anti-splitting).',
          'Transparencia Mexicana. (2024). Diagnóstico de la Corrupción en Compras Municipales y Estatales.',
          'RUBLI aggregate threshold analysis, April 2026.',
        ],
      },
    ],
  },

  // === STORY 10: The Smoking Gun Is a Number ===
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'The Smoking Gun Is a Number',
    headline_es: 'La pistola humeante es un número',
    subheadline:
      'A pharmaceutical distributor billed the IMSS nine times its own price for the same goods. Then an algorithm, given eighteen ways to detect fraud, chose to watch exactly that.',
    subheadline_es:
      'Un distribuidor farmacéutico facturó al IMSS nueve veces su propio precio por los mismos bienes. Luego un algoritmo, con dieciocho formas de detectar fraude, eligió vigilar exactamente eso.',
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 12,
    status: 'solo_datos',
    leadStat: {
      value: '+0.558',
      label: 'price_volatility coefficient — v0.8.5',
      label_es: 'coeficiente price_volatility — v0.8.5',
      sublabel: "the model's strongest signal · 43% ahead of the next feature",
      sublabel_es: 'la señal más fuerte del modelo · 43% por encima del siguiente',
      color: '#dc2626',
    },
    kickerStats: [
      {
        prefix: 'One distributor billed',
        value: '9×',
        suffix: 'its own price.',
        tone: 'critical',
      },
      {
        prefix: 'Given 18 ways to detect fraud, the model chose',
        value: 'price_volatility',
        suffix: '',
        tone: 'data',
      },
      {
        prefix: 'It outranked every other signal by',
        value: '43%',
        suffix: '.',
        tone: 'muted',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Scene',
        title_es: 'La escena',
        subtitle: 'MX$3 million in February. MX$27 million in June. Same goods.',
        subtitle_es: 'MX$3 millones en febrero. MX$27 millones en junio. Los mismos bienes.',
        prose: [
          'Start at the scene, before any model. A pharmaceutical distributor serves the IMSS from 2019 to 2022. It holds contracts in the same acquisition category, with the same institution, for structurally comparable goods. A price that emerges from market competition should move within a narrow band. Legitimate vendors with stable costs charge stable prices. That is the baseline an investigator brings to the file.',
          "The baseline breaks in June 2020. The distributor billed MX$27 million for a delivery in the same category where it billed MX$3 million four months earlier. There is no documented change of specifications. There is no scope justification in the public record. The price rises 9×. The contract is a direct award. The official's signature is present.",
          "State plainly what this is and is not. It is not proof of a crime. It is a price that did not come from competition. It came from negotiation — a number set at whatever the approving official was willing to sign. That single invoice is the clue. The question for everything that follows is whether it is one bad contract or the visible edge of a pattern. The chart below is the exhibit: this vendor's own contract history.",
        ],
        prose_es: [
          'Empecemos en la escena, antes de cualquier modelo. Un distribuidor farmacéutico sirve al IMSS entre 2019 y 2022. Tiene contratos en la misma categoría de adquisición, con la misma institución, para bienes estructuralmente comparables. Un precio que emerge de la competencia de mercado debería moverse dentro de un rango estrecho. Los proveedores legítimos con costos estables cobran precios estables. Ese es el punto de partida con el que un investigador abre el expediente.',
          'El punto de partida se rompe en junio de 2020. El distribuidor facturó MX$27 millones por una entrega en la misma categoría donde cobró MX$3 millones cuatro meses antes. No hay cambio documentado de especificaciones. No hay justificación de alcance en el registro público. El precio sube 9 veces. El contrato es adjudicación directa. La firma del funcionario está presente.',
          'Digamos con claridad qué es y qué no es esto. No es prueba de un delito. Es un precio que no salió de la competencia. Salió de la negociación — un número fijado en lo que el funcionario que aprobaba estuviera dispuesto a firmar. Esa sola factura es la pista. La pregunta para todo lo que sigue es si se trata de un contrato malo o del borde visible de un patrón. La gráfica de abajo es la prueba: el historial de contratos de este mismo proveedor.',
        ],
        chartConfig: {
          type: 'vendor-price-trajectory',
          title: 'The exhibit: pharmaceutical distributor, IMSS contract history 2019–2022',
          title_es: 'La prueba: distribuidor farmacéutico, historial de contratos IMSS 2019–2022',
        },
        pullquote: {
          quote:
            'MX$3M in February. MX$27M in June. Same category. Direct award. No spec change. That is the trace of a negotiated price.',
          quote_es:
            'MX$3M en febrero. MX$27M en junio. Misma categoría. Adjudicación directa. Sin cambio de especificaciones. Eso es la huella del precio negociado.',
          stat: '9×',
          statLabel: 'price swing within one vendor, one category, one year',
          statLabel_es: 'variación de precio en un mismo proveedor, misma categoría, mismo año',
        },
        sources: [
          'Análisis SHAP RUBLI, contribuciones de price_volatility para proveedores P1, mayo 2026.',
          'OECD. (2022). OECD Principles for Integrity in Public Procurement.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Corroboration',
        title_es: 'La corroboración',
        subtitle: 'Given eighteen ways to detect fraud, the model chose the price',
        subtitle_es: 'Con dieciocho formas de detectar fraude, el modelo eligió el precio',
        prose: [
          "Now the detective's second road to the same scene. Pull back from the single vendor and ask whether the price anomaly is a coincidence or a signature. RUBLI's v0.8.5 risk model is an independent investigator that never saw this one contract specially. It was trained against 1,554 documented vendors across 1,427 confirmed corruption cases — IMSS ghost-company networks, Segalmex fraud, COVID irregularities, the university Estafa Maestra — using ElasticNet logistic regression with 200 Optuna Bayesian optimization trials.",
          'The contest was fair. Eighteen candidate features, equal footing, full freedom to weight them by the data. The verdict was unambiguous: price_volatility emerged at +0.558, the strongest positive predictor, 43% ahead of the next feature, price_ratio at +0.358. Six of the eighteen candidates were regularized to exactly zero by ElasticNet — discarded because they added nothing beyond what price volatility already captured.',
          'This is corroboration. An algorithm reached the scene by a completely different road — aggregate statistics over millions of contracts, not one June invoice — and found the same evidence pointing the same way. The coefficient is a compressed judgment about what 1,427 corruption cases have in common: inconsistent prices for comparable work. The full roster below shows the structure the model built.',
        ],
        prose_es: [
          'Ahora el segundo camino del detective hacia la misma escena. Alejémonos del proveedor individual y preguntemos si la anomalía de precio es una coincidencia o una firma. El modelo de riesgo v0.8.5 de RUBLI es un investigador independiente que nunca vio este contrato en particular. Fue entrenado contra 1,554 proveedores documentados en 1,427 casos de corrupción confirmada — redes de empresas fantasma del IMSS, fraude de Segalmex, irregularidades COVID, La Estafa Maestra universitaria — usando regresión logística ElasticNet con 200 ensayos de optimización bayesiana de Optuna.',
          'El concurso fue justo. Dieciocho variables candidatas, en igualdad de condiciones, con libertad total para ponderarlas según los datos. El veredicto fue inequívoco: price_volatility emergió con +0.558, el predictor positivo más fuerte, un 43% por encima del siguiente, price_ratio con +0.358. Seis de las dieciocho candidatas fueron regularizadas a exactamente cero por ElasticNet — descartadas porque no aportaban nada más allá de lo que ya capturaba la volatilidad de precios.',
          'Esto es corroboración. Un algoritmo llegó a la escena por un camino completamente distinto — estadística agregada sobre millones de contratos, no una factura de junio — y encontró la misma evidencia apuntando en la misma dirección. El coeficiente es un juicio comprimido sobre qué tienen en común 1,427 casos de corrupción: precios inconsistentes para trabajo comparable. El roster completo de abajo muestra la estructura que el modelo construyó.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: "The model's verdict: 18 candidates, 10 active — price_volatility on top",
          title_es:
            'El veredicto del modelo: 18 candidatas, 10 activas — price_volatility en la cima',
          chartId: 'model-coefficients-full',
          data: {
            points: [
              {
                label: 'Price volatility',
                label_es: 'Volatilidad de precios',
                value: 0.558,
                highlight: true,
                annotation: 'PRICE FAMILY · señal más fuerte · +43% vs siguiente',
                annotation_es: 'FAMILIA PRECIO · señal más fuerte · +43% vs siguiente',
              },
              {
                label: 'Price ratio',
                label_es: 'Razón de precios',
                value: 0.358,
                annotation: 'PRICE FAMILY',
                annotation_es: 'FAMILIA PRECIO',
              },
              {
                label: 'Vendor concentration',
                label_es: 'Concentración de proveedor',
                value: 0.327,
                annotation: 'NETWORK FAMILY',
                annotation_es: 'FAMILIA RED',
              },
              {
                label: 'Cobid herfindahl',
                label_es: 'Herfindahl de co-licitación',
                value: 0.272,
                annotation: 'NETWORK FAMILY',
                annotation_es: 'FAMILIA RED',
              },
              {
                label: 'Network member count',
                label_es: 'Tamaño de red',
                value: 0.166,
                annotation: 'NETWORK FAMILY',
                annotation_es: 'FAMILIA RED',
              },
              {
                label: 'Amendment flag',
                label_es: 'Modificaciones',
                value: 0.102,
                annotation: 'STRUCTURAL FAMILY',
                annotation_es: 'FAMILIA ESTRUCTURAL',
              },
              {
                label: 'Ad period (days)',
                label_es: 'Periodo publicación (días)',
                value: 0.09,
                annotation: 'STRUCTURAL FAMILY',
                annotation_es: 'FAMILIA ESTRUCTURAL',
              },
              {
                label: 'Amount residual z',
                label_es: 'Residual de monto (z)',
                value: -0.187,
                annotation: 'PRICE FAMILY · protector menor',
                annotation_es: 'FAMILIA PRECIO · protector menor',
              },
              {
                label: 'Recency z-score',
                label_es: 'Recencia (z)',
                value: -0.247,
                annotation: 'STRUCTURAL FAMILY · protector menor',
                annotation_es: 'FAMILIA ESTRUCTURAL · protector menor',
              },
              {
                label: 'Institution diversity',
                label_es: 'Diversidad institucional',
                value: -0.388,
                highlight: true,
                annotation: 'NETWORK FAMILY · única protectora estructural',
                annotation_es: 'FAMILIA RED · única protectora estructural',
              },
            ],
            unit: 'β',
            annotation:
              'Roster ranked by coefficient. 7 risk signals (positive β) above, 2 minor protectives, and institution_diversity (-0.388) as the structural protective anchor. 6 of 18 candidate features were regularized to zero by ElasticNet.',
            annotation_es:
              'Roster ordenado por coeficiente. 7 señales de riesgo (β positivo) arriba, 2 protectoras menores y institution_diversity (-0.388) como ancla protectora estructural. 6 de 18 variables candidatas fueron regularizadas a cero por ElasticNet.',
          },
        },
        pullquote: {
          quote:
            "Of eighteen candidate features the algorithm chose price_volatility unprompted. That choice is the model's judgment about what 1,427 documented corruption cases have in common.",
          quote_es:
            'De dieciocho variables candidatas el algoritmo eligió price_volatility sin que nadie se lo pidiera. Esa elección es el juicio del modelo sobre qué tienen en común 1,427 casos de corrupción documentada.',
          stat: '+0.558',
          statLabel: 'price_volatility · v0.8.5 · AUC test 0.785',
          statLabel_es: 'price_volatility · v0.8.5 · AUC prueba 0.785',
        },
        sources: [
          'RUBLI v0.8.5 model. Run ID CAL-v8-202605020212. AUC test: 0.785. HR=11.0%.',
          'RUBLI docs/RISK_METHODOLOGY_v6.md — tabla de coeficientes, mayo 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Reading the Ladder',
        title_es: 'Leer la escalera',
        subtitle: 'What the model watches — and what it threw away',
        subtitle_es: 'Lo que el modelo vigila — y lo que descartó',
        prose: [
          'Interrogate the full structure now. The coefficient ladder is the architecture of suspicion. On the right are the alarm signals: price volatility, concentration in few contracts, co-bidding networks. On the left is the single protective signal that survived regularization — institution_diversity at -0.388. A vendor serving many distinct institutions is structurally less suspect. Broad reach is the signature of a legitimate market participant.',
          'The six discarded features carry their own evidence: single-bid, year-end timing, industry mismatch, pub_delay_z, win_rate, sector_spread. Earlier model versions — v3.3, v4.0 — treated some of these as primary indicators. v0.8.5 found that once price_volatility and price_ratio are in the model, direct_award itself surviving only at -0.081, these add no predictive power. That is not a claim that single-bid is irrelevant to corruption. It is the finding that single-bid is already captured by the dominant price signals.',
          'Land the empirical argument. Corruption in Mexican public procurement shows up first in the price — not in the award mechanism, not in the timing. And the inconsistency of that price, charging 9× for comparable work, is the trace that most reliably separates the vendors in the 1,427 documented cases from those outside them. The clue from the first chapter — the 9× invoice — is exactly what the top of this ladder is built to see.',
        ],
        prose_es: [
          'Interroguemos ahora la estructura completa. La escalera de coeficientes es la arquitectura de la sospecha. A la derecha están las señales de alarma: volatilidad de precios, concentración en pocos contratos, redes de co-licitación. A la izquierda, la única señal protectora que sobrevivió a la regularización — institution_diversity en -0.388. Un proveedor que sirve a muchas instituciones distintas es estructuralmente menos sospechoso. El alcance amplio es la firma de un participante legítimo de mercado.',
          'Las seis variables descartadas traen su propia evidencia: oferta única, momento de fin de año, desajuste de industria, pub_delay_z, win_rate, sector_spread. Versiones anteriores del modelo — v3.3, v4.0 — trataban algunas de éstas como indicadores principales. v0.8.5 encontró que, una vez que price_volatility y price_ratio están en el modelo, con direct_award sobreviviendo apenas en -0.081, estas señales no aportan poder predictivo. No es una afirmación de que la oferta única sea irrelevante para la corrupción. Es el hallazgo de que la oferta única ya está capturada por las señales dominantes de precio.',
          'Cerremos el argumento empírico. La corrupción en la contratación pública mexicana se manifiesta primero en el precio — no en el mecanismo de adjudicación, no en el timing. Y la inconsistencia de ese precio, cobrar 9 veces más por trabajo comparable, es la huella que más consistentemente distingue a los proveedores de los 1,427 casos documentados de los que están fuera de ellos. La pista del primer capítulo — la factura de 9× — es exactamente lo que la cima de esta escalera está construida para ver.',
        ],
        chartConfig: {
          type: 'inline-diverging',
          title: 'The architecture of suspicion: risk signals vs the one protective',
          title_es: 'La arquitectura de la sospecha: señales de riesgo vs la única protectora',
          data: {
            points: [
              {
                label: 'Price volatility',
                label_es: 'Volatilidad de precios',
                value: 0.558,
                highlight: true,
                annotation: '+43% vs siguiente',
                annotation_es: '+43% vs siguiente',
              },
              {
                label: 'Price ratio',
                label_es: 'Razón de precios',
                value: 0.358,
              },
              {
                label: 'Vendor concentration',
                label_es: 'Concentración proveedor',
                value: 0.327,
              },
              {
                label: 'Cobid herfindahl',
                label_es: 'Herfindahl co-licitación',
                value: 0.272,
              },
              {
                label: 'Network member count',
                label_es: 'Tamaño red',
                value: 0.166,
              },
              {
                label: 'Amendment flag',
                label_es: 'Modificaciones',
                value: 0.102,
              },
              {
                label: 'Ad period (days)',
                label_es: 'Periodo publicación',
                value: 0.09,
              },
              {
                label: 'Direct award',
                label_es: 'Adjudicación directa',
                value: -0.081,
              },
              {
                label: 'Amount residual z',
                label_es: 'Residual monto (z)',
                value: -0.187,
              },
              {
                label: 'Recency z-score',
                label_es: 'Recencia (z)',
                value: -0.247,
              },
              {
                label: 'Institution diversity',
                label_es: 'Diversidad institucional',
                value: -0.388,
                color: '#3b82f6',
                annotation: 'única protectora',
                annotation_es: 'única protectora',
              },
            ],
            referenceLine: {
              value: 0,
              label: '',
              color: '#64748b',
            },
            unit: 'coefficient',
            annotation:
              'Ghost rows: 6 features regularized to zero (single-bid, year-end timing, industry mismatch, pub_delay_z, win_rate, sector_spread).',
            annotation_es:
              'Filas fantasma: 6 variables regularizadas a cero (oferta única, fin de año, desajuste de industria, pub_delay_z, win_rate, sector_spread).',
          },
        },
        pullquote: {
          quote:
            'One protective signal survived regularization: institution_diversity. A vendor that serves many institutions is structurally less suspect — broad reach is the signature of legitimacy.',
          quote_es:
            'Una señal protectora sobrevivió a la regularización: institution_diversity. Un proveedor que sirve a muchas instituciones es estructuralmente menos sospechoso — el alcance amplio es la firma de la legitimidad.',
          stat: '-0.388',
          statLabel: 'institution_diversity — protective coefficient (v0.8.5)',
          statLabel_es: 'institution_diversity — coeficiente protector (v0.8.5)',
        },
        sources: [
          'Zou, H., & Hastie, T. (2005). Regularization and variable selection via the elastic net.',
          'RUBLI v0.8.5 model coefficient table, docs/RISK_METHODOLOGY_v6.md, mayo 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The Second Witness',
        title_es: 'El segundo testigo',
        subtitle: 'An algorithm that never saw a corruption case found the same contracts',
        subtitle_es:
          'Un algoritmo que nunca vio un caso de corrupción encontró los mismos contratos',
        prose: [
          'The convergence is the strongest move in the case, and it comes late on purpose. RUBLI runs two independent analytic layers. The first is the supervised v0.8.5 model, trained on 1,427 documented corruption cases. The second uses no corruption labels at all: a PyOD IForest, an isolation forest that flags only the contracts that are statistically unusual within the universe of 3.1 million.',
          'Both layers independently flag the same 4,200 contracts. Two methods, different mathematics, no shared labels, converging on one population. This is the second witness who never spoke to the first. When an investigator builds a case on a single instrument, a defense attacks the instrument. When two instruments with nothing in common point at the same contracts, the signal is real, not a training artifact.',
          'The most parsimonious explanation is that price_volatility is visible from both vantage points. Contracts billed 9× above their own baseline are anomalous in pure statistical terms, so IForest sees them, and they resemble the documented corruption cases, so the supervised model sees them. Same signal. Same trace. The Venn below shows the overlap.',
        ],
        prose_es: [
          'La convergencia es la jugada más fuerte del caso, y llega tarde a propósito. RUBLI corre dos capas analíticas independientes. La primera es el modelo supervisado v0.8.5, entrenado contra 1,427 casos de corrupción documentada. La segunda no usa etiqueta de corrupción alguna: un PyOD IForest, un isolation forest que solo marca los contratos estadísticamente inusuales dentro del universo de 3.1 millones.',
          'Ambas capas marcan de forma independiente los mismos 4,200 contratos. Dos métodos, matemáticas distintas, sin etiquetas compartidas, convergiendo en una sola población. Este es el segundo testigo que nunca habló con el primero. Cuando un investigador construye un caso sobre un solo instrumento, la defensa ataca el instrumento. Cuando dos instrumentos sin nada en común apuntan a los mismos contratos, la señal es real, no un artefacto del entrenamiento.',
          'La explicación más parsimoniosa es que price_volatility es visible desde ambos puntos de vista. Los contratos facturados 9 veces por encima de su propia línea base son anómalos en términos estadísticos puros, y por eso IForest los detecta; y se parecen a los casos documentados de corrupción, y por eso el modelo supervisado los detecta. La misma señal. La misma huella. El diagrama de Venn de abajo muestra el traslape.',
        ],
        chartConfig: {
          type: 'venn-convergence',
          title: 'The second witness: two algorithms, the same 4,200 contracts',
          title_es: 'El segundo testigo: dos algoritmos, los mismos 4,200 contratos',
        },
        pullquote: {
          quote:
            'Two independent analytic approaches — supervised scoring and unsupervised anomaly detection — converge on the same 4,200 high-volatility contracts.',
          quote_es:
            'Dos enfoques analíticos independientes — calificación de riesgo supervisada y detección de anomalías no supervisada — convergen en los mismos 4,200 contratos de alta volatilidad de precios.',
          stat: '4,200',
          statLabel: 'contracts flagged by both algorithms independently',
          statLabel_es: 'contratos marcados por ambos algoritmos de forma independiente',
        },
        sources: [
          'Elkan, C., & Noto, K. (2008). Learning classifiers from only positive and unlabeled data. ACM SIGKDD.',
          'RUBLI validación cruzada de modelos, v0.8.5 vs PyOD IForest, abril 2026.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'Reading the Signature',
        title_es: 'Leer la firma',
        subtitle: 'Volatility is not one number — it is a fingerprint that names the case',
        subtitle_es: 'La volatilidad no es un número — es una huella que nombra el caso',
        prose: [
          'Turn the evidence into a lead. Price volatility is not a single value but a signature, and the shape of the signature tells the investigator which kind of case they are looking at. Three vendor patterns leave three distinct fingerprints on the price axis. The ghost vendor (P2): few contracts, extreme variance — prices that jump 5 to 10 times between contracts with no market logic. The capture vendor (P6): many contracts with one institution, moderate but persistent variance — never competes, always negotiates. The legitimate vendor: many contracts across multiple institutions, narrow variance — prices that track market cost.',
          "v0.8.5 separates these without ever labeling them. price_volatility, institution_diversity and vendor_concentration combine into a different coefficient vector for each pattern. The ghost scores high on volatility. The capture vendor scores high on concentration. The legitimate vendor scores low on all three. The three SHAP fingerprints below are illustrative — their proportions reflect RUBLI's analysis patterns, not a single audited contract.",
          'For a reporter this is actionable. A high-risk vendor dominated by price_volatility is a pricing-manipulation case — investigate by comparing invoices against market prices. A high-risk vendor dominated by vendor_concentration is an institutional-capture case — investigate by tracing the relationship between the vendor and the signing official. The coefficient signature dictates the type of investigation.',
        ],
        prose_es: [
          'Convirtamos la evidencia en una pista. La volatilidad de precios no es un valor único sino una firma, y la forma de la firma le dice al investigador qué tipo de caso tiene enfrente. Tres patrones de proveedor dejan tres huellas distintas en el eje de precios. El proveedor fantasma (P2): pocos contratos, varianza extrema — precios que saltan de 5 a 10 veces entre contratos sin lógica de mercado. El proveedor de captura (P6): muchos contratos con una institución, varianza moderada pero persistente — nunca compite, siempre negocia. El proveedor legítimo: muchos contratos con múltiples instituciones, varianza estrecha — precios que reflejan el costo de mercado.',
          'v0.8.5 separa estos patrones sin etiquetarlos nunca. price_volatility, institution_diversity y vendor_concentration se combinan en un vector de coeficientes distinto para cada patrón. El fantasma puntúa alto en volatilidad. El proveedor de captura puntúa alto en concentración. El proveedor legítimo puntúa bajo en los tres. Las tres huellas SHAP de abajo son ilustrativas — sus proporciones reflejan los patrones del análisis de RUBLI, no un solo contrato auditado.',
          'Para un periodista esto es accionable. Un proveedor de riesgo alto dominado por price_volatility es un caso de manipulación de precios — se investiga comparando facturas contra precios de mercado. Un proveedor de riesgo alto dominado por vendor_concentration es un caso de captura institucional — se investiga rastreando la relación entre el proveedor y el funcionario que firma. La firma del coeficiente dicta el tipo de investigación.',
        ],
        chartConfig: {
          type: 'inline-diverging',
          title: 'Three fingerprints on one axis: ghost, capture, legitimate',
          title_es: 'Tres huellas en un mismo eje: fantasma, captura, legítimo',
          data: {
            points: [
              {
                label: 'P2 Ghost — price_volatility',
                label_es: 'P2 Fantasma — volatilidad precios',
                value: 0.82,
                highlight: true,
              },
              {
                label: 'P2 Ghost — institution_diversity',
                label_es: 'P2 Fantasma — diversidad institucional',
                value: 0.12,
              },
              {
                label: 'P2 Ghost — vendor_concentration',
                label_es: 'P2 Fantasma — concentración proveedor',
                value: 0.38,
              },
              {
                label: 'P6 Capture — price_volatility',
                label_es: 'P6 Captura — volatilidad precios',
                value: 0.31,
              },
              {
                label: 'P6 Capture — institution_diversity',
                label_es: 'P6 Captura — diversidad institucional',
                value: -0.45,
                color: '#3b82f6',
              },
              {
                label: 'P6 Capture — vendor_concentration',
                label_es: 'P6 Captura — concentración proveedor',
                value: 0.71,
              },
              {
                label: 'Legit — price_volatility',
                label_es: 'Legítimo — volatilidad precios',
                value: 0.04,
              },
              {
                label: 'Legit — institution_diversity',
                label_es: 'Legítimo — diversidad institucional',
                value: -0.38,
                color: '#3b82f6',
              },
              {
                label: 'Legit — vendor_concentration',
                label_es: 'Legítimo — concentración proveedor',
                value: 0.02,
              },
            ],
            referenceLine: {
              value: 0,
              label: '',
              color: '#64748b',
            },
            unit: 'SHAP φ',
            annotation:
              'SHAP values illustrative — proportions match RUBLI analysis patterns (v0.8.5, mayo 2026).',
            annotation_es:
              'Valores SHAP ilustrativos — proporciones reflejan patrones del análisis RUBLI (v0.8.5, mayo 2026).',
          },
        },
        pullquote: {
          quote:
            'Three vendor patterns, three distinct fingerprints on one axis. The signature tells the investigator which case they have — overpricing or institutional capture.',
          quote_es:
            'Tres patrones de proveedor, tres huellas distintas en un mismo eje. La firma le dice al investigador qué caso tiene — sobreprecio o captura institucional.',
          stat: '3',
          statLabel: 'vendor patterns — three distinct fingerprints on the same axis',
          statLabel_es: 'patrones de proveedor — tres firmas distintas en el mismo eje',
        },
        sources: [
          'RUBLI análisis SHAP v0.8.5, tabla vendor_shap_v52, mayo 2026.',
          'RUBLI ARIA pipeline, P2/P6 pattern classification, mayo 2026.',
        ],
      },
      {
        id: 'ch6',
        number: 6,
        title: 'The Casework',
        title_es: 'El expediente',
        subtitle: 'How a reporter closes the case the algorithm opened',
        subtitle_es: 'Cómo un periodista cierra el caso que abrió el algoritmo',
        prose: [
          "The algorithm opens the file; the reporter completes it. For any vendor at the top of RUBLI's price_volatility ranking, the forensic route has three steps. First, identify the highest-variance contracts through INAI transparency requests — typical response 20 business days. Second, obtain the full contract text: specification, quantities, unit prices, delivery terms. Third, benchmark those unit prices against domestic comparators — other CompraNet contracts for the same goods — and international ones, the OECD's Open Contracting Partnership and the EU's TED database.",
          'This needs no forensic-accounting expertise. It needs access to public documents and systematic comparison. The ASF already applies this methodology to pharmaceutical procurement, a practice established after the Maypo/Grupo Fármacos/PISA concentration. RUBLI extends it algorithmically across 3.1 million contracts and 18 sectors, and the risk indicator simply flags which vendor-institution pairs deserve the first information request.',
          'Be honest about the output. It is not a criminal charge — that requires the Ministerio Público or the UIF. It is published evidence of overpricing in specific named contracts, verified by independent benchmarking, the kind of pressure that charges ultimately require. The lineage is clear: MCCI and Animal Político on La Estafa Maestra, El Universal on IMSS pharma — now made systematically faster by algorithmic prioritization. The 9× invoice in February and June was the clue. This is how you turn it into a case.',
        ],
        prose_es: [
          'El algoritmo abre el expediente; el periodista lo cierra. Para cualquier proveedor en la cima del ranking de price_volatility de RUBLI, la ruta forense tiene tres pasos. Primero, identificar los contratos de mayor varianza mediante solicitudes de transparencia al INAI — respuesta típica de 20 días hábiles. Segundo, obtener el texto completo del contrato: especificación, cantidades, precios unitarios, condiciones de entrega. Tercero, hacer benchmarking de esos precios unitarios contra comparadores domésticos — otros contratos de CompraNet para los mismos bienes — e internacionales, el Open Contracting Partnership de la OCDE y la base TED de la UE.',
          'Esto no requiere expertise forense contable. Requiere acceso a documentos públicos y comparación sistemática. La ASF ya aplica esta metodología a las adquisiciones farmacéuticas, una práctica establecida tras la concentración Maypo/Grupo Fármacos/PISA. RUBLI la extiende algorítmicamente a 3.1 millones de contratos y 18 sectores, y el indicador de riesgo simplemente señala cuáles pares proveedor-institución merecen la primera solicitud de información.',
          'Seamos honestos sobre el resultado. No es una imputación penal — eso requiere al Ministerio Público o a la UIF. Es evidencia publicada de sobreprecio en contratos específicos, identificados por nombre, verificada con benchmarking independiente, el tipo de presión que las imputaciones en última instancia requieren. El linaje es claro: MCCI y Animal Político en La Estafa Maestra, El Universal en la farmacéutica del IMSS — ahora hecho sistemáticamente más rápido por la priorización algorítmica. La factura de 9× en febrero y junio fue la pista. Así se convierte en un caso.',
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

  // === STORY 11: 2020: The Line in Time ===
  {
    slug: 'el-ano-de-la-emergencia',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: '2020: The Line in Time',
    headline_es: '2020: La línea en el tiempo',
    subheadline:
      'A single emergency decree on March 30, 2020 suspended a decade of competitive-bidding rules overnight. The direct-award rate jumped to 87%, ghost-pattern vendors collected billions in same-day awards — and the rate never came back down.',
    subheadline_es:
      'Un solo decreto de emergencia, el 30 de marzo de 2020, suspendió de la noche a la mañana una década de reglas de licitación competitiva. La tasa de adjudicación directa saltó al 87%, proveedores con patrón fantasma cobraron miles de millones en adjudicaciones del mismo día — y la tasa nunca volvió a bajar.',
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 10,
    status: 'reporteado',
    leadStat: {
      value: '87%',
      label: 'direct-award rate · 2020 · the rupture year',
      label_es: 'tasa de adjudicación directa · 2020 · el año de la ruptura',
      sublabel: 'up from 72.3% the year before — and it never reset',
      sublabel_es: 'arriba del 72.3% del año anterior — y nunca se reinició',
      color: '#dc2626',
    },
    kickerStats: [
      {
        prefix: 'Before the line, competition was the rule on',
        prefix_es: 'Antes de la línea, la competencia era la regla en',
        value: '27.7%',
        suffix: 'of 2019 contracts.',
        suffix_es: 'de los contratos de 2019.',
        tone: 'muted',
      },
      {
        prefix: 'After it, just',
        prefix_es: 'Después, apenas',
        value: '13%',
        suffix: 'of 2020 contracts stayed competitive.',
        suffix_es: 'de los contratos de 2020 siguió siendo competitivo.',
        tone: 'critical',
      },
      {
        prefix: 'And HEMOSER took',
        prefix_es: 'Y HEMOSER se llevó',
        value: '17.2B',
        suffix: 'in same-day awards from IMSS.',
        suffix_es: 'en adjudicaciones del mismo día del IMSS.',
        tone: 'data',
      },
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
        title: 'Before the Line',
        title_es: 'Antes de la línea',
        subtitle:
          'A procurement system that was already non-competitive — but still had to justify itself',
        subtitle_es:
          'Un sistema de contratación que ya era poco competitivo — pero todavía tenía que justificarse',
        prose: [
          "Before 2020, Mexican federal procurement was already tilted hard against competition. In 2019 the direct-award rate stood at 72.3% — and that figure was no aberration. Across five administrations and 23 years, the floor has never dropped below 60%. Measured against the OECD benchmark for a competitive system, which puts acceptable direct award at 15-20%, the entire history reads as an outlier. The 'before' state was not a clean baseline. It was a system already living near its own edge.",
          'What set the pre-COVID world apart was not a low rate. It was a rule. The Ley de Adquisiciones required competitive bidding by default; direct award was the exception, and every exception had to be justified on paper. Competition remained the legal presumption even where it was the statistical minority. In 2019, 27.7% of contracts were competitive — a minority, but a defended one, each direct award standing as a documented departure from the norm.',
          'That is the distinction that defines everything that follows. The system was non-competitive, but it carried a tripwire: a requirement to explain. A purchasing officer who wanted to skip the bidding still had to write down why. The constraint was procedural rather than statistical, and it was the only thing standing between a strained system and an open one. What happened in 2020 was not the corruption of something pristine. It was the removal of the tripwire.',
        ],
        prose_es: [
          "Antes de 2020, la contratación federal mexicana ya estaba inclinada con fuerza en contra de la competencia. En 2019 la tasa de adjudicación directa se ubicaba en 72.3% — y esa cifra no era una anomalía. A lo largo de cinco administraciones y 23 años, el piso nunca ha bajado del 60%. Medido contra el benchmark de la OCDE para un sistema competitivo, que sitúa la adjudicación directa aceptable en 15-20%, toda la historia se lee como un caso atípico. El estado 'antes' no era una línea base limpia. Era un sistema que ya vivía cerca de su propio límite.",
          'Lo que distinguía al mundo pre-COVID no era una tasa baja. Era una regla. La Ley de Adquisiciones exigía licitación competitiva por defecto; la adjudicación directa era la excepción, y cada excepción tenía que justificarse en papel. La competencia seguía siendo la presunción legal aun donde era la minoría estadística. En 2019, el 27.7% de los contratos fueron competitivos — una minoría, pero una minoría defendida, donde cada adjudicación directa quedaba como una desviación documentada de la norma.',
          'Esa es la distinción que define todo lo que sigue. El sistema era poco competitivo, pero llevaba un cable trampa: el requisito de explicar. Un funcionario de compras que quisiera saltarse la licitación todavía tenía que escribir por qué. La restricción era procesal y no estadística, y era lo único que separaba a un sistema tensionado de uno abierto. Lo que ocurrió en 2020 no fue la corrupción de algo intacto. Fue la eliminación del cable trampa.',
        ],
        pullquote: {
          quote:
            'The pre-COVID system was non-competitive, but it carried a tripwire: every direct award was an exception that had to be justified.',
          quote_es:
            'El sistema pre-COVID era poco competitivo, pero llevaba un cable trampa: cada adjudicación directa era una excepción que tenía que justificarse.',
          stat: '72.3%',
          statLabel: 'Direct-award rate · 2019 · the before-state baseline',
          statLabel_es: 'Tasa de adjudicación directa · 2019 · línea base del estado anterior',
        },
        sources: [
          'OCDE. (2022). Government at a Glance. Benchmarks competitividad de compras.',
          'RUBLI v0.8.5. Módulo year-over-year. Tasas adjudicación directa 2015–2024.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Rupture',
        title_es: 'La ruptura',
        subtitle:
          'March 30, 2020 — the day the justification requirement disappeared, and who walked through the gap',
        subtitle_es:
          '30 de marzo de 2020 — el día que desapareció el requisito de justificación, y quién pasó por la brecha',
        prose: [
          'On March 30, 2020, the Mexican federal government declared a national health emergency. The legal consequence was instant. The competitive-bidding requirements of the Ley de Adquisiciones were suspended for COVID-related procurement, and any federal agency could now award contracts directly with no process. The tripwire from the year before was simply cut: the rule that had forced a justification stopped applying.',
          'What came through the gap was enormous. RUBLI records 215,000 contracts in 2020 — the highest single-year volume of the AMLO administration, up 23% on the prior year. Of those, 87% were direct adjudications, against 72.3% in 2019. The delta of 14.7 percentage points across 215,000 contracts represents roughly 31,000 contracts that would have required competition under the old rule. Put in human terms: in 2020 only one in eight contracts was competitive, 13% of the total. The other seven of eight were awarded at a desk.',
          "Emergency powers in procurement are not inherently corrupt. In a genuine supply shock, speed beats process, and the early months of the pandemic were a real shock. The question is who the suspension permitted to move. Among the vendors who gained most was HEMOSER, a company that matches the P2 ghost-company behavioral signature in RUBLI's ARIA pipeline. HEMOSER received MX$17.2 billion in contracts from IMSS during the emergency, much of it in same-day awards — the contract signed the day the request was filed.",
          'Same-day is the forensic tell. Even with competition suspended, a legitimate purchase still evaluates credentials, validates capacity, and checks that the price is reasonable. A same-day award skips all of it, which means the vendor was chosen before the paperwork began. And HEMOSER was not unique. The P2 pipeline flagged 6,118 vendors nationally carrying the same signature: minimal physical presence, revenue concentrated in a single institution, high price volatility. In 2020 this class of vendor grew faster than any capacity or demand story can account for. The model identifies behavior resembling fraud; it does not prove it. But the pattern is what the lifted requirement made room for.',
        ],
        prose_es: [
          'El 30 de marzo de 2020, el gobierno federal mexicano declaró emergencia sanitaria nacional. La consecuencia legal fue inmediata. Los requisitos de licitación competitiva de la Ley de Adquisiciones quedaron suspendidos para las adquisiciones relacionadas con COVID, y cualquier dependencia federal podía ahora adjudicar contratos directamente sin proceso. El cable trampa del año anterior simplemente se cortó: la regla que había obligado a justificar dejó de aplicar.',
          'Lo que pasó por la brecha fue enorme. RUBLI registra 215,000 contratos en 2020 — el mayor volumen anual de la administración AMLO, un 23% por encima del año previo. De ellos, el 87% fueron adjudicaciones directas, contra 72.3% en 2019. El delta de 14.7 puntos porcentuales sobre 215,000 contratos representa aproximadamente 31,000 contratos que bajo la regla anterior habrían requerido competencia. En términos humanos: en 2020 solo uno de cada ocho contratos fue competitivo, el 13% del total. Los otros siete de ocho se adjudicaron en un escritorio.',
          'Los poderes de emergencia en contratación no son inherentemente corruptos. En un choque de oferta genuino, la velocidad le gana al proceso, y los primeros meses de la pandemia fueron un choque real. La pregunta es a quién permitió moverse la suspensión. Entre los proveedores que más ganaron estuvo HEMOSER, empresa que coincide con la firma conductual P2 (empresa fantasma) en el flujo ARIA de RUBLI. HEMOSER recibió MX$17.2 mil millones en contratos del IMSS durante la emergencia, buena parte en adjudicaciones del mismo día — el contrato firmado el día en que se registró la solicitud.',
          'El mismo día es el indicio forense. Aun con la competencia suspendida, una compra legítima todavía evalúa credenciales, valida capacidad y verifica que el precio sea razonable. Una adjudicación del mismo día omite todo eso, lo que significa que el proveedor fue elegido antes de que comenzara el papeleo. Y HEMOSER no fue único. El flujo P2 señaló 6,118 proveedores a nivel nacional con la misma firma: presencia física mínima, ingresos concentrados en una sola institución, alta volatilidad de precios. En 2020 esta clase de proveedor creció más rápido de lo que cualquier explicación de capacidad o demanda puede sostener. El modelo identifica conductas que se asemejan al fraude; no lo demuestra. Pero el patrón es lo que el requisito eliminado dejó pasar.',
        ],
        pullquote: {
          quote:
            'A same-day award means the vendor was selected before the paperwork started. There is no other explanation.',
          quote_es:
            'Una adjudicación del mismo día significa que el proveedor fue seleccionado antes de que comenzara el papeleo. No hay otra explicación.',
          stat: 'MX$17.2B',
          statLabel: 'HEMOSER COVID contracts · IMSS · same-day awards',
          statLabel_es: 'Contratos COVID HEMOSER · IMSS · adjudicaciones mismo día',
        },
        sources: [
          'Diario Oficial de la Federación. "Acuerdo por el que se declara como emergencia sanitaria." 30 marzo 2020.',
          'RUBLI v0.8.5. Módulo year-over-year. 215,000 contratos — 2020.',
          'RUBLI ARIA pipeline. Patrón P2 (empresa fantasma). 6,118 proveedores señalados.',
          'COMPRANET registros de contratos. Proveedor HEMOSER. 2019–2021 contratos con IMSS.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'What Never Came Back',
        title_es: 'Lo que nunca regresó',
        subtitle:
          "The emergency ended in 2021. The rate didn't. Why a removed barrier leaves no path back.",
        subtitle_es:
          'La emergencia terminó en 2021. La tasa no. Por qué una barrera eliminada no deja camino de regreso.',
        prose: [
          'The COVID emergency declaration was lifted in 2021. The direct-award rate should have fallen back toward the pre-COVID floor. It did not. In 2021 it was 81.2%. In 2022, 79.4%. In 2023 it reached 82.2% — higher than the post-emergency trough. Emergency procurement, it turns out, is a ratchet. It moves in one direction.',
          'The chart makes the rupture visible. The line runs from a pre-COVID baseline of 71.2% — a five-year average of 72.7% — up to the 2020 spike of 87, and then to a post-emergency floor that never returns below 79.4%, sitting 7 percentage points above the pre-COVID average. Two reference lines frame the fault: the 87% ratchet window at the top, the 71.2% baseline below it. Read across them and the year-by-year line stops being a trend and becomes a before-and-after.',
          "Behind the line is a structural verdict that spans five administrations and 23 years. Each administration inherits its predecessor's direct-award rate. None has managed a sustained reduction. The floor has never dropped below 60%, against an OECD target of 15-20%. By that measure 2020 is not an anomaly at all. It is the clearest possible reading of a system whose default is non-competition, where competition is the exception that must be justified.",
          'That is the reframe the year demands. The emergency did not corrupt the system. It removed the one requirement — justification — that kept the non-competitive default in check, and once removed, the requirement did not return. The line in time was crossed in one direction only.',
        ],
        prose_es: [
          'La declaratoria de emergencia COVID fue levantada en 2021. La tasa de adjudicación directa debió regresar hacia el piso pre-COVID. No lo hizo. En 2021 fue del 81.2%. En 2022, 79.4%. En 2023 llegó al 82.2% — mayor que el mínimo post-emergencia. La contratación de emergencia, resulta, es un trinquete. Se mueve en una sola dirección.',
          'La gráfica hace visible la ruptura. La línea corre desde una línea base pre-COVID de 71.2% — un promedio de cinco años de 72.7% — hasta el pico de 2020 de 87, y de ahí a un piso post-emergencia que nunca regresa por debajo del 79.4%, ubicándose 7 puntos porcentuales sobre el promedio pre-COVID. Dos líneas de referencia enmarcan la falla: la ventana del trinquete del 87% arriba, la línea base del 71.2% por debajo. Léanse en conjunto y la línea año a año deja de ser una tendencia y se vuelve un antes y un después.',
          'Detrás de la línea hay un veredicto estructural que abarca cinco administraciones y 23 años. Cada administración hereda la tasa de adjudicación directa de su predecesora. Ninguna ha logrado una reducción sostenida. El piso nunca ha bajado del 60%, contra un objetivo OCDE de 15-20%. Bajo esa medida, 2020 no es ninguna anomalía. Es la lectura más clara posible de un sistema cuyo default es la no-competencia, donde la competencia es la excepción que debe justificarse.',
          'Ese es el replanteamiento que el año exige. La emergencia no corrompió el sistema. Eliminó el único requisito — la justificación — que mantenía a raya el default no-competitivo, y una vez eliminado, el requisito no regresó. La línea en el tiempo se cruzó en una sola dirección.',
        ],
        chartConfig: {
          type: 'inline-timeline',
          title: 'The Line in Time · Direct-Award Rate, Annual 2015–2024',
          title_es: 'La línea en el tiempo · Tasa de adjudicación directa, anual 2015–2024',
          chartId: 'covid-da-rate-annual',
          data: {
            points: [
              {
                label: '2015',
                value: 71.2,
              },
              {
                label: '2016',
                value: 72.1,
              },
              {
                label: '2017',
                value: 73.5,
              },
              {
                label: '2018',
                value: 74.2,
              },
              {
                label: '2019',
                value: 72.3,
                annotation: 'pre-COVID floor',
                annotation_es: 'piso pre-COVID',
              },
              {
                label: '2020',
                value: 87,
                highlight: true,
                annotation: 'COVID peak',
                annotation_es: 'pico COVID',
              },
              {
                label: '2021',
                value: 81.2,
                highlight: true,
              },
              {
                label: '2022',
                value: 79.4,
                highlight: true,
                annotation: 'post-COVID trough',
                annotation_es: 'mínimo post-COVID',
              },
              {
                label: '2023',
                value: 82.2,
                highlight: true,
              },
              {
                label: '2024',
                value: 80.1,
                highlight: true,
              },
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
            annotation:
              'The 2020 spike never resets. The post-emergency floor sits 7pp above the pre-COVID average.',
            annotation_es:
              'El pico de 2020 no se reinicia. El piso post-emergencia queda 7pp sobre el promedio pre-COVID.',
          },
        },
        pullquote: {
          quote:
            'Emergency procurement is a ratchet. The COVID year proved that removing a barrier to direct award does not create a path back.',
          quote_es:
            'La contratación de emergencia es un trinquete. El año COVID demostró que eliminar una barrera a la adjudicación directa no crea un camino de regreso.',
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
      "Cross-reference the contracts awarded directly during the COVID emergency against the SAT's EFOS blacklist — how many of those vendors appear on the fiscal blacklist?",
      'Map the increase by agency: which secretariats posted the largest jumps in direct award during 2020?',
      'Check whether the 6,118 P2 vendors active in 2020 filed tax declarations consistent with the amounts collected from IMSS.',
    ],
    nextSteps_es: [
      'Cruzar los contratos adjudicados directamente durante la emergencia COVID con el listado EFOS del SAT — ¿cuántos de esos proveedores están en la lista negra fiscal?',
      'Analizar la distribución por dependencia: ¿qué secretarías tuvieron los mayores incrementos en adjudicación directa durante 2020?',
      'Investigar si los 6,118 proveedores P2 que operaron en 2020 presentaron declaraciones fiscales consistentes con los montos cobrados al IMSS.',
    ],
    caseIds: [],
    relatedSlugs: [],
    entities: [],
  },

  // === STORY 12: Inside the Closed Room: The 240-Billion-Peso Market Three Firms Keep Sealed ===
  {
    slug: 'el-cartel-de-los-vales',
    outlet: 'investigative',
    type: 'case',
    era: 'cross',
    byline: 'RUBLI Unidad de Análisis de Datos',
    status: 'auditado',
    estimatedMinutes: 8,
    headline: 'Inside the Closed Room: The 240-Billion-Peso Market Three Firms Keep Sealed',
    headline_es:
      'Dentro del cuarto cerrado: el mercado de 240 mil millones que tres empresas mantienen sellado',
    subheadline:
      "Mexico's federal voucher market routes 240 billion pesos to Edenred, Efectivale, and Sodexo — a room sealed by a 96.7% direct-award rate and 2,868 tenders that drew a single bidder, held shut across five administrations.",
    subheadline_es:
      'El mercado federal de vales de México canaliza 240 mil millones de pesos a Edenred, Efectivale y Sodexo — un cuarto sellado por una tasa de adjudicación directa del 96.7% y 2,868 licitaciones que atrajeron a un solo postor, cerrado a través de cinco administraciones.',
    leadStat: {
      value: '96.7%',
      label: 'The door-lock: Edenred direct-award rate',
      label_es: 'La cerradura: tasa de adjudicación directa de Edenred',
      sublabel: '2,210 contracts · every one entered through IMSS direct award',
      sublabel_es: '2,210 contratos · todos entraron por adjudicación directa del IMSS',
      color: '#dc2626',
    },
    kickerStats: [
      {
        prefix: 'Behind the locked door:',
        value: '240 mil M',
        suffix: 'MXN held by 3 proveedores.',
        tone: 'data',
      },
      {
        prefix: 'Efectivale ganó',
        value: '2,210',
        suffix: 'licitaciones con un solo postor.',
        tone: 'critical',
      },
      {
        prefix: 'Edenred:',
        value: '96.7%',
        suffix: 'de sus contratos no pasan por competencia.',
        tone: 'critical',
      },
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
        title: 'The Room You Were Never Meant to See',
        title_es: 'El cuarto que nunca debías ver',
        subtitle: 'A 240-billion-peso federal market with three permanent tenants',
        subtitle_es: 'Un mercado federal de 240 mil millones con tres inquilinos permanentes',
        prose: [
          'Stand at the threshold for a moment. Every year the Mexican federal government distributes hundreds of billions of pesos through vouchers and electronic payment cards — for food, gasoline, school supplies, and social transfers. The money fans out across millions of beneficiaries, but the procurement that decides who issues the cards funnels almost entirely into one room. Inside sit three multinational tenants: Edenred (formerly Accor Services), Efectivale, and Sodexo.',
          'The figure that circulates inside is 240 billion MXN — the total federal voucher spend concentrated in those three vendors. It is a large number, but on its own it is not the story. A procurement category can be large and still be open; 240 billion is not exceptional for a federal market. What is exceptional is the door. This one is locked.',
          "Look at who is seated where, and the lock comes into focus. Edenred enters its federal contracts through direct award 96.7% of the time. Efectivale's direct-award rate is 92.4%; Sodexo's is 88.1%. All three sit above 88% against an OECD ceiling for direct award of 30% — the threshold above which an open market is no longer behaving like one. RUBLI reads this seating chart as a P5 institutional-concentration signature: a handful of vendors holding an entire sector's procurement through a mix of direct award and nominally competitive procedures.",
          'There is no obvious thief in this room. These are real multinationals with real operations, not shell companies invented to drain a budget line. The door is not sealed by a single crime; it is sealed structurally — by a market allowed to consolidate past the point where competition was possible, and by procurement rules that adapted to the consolidated market rather than prying it back open. The chapters that follow walk through how the door stays shut, and why no government has turned the key.',
        ],
        prose_es: [
          'Deténgase un momento en el umbral. Cada año el gobierno federal mexicano distribuye cientos de miles de millones de pesos a través de vales y tarjetas de pago electrónicas — para alimentos, gasolina, útiles escolares y transferencias sociales. El dinero se reparte entre millones de beneficiarios, pero la contratación que decide quién emite las tarjetas desemboca casi por completo en un solo cuarto. Dentro están sentados tres inquilinos multinacionales: Edenred (antes Accor Services), Efectivale y Sodexo.',
          'La cifra que circula dentro es de 240 mil millones de MXN — el gasto federal total en vales concentrado en esos tres proveedores. Es un número grande, pero por sí solo no es la historia. Una categoría de contratación puede ser grande y aun así estar abierta; 240 mil millones no es excepcional para un mercado federal. Lo excepcional es la puerta. Esta está cerrada con llave.',
          'Observe quién está sentado dónde, y la cerradura se vuelve nítida. Edenred entra a sus contratos federales por adjudicación directa el 96.7% de las veces. La tasa de adjudicación directa de Efectivale es del 92.4%; la de Sodexo, del 88.1%. Las tres están por encima del 88% frente a un techo OCDE para adjudicación directa del 30% — el umbral por encima del cual un mercado abierto ya no se comporta como tal. RUBLI lee esta distribución de asientos como una firma P5 de concentración institucional: un puñado de proveedores reteniendo toda la contratación de un sector mediante una mezcla de adjudicación directa y procedimientos nominalmente competitivos.',
          'No hay un ladrón evidente en este cuarto. Son multinacionales reales con operaciones reales, no empresas fantasma inventadas para vaciar una partida presupuestal. La puerta no está sellada por un solo delito; está sellada de forma estructural — por un mercado al que se permitió consolidarse más allá del punto donde la competencia era posible, y por reglas de contratación que se adaptaron al mercado consolidado en lugar de volver a abrirlo. Los capítulos que siguen recorren cómo se mantiene cerrada la puerta, y por qué ningún gobierno ha girado la llave.',
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'The seating chart of the closed room — top 3 by direct-award rate',
          title_es:
            'La distribución de asientos del cuarto cerrado — top 3 por tasa de adjudicación directa',
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
            annotation:
              'All three above 88% direct-award. OECD ceiling for direct award: 30%. The voucher market has no competitive check.',
            annotation_es:
              'Las tres por encima del 88% de adjudicación directa. Techo OCDE para adjudicación directa: 30%. El mercado de vales carece de control competitivo.',
          },
        },
        pullquote: {
          quote:
            'The 240 billion pesos inside the room are not the story. The locked door is. A market can be large and still be open — this one is neither.',
          quote_es:
            'Los 240 mil millones de pesos dentro del cuarto no son la historia. La puerta cerrada lo es. Un mercado puede ser grande y aun así estar abierto — este no es ninguna de las dos cosas.',
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
        title: 'How the Door Stays Shut',
        title_es: 'Cómo se mantiene cerrada la puerta',
        subtitle: 'Two locks: the direct-award bypass and the single-bidder ritual',
        subtitle_es:
          'Dos cerraduras: el atajo de adjudicación directa y el ritual del postor único',
        prose: [
          'A door this durable does not rely on one lock. The voucher room has two, and they work in sequence.',
          "The first lock is the bypass. Edenred's 96.7% direct-award rate means the competitive door is almost never opened at all — 2,210 contracts, every one of them entered through IMSS direct award, with no tender to win or lose. When the rules permit the buyer to skip the open process, the question of who would have competed never arises. The bypass is blunt, visible, and entirely legal.",
          'The second lock is subtler, and it is where the room does its quiet work. When a tender is held, it draws one bidder. Efectivale won 2,210 single-bid competitions; Sodexo won 658 more — 2,868 nominally competitive tenders in which a single firm appeared. RUBLI defines the flag precisely: is_single_bid is set when procedure_type is not direct_award and vendor_count_per_procedure equals 1. In other words, these are competitive procedures on paper — a published notice, a formal process under Mexican procurement law — whose outcome is settled the moment only one firm shows up. The competition is performed for the record. It is theater.',
          "How does a room produce single-bid outcomes at this scale without anyone naming a culprit? Specifications can be written around an incumbent's payment network or card format, so that only one vendor can technically comply. Timelines can be compressed so that only a firm with advance notice can assemble a bid. Distribution requirements can be drawn to favor the firm already inside. Each is a way of holding the door while appearing to open it.",
          "The values carried through that second lock are not trivial: Efectivale's single-bid contracts total 19.6 billion pesos; Sodexo's, 5.2 billion. RUBLI cannot say which mechanism produced any single outcome — only the aggregate. Across hundreds of exercises that nominally involved competition, the same firms were the only bidders at a rate market structure alone cannot explain.",
        ],
        prose_es: [
          'Una puerta tan duradera no depende de una sola cerradura. El cuarto de los vales tiene dos, y funcionan en secuencia.',
          'La primera cerradura es el atajo. La tasa de adjudicación directa del 96.7% de Edenred significa que la puerta competitiva casi nunca se abre — 2,210 contratos, todos entrados por adjudicación directa del IMSS, sin licitación que ganar o perder. Cuando las reglas permiten al comprador saltarse el proceso abierto, la pregunta de quién habría competido nunca surge. El atajo es burdo, visible y enteramente legal.',
          'La segunda cerradura es más sutil, y es donde el cuarto hace su trabajo silencioso. Cuando se celebra una licitación, atrae a un solo postor. Efectivale ganó 2,210 competencias de oferta única; Sodexo ganó 658 más — 2,868 licitaciones nominalmente competitivas en las que apareció una sola empresa. RUBLI define la bandera con precisión: is_single_bid se activa cuando procedure_type no es direct_award y vendor_count_per_procedure es igual a 1. Es decir, son procedimientos competitivos en papel — una convocatoria publicada, un proceso formal bajo la ley mexicana de contratación — cuyo resultado queda zanjado en el momento en que sólo una empresa se presenta. La competencia se actúa para el expediente. Es teatro.',
          '¿Cómo produce un cuarto resultados de oferta única a esta escala sin que nadie nombre a un culpable? Las especificaciones pueden redactarse alrededor de la red de pago o el formato de tarjeta de un incumbente, de modo que sólo un proveedor pueda cumplir técnicamente. Los plazos pueden comprimirse para que sólo una empresa con información anticipada pueda armar una oferta. Los requisitos de distribución pueden trazarse para favorecer a la empresa que ya está dentro. Cada uno es una forma de sostener la puerta mientras se aparenta abrirla.',
          'Los montos que pasan por esa segunda cerradura no son menores: los contratos de oferta única de Efectivale suman 19.6 mil millones de pesos; los de Sodexo, 5.2 mil millones. RUBLI no puede decir qué mecanismo produjo ningún resultado individual — sólo el agregado. A través de cientos de ejercicios que nominalmente involucraron competencia, las mismas empresas fueron los únicos postores a una tasa que la estructura del mercado por sí sola no puede explicar.',
        ],
        pullquote: {
          quote:
            "2,210 competitive tenders, 2,210 times a single bidder appeared. At some point, 'competitive procedure' becomes a ritual performed for the record.",
          quote_es:
            "2,210 licitaciones competitivas, 2,210 veces apareció un solo postor. En algún punto, 'procedimiento competitivo' se convierte en un ritual actuado para el expediente.",
          stat: '2,210',
          statLabel: 'Single-bid wins · Efectivale · all federal procurement',
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
        title: 'Five Governments, One Key Nobody Turns',
        title_es: 'Cinco gobiernos, una llave que nadie gira',
        subtitle: 'Why the lock survives every change of administration',
        subtitle_es: 'Por qué la cerradura sobrevive a cada cambio de administración',
        prose: [
          'The clearest evidence that the lock is structural is that it outlasts everyone. Fox, Calderón, Peña Nieto, AMLO, Sheinbaum — five administrations and three political parties have walked through the federal government, and every one of them has bought from the same three tenants.',
          "That permanence is what sets this apart. Most corruption stories are about a network feeding off one administration's patronage; the network rises with a president and falls with him. The voucher oligopoly does the opposite. It predates every government on the list and survives the next one. A patronage scheme tied to a single sexenio could not do that. Something more durable is holding the door.",
          'The durable thing is infrastructure. Welfare vouchers are a natural monopoly masked as a market. The point-of-sale network, the beneficiary databases, the card-issuance systems all demand massive upfront investment, and once built they create lock-in that no single tender can undo. The incumbent has already paid for the key. A challenger would have to forge a duplicate — and would have to do it while also winning the very contract that would justify forging it. The economics make entry irrational, so no one enters, so the room stays full of the same three names.',
          'Here the honest framing has to be stated plainly. RUBLI does not have evidence that these firms commit fraud in the legal sense. The P5 signature they carry is a market-structure flag, not a fraud flag, and the distinction is real. But the distinction does not soften the outcome, because the outcome is identical either way: 240 billion pesos, five administrations, three vendors, no competitive check on any of it.',
          "Which is the closed-room metaphor's last turn. The door stays sealed not because someone built a vault to hide a theft, but because no government has been willing to redesign procurement to open it. The key exists. It has simply never been turned.",
        ],
        prose_es: [
          'La prueba más clara de que la cerradura es estructural es que sobrevive a todos. Fox, Calderón, Peña Nieto, AMLO, Sheinbaum — cinco administraciones y tres partidos políticos han pasado por el gobierno federal, y cada uno de ellos compró a los mismos tres inquilinos.',
          'Esa permanencia es lo que la distingue. La mayoría de las historias de corrupción tratan de una red que se alimenta del patrocinio de una sola administración; la red sube con un presidente y cae con él. El oligopolio de los vales hace lo contrario. Antecede a cada gobierno de la lista y sobrevive al siguiente. Un esquema de patrocinio atado a un solo sexenio no podría lograrlo. Algo más duradero sostiene la puerta.',
          'Lo duradero es la infraestructura. Los vales de bienestar son un monopolio natural disfrazado de mercado. La red de puntos de venta, las bases de datos de beneficiarios, los sistemas de emisión de tarjetas exigen una enorme inversión inicial, y una vez construidos crean una dependencia que ninguna licitación individual puede deshacer. El incumbente ya pagó por la llave. Un retador tendría que forjar un duplicado — y tendría que hacerlo mientras gana el mismísimo contrato que justificaría forjarlo. La economía vuelve irracional la entrada, así que nadie entra, así que el cuarto sigue lleno de los mismos tres nombres.',
          'Aquí hay que decir el encuadre honesto con claridad. RUBLI no tiene evidencia de que estas empresas cometan fraude en el sentido legal. La firma P5 que portan es una bandera de estructura de mercado, no una bandera de fraude, y la distinción es real. Pero la distinción no suaviza el resultado, porque el resultado es idéntico en cualquier caso: 240 mil millones de pesos, cinco administraciones, tres proveedores, sin ningún control competitivo sobre nada de ello.',
          'Y este es el último giro de la metáfora del cuarto cerrado. La puerta permanece sellada no porque alguien haya construido una bóveda para ocultar un robo, sino porque ningún gobierno ha estado dispuesto a rediseñar la contratación para abrirla. La llave existe. Simplemente nunca se ha girado.',
        ],
        pullquote: {
          quote:
            'Fox, Calderón, Peña Nieto, AMLO, Sheinbaum. Five administrations, three parties, the same three companies. The key exists — no government has turned it.',
          quote_es:
            'Fox, Calderón, Peña Nieto, AMLO, Sheinbaum. Cinco administraciones, tres partidos, las mismas tres empresas. La llave existe — ningún gobierno la ha girado.',
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
      'Investigar si los contratos con Edenred y Efectivale contienen cláusulas de exclusividad que estructuralmente cierran la puerta a la competencia.',
      'Cruzar los montos de contratos de vales contra el número de beneficiarios de programas sociales — ¿el costo por beneficiario ha aumentado en términos reales desde 2010?',
      'Verificar si algún funcionario que aprobó contratos de vales trabaja ahora para Edenred, Efectivale o Sodexo (puerta giratoria).',
    ],
    nextSteps_es: [
      'Investigar si los contratos con Edenred y Efectivale contienen cláusulas de exclusividad que estructuralmente cierran la puerta a la competencia.',
      'Cruzar los montos de contratos de vales contra el número de beneficiarios de programas sociales — ¿el costo por beneficiario ha aumentado en términos reales desde 2010?',
      'Verificar si algún funcionario que aprobó contratos de vales trabaja ahora para Edenred, Efectivale o Sodexo (puerta giratoria).',
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getStoryBySlug(slug: string): StoryDef | undefined {
  return STORIES.find((s) => s.slug === slug)
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
  lang: 'en' | 'es'
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
  lang: 'en' | 'es'
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
            ? {
                ...cfg.data.referenceLine,
                label: pickLang(
                  cfg.data.referenceLine.label,
                  cfg.data.referenceLine.label_es,
                  lang
                ) as string,
              }
            : cfg.data.referenceLine,
          referenceLine2: cfg.data.referenceLine2
            ? {
                ...cfg.data.referenceLine2,
                label: pickLang(
                  cfg.data.referenceLine2.label,
                  cfg.data.referenceLine2.label_es,
                  lang
                ) as string,
              }
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
              ? {
                  ...s.annotation,
                  text: pickLang(s.annotation.text, s.annotation.text_es, lang) as string,
                }
              : s.annotation,
          })),
        }
      : cfg.multiSeries,
    network: cfg.network
      ? {
          ...cfg.network,
          annotation: pickLang(cfg.network.annotation, cfg.network.annotation_es, lang),
          anchor: cfg.network.anchor
            ? {
                ...cfg.network.anchor,
                label: pickLang(
                  cfg.network.anchor.label,
                  cfg.network.anchor.label_es,
                  lang
                ) as string,
              }
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
            ? {
                ...cfg.stacked.anchor,
                label: pickLang(
                  cfg.stacked.anchor.label,
                  cfg.stacked.anchor.label_es,
                  lang
                ) as string,
              }
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
  lang: 'en' | 'es'
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
          statLabel: pickLang(
            chapter.pullquote.statLabel,
            chapter.pullquote.statLabel_es,
            lang
          ) as string,
          barLabel: pickLang(chapter.pullquote.barLabel, chapter.pullquote.barLabel_es, lang),
        }
      : undefined,
    chartConfig: localizeChartConfig(chapter.chartConfig, lang),
  }
}

/** Resolve a story's display fields per language, with EN fallback. */
export function localizeStory(
  story: StoryDef,
  lang: 'en' | 'es'
): {
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
    .map((s) => getStoryBySlug(s))
    .filter((s): s is StoryDef => s !== undefined)
}
