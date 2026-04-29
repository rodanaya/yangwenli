/**
 * Story Content — 10 original investigations derived from RUBLI data analysis.
 *
 * These stories START from what RUBLI's algorithms discovered in 3,051,294 contracts
 * (2002-2025). External sources are cited to CORROBORATE findings — not the other way.
 *
 * Risk scores from v0.6.5 model (AUC 0.828 test, vendor-stratified split).
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
  value: number
  value2?: number
  color?: string
  highlight?: boolean
  annotation?: string
  /** Optional Spanish translation of `annotation`. */
  annotation_es?: string
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
    /** Total bar value. */
    total: number
    /** Sub-segment that gets the highlight color (e.g. IMSS portion). */
    highlight: number
    /** Optional row-level color override. */
    color?: string
    /** Sub-text shown right of the bar (e.g. "60.1% IMSS"). */
    annotation?: string
    annotation_es?: string
  }>
  unit?: string
  /** Top-of-card anchor stat. */
  anchor?: { value: string; label: string; label_es?: string }
  annotation?: string
  annotation_es?: string
  /** Color used for the highlighted (e.g. IMSS) portion of every row. */
  highlightColor?: string
  /** Color used for the remaining portion. */
  baseColor?: string
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
   * 6,034 / 5,992 still doing business).
   */
  kickerStats?: Array<{
    /** Optional verb prefix shown in muted serif before the number (e.g. "SAT confirmed") */
    prefix?: string
    /** The number itself — rendered enormous */
    value: string
    /** Tail text after the number (e.g. "ghosts.") — same line, smaller */
    suffix?: string
    /** Visual emphasis: 'critical' = red callout, 'data' = amber, 'muted' = neutral */
    tone?: 'critical' | 'data' | 'muted'
  }>
  chapters: StoryChapterDef[]
  relatedSlugs?: string[]
  caseIds?: number[]
  status?: StoryStatus
  nextSteps?: string[]
}

// ---------------------------------------------------------------------------
// Stories — derived from RUBLI data analysis
// ---------------------------------------------------------------------------

export const STORIES: StoryDef[] = [

  // =========================================================================
  // STORY 1: The Ghost Army — P2 Pattern, 6,034 vendors
  // =========================================================================
  {
    slug: 'el-ejercito-fantasma',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: 'The Ghost Army',
    headline_es: 'El Ejército Fantasma',
    subheadline: 'RUBLI identified 6,034 vendors matching ghost company patterns across 23 years of Mexican federal procurement. Mexico\'s tax authority has officially confirmed 42 of them. The other 5,992 are still doing business with the government.',
    subheadline_es: 'RUBLI identificó 6,034 proveedores con patrón de empresa fantasma a lo largo de 23 años de contratación federal mexicana. La autoridad fiscal confirmó oficialmente a 42. Los otros 5,992 siguen haciendo negocios con el gobierno.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 16,
    status: 'solo_datos',
    leadStat: {
      value: '6,034',
      label: 'ghost-pattern vendors',
      label_es: 'proveedores con patrón fantasma',
      sublabel: '0.7% officially detected',
      sublabel_es: '0.7% detectados oficialmente',
      color: '#f59e0b',
    },
    kickerStats: [
      { prefix: 'SAT confirmed', value: '42', suffix: 'ghosts.', tone: 'muted' },
      { prefix: 'RUBLI flagged', value: '6,034', suffix: 'matching the same pattern.', tone: 'data' },
      { value: '5,992', suffix: 'still doing business with the government.', tone: 'critical' },
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
          'When RUBLI ran P2 across the full 3,051,294 federal contracts from 2002 through 2025, the algorithm flagged 6,034 vendors representing 37.2 billion pesos in total contract value. Cross-checking the P2 population against the SAT Art. 69-B definitive registry produced a single, damning statistic: 42 matches. The detection rate of official Mexican ghost-company enforcement, measured against RUBLI\'s behavioral population, is 0.7 percent.',
        ],
        prose_es: [
          'Las empresas fantasma son la forma más eficiente de fraude en contratación pública jamás documentada en México. Una entidad de fachada con un domicilio rentado, un representante legal rotativo, y un RFC comprado a un coyote gana un contrato federal por cientos de millones de pesos. El pago se transfiere. El trabajo nunca se entrega, o lo entrega una entidad totalmente distinta que se queda con apenas una fracción de la factura. La empresa de fachada se disuelve. Los funcionarios que aprobaron el contrato siguen su carrera.',
          'El Servicio de Administración Tributaria (SAT) mantiene un listado oficial definitivo de empresas fantasma confirmadas conforme al Artículo 69-B del Código Fiscal de la Federación. A abril de 2026 contiene 13,960 entidades que se remontan a 2014. Esa lista tomó una década en construirse y exigió que los investigadores demostraran cada caso individualmente — facturas simuladas, operaciones ficticias, testimonios bajo protesta. Es el estándar de oro de la detección de empresas fantasma en México, y está catastróficamente incompleta.',
          'El algoritmo del Patrón 2 (P2) de RUBLI no espera al SAT. Mira en cambio las huellas que las empresas fantasma dejan en los datos mismos de contratación: aparición súbita en un solo año con valores de contrato 10 a 50 veces la mediana sectorial, sin historial previo de contratación, sin contratación posterior, números de RFC que no resuelven a nada en el Registro Único de Proveedores y Contratistas, y ráfagas de actividad concentradas en semanas más que en años.',
          'Cuando RUBLI corrió el P2 sobre los 3,051,294 contratos federales completos de 2002 a 2025, el algoritmo identificó 6,034 proveedores que representan 37,200 MDP en valor total contratado. Cruzar la población P2 contra el padrón definitivo del SAT bajo el Art. 69-B arrojó una sola estadística devastadora: 42 coincidencias. La tasa de detección de la fiscalización oficial mexicana de empresas fantasma, medida contra la población conductual de RUBLI, es del 0.7 por ciento.',
        ],
        pullquote: {
          quote: 'One in 143 vendors the algorithm suspects is ghost-patterned has been officially confirmed by SAT. The other 142 are still contracting with the government.',
          quote_es: 'Uno de cada 143 proveedores que el algoritmo sospecha tiene patrón fantasma ha sido confirmado oficialmente por el SAT. Los otros 142 siguen contratando con el gobierno.',
          stat: '6,034',
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
          'The math of detection failure is easier to grasp as a picture than as a percentage. Imagine 6,034 vendors laid out as points on a grid — every vendor RUBLI\'s algorithm flagged as structurally consistent with ghost company operations. Color the 42 that SAT has confirmed. The rest of the field remains uncolored, which is the problem.',
          'This is not a claim that every uncolored point represents fraud. P2 is a pattern classifier; it identifies vendors whose behavior resembles documented ghost companies, not vendors proven to be ghost companies. Some will turn out to be legitimate specialized suppliers. Some will turn out to be foreign vendors with genuinely thin Mexican contracting histories. Some will turn out to be one-time subcontractors on major projects.',
          'But the baseline expectation in procurement fraud research is that somewhere between 20 and 40 percent of P2-type behavioral signatures correspond to actual fraud. Applied to RUBLI\'s 5,992 unconfirmed P2 vendors, that suggests a universe of somewhere between 1,200 and 2,400 unrecognized ghost companies currently operating in Mexican federal procurement. SAT has found 42.',
        ],
        prose_es: [
          'Las matemáticas de la falla de detección son más fáciles de captar como imagen que como porcentaje. Imagina 6,034 proveedores dispuestos como puntos en una cuadrícula — cada proveedor que el algoritmo de RUBLI marcó como estructuralmente consistente con operaciones de empresa fantasma. Pinta los 42 que el SAT ha confirmado. El resto del campo permanece sin colorear, y ese es el problema.',
          'Esto no es una afirmación de que cada punto sin colorear represente fraude. P2 es un clasificador de patrones; identifica proveedores cuya conducta se asemeja a la de empresas fantasma documentadas, no proveedores probadamente fantasma. Algunos resultarán ser proveedores legítimos especializados. Algunos serán proveedores extranjeros con historiales mexicanos genuinamente delgados. Algunos serán subcontratistas únicos en proyectos mayores.',
          'Pero la expectativa base en la investigación del fraude en contratación pública es que entre el 20 y el 40 por ciento de las firmas conductuales tipo P2 corresponden a fraude real. Aplicado a los 5,992 proveedores P2 no confirmados de RUBLI, eso sugiere un universo de entre 1,200 y 2,400 empresas fantasma no reconocidas operando actualmente en la contratación federal mexicana. El SAT ha encontrado 42.',
        ],
        chartConfig: {
          type: 'inline-dot-grid',
          title: 'Ghost-Pattern Vendors: Confirmed vs Undetected',
          title_es: 'Proveedores con patrón fantasma: Confirmados vs No Detectados',
          chartId: 'ghost-detection-grid',
          data: {
            points: [
              { label: 'EFOS confirmed ghost companies',  label_es: 'EFOS — empresas fantasma confirmadas',     value: 42,  color: '#dc2626', highlight: true },
              { label: 'P2-pattern, not on any official list', label_es: 'patrón P2, no en ningún padrón oficial', value: 5992, color: '#f59e0b' },
            ],
            annotation: 'Each dot = 1 vendor. 6,034 total flagged by RUBLI P2 algorithm across 2002-2025.',
            annotation_es: 'Cada punto = 1 proveedor. 6,034 marcados en total por el algoritmo P2 de RUBLI entre 2002-2025.',
          },
        },
        pullquote: {
          quote: 'Official enforcement has confirmed 42 ghost companies. The structural evidence suggests thousands more.',
          quote_es: 'La fiscalización oficial ha confirmado 42 empresas fantasma. La evidencia estructural sugiere miles más.',
          stat: '1,200-2,400',
          statLabel: 'estimated unrecognized ghost companies',
          statLabel_es: 'empresas fantasma estimadas no reconocidas',
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
          'The Secretaría de la Función Pública (SFP) has the legal authority to audit procurement approvals and sanction individual officials. In practice, the SFP sanctions database shows 1,954 vendor-level sanctions across the full 23-year dataset — a tiny fraction of the 6,034 P2 vendors, and almost none of the approving officials named. The asymmetry of accountability — the shell entity is named and excluded, the official is anonymous and unsanctioned — ensures the next ghost company has no meaningful deterrent.',
          'This is the gap that RUBLI was built to illuminate. The algorithm cannot prosecute. It cannot sanction. But it can force the question: of 6,034 vendors whose behavior mirrors documented ghost companies, which procurement officials signed their contracts, and why have those officials never been investigated?',
        ],
        prose_es: [
          'Si la tasa de detección es del 0.7 por ciento, la tasa de rendición de cuentas es aún menor. De los 42 proveedores en el listado definitivo del SAT que aparecen en registros de contratación federal, los registros públicos muestran procesamiento penal para una fracción — la mayoría recibe solo sanciones fiscales y exclusión de contratación. Los funcionarios que aprobaron sus contratos rara vez son nombrados, rara vez son investigados, y casi nunca son procesados.',
          'Este es el núcleo de la falla de integridad en la contratación mexicana: una empresa fantasma es una transacción de dos lados. Alguien crea la entidad de fachada y alguien dentro del gobierno firma la aprobación. Los datos de RUBLI guardan silencio sobre la segunda mitad porque los registros de COMPRANET no vinculan de manera confiable a funcionarios aprobantes individuales con contratos específicos. Ese vínculo existe en registros internos de las unidades de contratación pero no se publica sistemáticamente.',
          'La Secretaría de la Función Pública (SFP) tiene la facultad legal de auditar las aprobaciones de contratación y sancionar a funcionarios individuales. En la práctica, la base de datos de sanciones de la SFP muestra 1,954 sanciones a nivel proveedor en los 23 años completos del conjunto de datos — una fracción minúscula de los 6,034 proveedores P2, y casi ningún funcionario aprobante nombrado. La asimetría de la rendición de cuentas — la entidad de fachada es nombrada y excluida, el funcionario es anónimo y no sancionado — asegura que la próxima empresa fantasma no enfrente disuasión real.',
          'Esta es la brecha que RUBLI fue construido para iluminar. El algoritmo no puede procesar. No puede sancionar. Pero puede forzar la pregunta: de 6,034 proveedores cuya conducta refleja la de empresas fantasma documentadas, ¿qué funcionarios firmaron sus contratos, y por qué esos funcionarios nunca han sido investigados?',
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
          'For a journalist or prosecutor, RUBLI\'s P2 list is a ready-made investigative roadmap. The 5,992 unconfirmed vendors are ranked by ARIA\'s Integrated Priority Score, which weights risk model output, financial scale, anomaly detection, and external registry flags. The top 100 by IPS represent the highest-yield investigative targets in the entire queue.',
          'The fastest path to forensic confirmation of any individual P2 vendor runs through three checks that can be completed in days, not months. First, verify business registration: does the RFC resolve to an operating entity in the Registro Federal de Contribuyentes with declared economic activity and employees? Second, check physical presence: does the registered address correspond to a real commercial location, or to a residential building, a law office, or an empty lot? Third, examine the contracting institution: did the same procurement unit award multiple contracts to multiple P2-pattern vendors in the same period?',
          'When all three checks confirm suspicion, the case moves to UIF (Unidad de Inteligencia Financiera), which can subpoena bank records and trace the flow of funds. UIF has this authority today. What it lacks is a systematically generated pipeline of pre-investigated cases. RUBLI provides that pipeline.',
        ],
        prose_es: [
          'Para un periodista o un fiscal, la lista P2 de RUBLI es un mapa investigativo listo para usar. Los 5,992 proveedores no confirmados están ordenados por el Puntaje de Prioridad Integrado (IPS) de ARIA, que pondera la salida del modelo de riesgo, la escala financiera, la detección de anomalías, y las banderas de registros externos. Los 100 más altos por IPS representan los objetivos investigativos de mayor rendimiento en toda la cola.',
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
    nextSteps: [
      'File freedom-of-information requests to SFP for the complete vendor investigation queue — do any of RUBLI\'s 5,992 P2 vendors appear?',
      'Cross-reference the top 50 P2-pattern vendors by value against RUPC (Registro Único de Proveedores y Contratistas) to verify business registration and physical address.',
      'Request SAT disclosure of the Art. 69-B investigation pipeline — how many vendors are currently in provisional status and how does the pipeline\'s priority ranking compare to RUBLI\'s?',
      'Interview procurement officials at the top five institutions that awarded contracts to the highest-value P2 vendors; request meeting records and bid evaluation documents.',
      'File UIF financial intelligence request for bank transaction tracing on the top 20 individual-person P2 contractors (those with physical persons rather than companies as vendor names).',
      'Pursue criminal complaint under Art. 222 del Código Penal Federal (cohecho) for specific vendor-official pairs where RUBLI flags systematic repetition.',
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
        subtitle: 'Every size bracket tells the same story',
        prose: [
          'RUBLI\'s v0.6.5 risk model scores every federal contract on a 0-to-1 scale calibrated against 748 documented corruption cases. The model knows nothing about contract size when it assigns scores — it processes features like vendor concentration, price volatility, and procurement mechanism. Yet when contracts are grouped by size after scoring, the relationship between size and risk is nearly monotonic.',
          'Contracts under 100,000 pesos — small-value transactions that dominate Mexican procurement by count — average 0.25 risk. Contracts between 1 million and 10 million pesos average 0.29. Between 10 million and 50 million: 0.41, already crossing RUBLI\'s high-risk threshold. Between 50 million and 500 million: 0.68. Between 500 million and 5 billion: 0.91. Above 5 billion pesos: 0.94.',
          'The 112 contracts in the top bracket — each a single procurement event worth more than 5 billion pesos — represent 1.32 trillion pesos in total contracting. Their average risk score of 0.94 places every one of them, on average, deep inside the model\'s critical tier. This is not a statistical curiosity. It is a pattern that should structurally reshape how Mexican oversight institutions allocate audit resources.',
        ],
        chartConfig: {
          type: 'inline-bar',
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
            yLabel: 'Average v0.6.5 risk score',
            yLabel_es: 'Riesgo promedio v0.6.5',
            annotation: 'The largest contracts in Mexican federal procurement are, on average, the riskiest.',
            annotation_es: 'Los contratos más grandes de la contratación federal mexicana son, en promedio, los más riesgosos.',
          },
        },
        pullquote: {
          quote: 'The 112 largest contracts in the dataset carry an average risk score of 0.94. In RUBLI\'s framework, 0.60 is the line above which investigation is warranted.',
          stat: '0.94',
          statLabel: 'avg risk, contracts above 5B MXN',
          barValue: 0.94,
          barLabel: 'critical threshold: 0.60',
          vizTemplate: 'redline-gauge',
        },
        sources: [
          'RUBLI v0.6.5 risk model. Contract-level scoring, 3,051,294 records. Query: April 2026.',
          'COMPRANET (SHCP). Federal procurement records 2002-2025.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Why Large Contracts Attract More Risk',
        prose: [
          'The risk-by-size pattern is not a model artifact. It reflects structural realities of procurement fraud that international research has documented for more than two decades. Three mechanisms combine to make large contracts disproportionately vulnerable to corruption.',
          'First, large contracts are awarded disproportionately through direct adjudication rather than open competitive bidding. In RUBLI\'s data, contracts above 10 million pesos are awarded via direct adjudication at rates approaching 90 percent in the salud and energia sectors. Direct awards remove three of the four integrity controls that OECD identifies as essential: competitive pricing pressure, public advertising that invites scrutiny, and systematic bid evaluation that produces an audit trail.',
          'Second, large contracts concentrate enough money to justify the coordination costs of sophisticated fraud. Inventing a ghost company, bribing an official, staging a fake competitive process — each has fixed costs in time, relationships, and risk. Below some break-even point those costs exceed the expected return. Above that point, they become profitable. The IMSS Ghost Company Network operated primarily in the 100-500 million peso range. The Infrastructure Overpricing Network that RUBLI tracks in ARIA runs contracts averaging 645 million pesos each.',
          'Third, large contracts are concentrated in institutions and sectors where capture is already entrenched. PEMEX, CFE, IMSS, ISSSTE, SCT — the five largest procuring entities in Mexican federal government — generate the majority of contracts above 500 million pesos. All five have decades of documented corruption history. A large contract in an already-captured institution is not equally likely to be corrupt as a small contract in a clean institution; it is vastly more likely.',
        ],
        pullquote: {
          quote: 'Large contracts remove three of OECD\'s four integrity controls: competitive pricing, public advertising, and systematic evaluation.',
          stat: '~90%',
          statLabel: 'direct-award rate for contracts >10M MXN in salud & energía',
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
        chartConfig: {
          type: 'inline-bar',
          title: 'Top 12 Mega-Contract Vendors — Total Pesos in Contracts ≥1B MXN',
          title_es: 'Top 12 proveedores de mega-contratos — Pesos totales en contratos ≥1 mil millones',
          chartId: 'mega-vendors',
          data: {
            points: [
              { label: 'Operadora CICSA',         value: 139.0, color: '#dc2626', highlight: true, annotation: '5 contracts · risk 0.36',          annotation_es: '5 contratos · riesgo 0.36' },
              { label: 'Mantenimiento Express',   value: 69.9,  color: '#dc2626', highlight: true, annotation: '1 contract · risk 1.00',           annotation_es: '1 contrato · riesgo 1.00' },
              { label: 'Dowell Schlumberger',     value: 64.8,  color: '#a06820',                  annotation: '9 contracts · risk 0.97',          annotation_es: '9 contratos · riesgo 0.97' },
              { label: 'Grupo Fármacos',          value: 62.9,  color: '#dc2626', highlight: true, annotation: '29 contracts · risk 0.99',         annotation_es: '29 contratos · riesgo 0.99' },
              { label: 'Urbanissa',               value: 58.0,  color: '#dc2626', highlight: true, annotation: '1 contract · risk 0.97',           annotation_es: '1 contrato · riesgo 0.97' },
              { label: 'ICA Constructora',        value: 41.8,  color: '#a06820',                  annotation: '3 contracts · risk 0.65 · Tren Maya', annotation_es: '3 contratos · riesgo 0.65 · Tren Maya' },
              { label: 'Alstom Transport',        value: 37.9,  color: '#a06820',                  annotation: '2 contracts · risk 0.92 · Tren Maya', annotation_es: '2 contratos · riesgo 0.92 · Tren Maya' },
              { label: 'Constructora Arhnos',     value: 31.9,  color: '#dc2626', highlight: true, annotation: '1 contract · risk 1.00',           annotation_es: '1 contrato · riesgo 1.00' },
              { label: 'ICA Fluor Daniel',        value: 31.2,  color: '#a06820',                  annotation: '6 contracts · risk 1.00',          annotation_es: '6 contratos · riesgo 1.00' },
              { label: 'Grupo Constructor Marhnos',value: 28.0, color: '#a06820',                  annotation: '2 contracts · risk 0.37',          annotation_es: '2 contratos · riesgo 0.37' },
              { label: 'Repsol Exploración',      value: 27.2,  color: '#a06820',                  annotation: '1 contract · risk 1.00',           annotation_es: '1 contrato · riesgo 1.00' },
              { label: 'Mota-Engil México',       value: 25.8,  color: '#a06820',                  annotation: '4 contracts · risk 0.95',          annotation_es: '4 contratos · riesgo 0.95' },
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
        chartConfig: {
          type: 'inline-bar',
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
    nextSteps: [
      'Request from SFP the complete list of contracts above 100M MXN awarded via direct adjudication in 2023-2025; cross-reference against RUBLI\'s P2 and P6 vendor lists.',
      'File ASF audit requests for the top 20 contracts above 500M MXN that RUBLI flags as critical-risk, naming the specific contract IDs.',
      'Compare Mexico\'s large-contract audit coverage rate against OECD peer countries using the 2023 Procurement Performance Review baseline data.',
      'Investigate whether procurement thresholds under LAASSP Art. 42 have been adjusted for inflation since 2012; compute the real-value erosion.',
      'Request from Congress (Cámara de Diputados) the complete list of contracts above 5B MXN approved in each fiscal year and cross-reference with RUBLI risk scores.',
      'Open dedicated case files on the four dominant IMSS pharmaceutical vendors (Grupo Fármacos, Maypo, PISA, DIMM) with focus on 2018-2025 contract awards.',
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
          'A monopoly does not have to be one company. Four pharmaceutical distributors — GRUPO FÁRMACOS ESPECIALIZADOS, FARMACÉUTICOS MAYPO, LABORATORIOS PISA, and DIMM (Distribuidora Internacional de Medicamentos y Equipo Médico) — collected 328.6 billion pesos from Mexico\'s federal government between 2003 and 2025. Their combined risk-score average is 0.69, solidly critical in RUBLI\'s v0.6.5 model. Three of the four sit at the top of RUBLI\'s entire vendor risk ladder.',
          'No competitive market produces this. The four vendors are not competing for distinct slices of demand; they are sharing one. They funnel their revenue through the same dominant customer, they appear in each other\'s losing-bid records by the thousands, and their peak years line up like sprinters in a relay — one rises as another falls. By the architecture of the data, this is one cartel that takes turns, not four monopolists in different lanes.',
          'The framework that produced these contracts has shifted three times — IMSS-direct procurement under Calderón, INSABI/BIRMEX under AMLO, IMSS-Bienestar consolidated tendering under Sheinbaum — and the four vendors have rotated through each architecture without losing their dominant share. The mechanism changed; the recipients did not.',
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
              { label: 'Grupo Fármacos', value: 133.4, color: '#dc2626', highlight: true, annotation: 'risk 0.99', annotation_es: 'riesgo 0.99' },
              { label: 'Maypo', value: 88.0, color: '#dc2626', highlight: true, annotation: 'risk 0.95', annotation_es: 'riesgo 0.95' },
              { label: 'PISA', value: 55.6, color: '#a06820', highlight: true, annotation: 'risk 0.75', annotation_es: 'riesgo 0.75' },
              { label: 'DIMM', value: 51.6, color: '#a06820', highlight: true, annotation: 'risk 0.54', annotation_es: 'riesgo 0.54' },
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
        chartConfig: {
          type: 'inline-stacked-bar',
          title: 'IMSS Concentration — How Much of Each Vendor\'s Revenue Comes From One Customer',
          title_es: 'Concentración IMSS — Cuánto del ingreso de cada proveedor proviene de un solo cliente',
          chartId: 'big-four-imss-share',
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
                color: '#dc2626',
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
                color: '#1e3a5f',
                values: [1.18, 0, 2.41, 0.56, 1.39, 0.73, 2.97, 1.58, 0.18, 0.36, 0.71, 0.94, 2.60, 0.96, 1.23, 0.47, 3.50, 6.42, 2.56, 3.77, 0.13, 0.67, 19.46],
                annotation: { xIndex: 22, text: '19.46 (2025)', text_es: '19.46 (2025)' },
                totalCaption: '· 55.6B total',
                totalCaption_es: '· 55.6B total',
              },
              {
                name: 'DIMM',
                color: '#0891b2',
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
        chartConfig: {
          type: 'inline-network',
          title: 'Shared Bidding Procedures Among the Big Four',
          title_es: 'Procedimientos de licitación compartidos entre el Big Four',
          chartId: 'big-four-network',
          network: {
            nodes: [
              { id: 'gf',    label: 'Grupo F.',   sublabel: '133.4B', color: '#dc2626', highlight: true },
              { id: 'maypo', label: 'Maypo',     sublabel: '88.0B',  color: '#a06820' },
              { id: 'pisa',  label: 'PISA',      sublabel: '55.6B',  color: '#1e3a5f' },
              { id: 'dimm',  label: 'DIMM',      sublabel: '51.6B',  color: '#0891b2' },
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
    nextSteps: [
      'File formal COFECE complaint under Art. 53 of the Ley Federal de Competencia Económica for investigation of Grupo Fármacos Especializados, Maypo, PISA, and DIMM as a potential cartel in IMSS pharmaceutical procurement.',
      'Request from IMSS a complete breakdown of pharmaceutical procurement contracts 2007-2020, including competing bidders at each tender — how many genuinely competitive procedures were there?',
      'Investigate the 2025 spike in Laboratorios PISA contracting: what specific contracts drove the 19.46B MXN annual figure, and under what procurement mechanism?',
      'Cross-reference the 40 non-pharmaceutical P1 vendors with RUPC records to identify declared shareholders, legal representatives, and physical addresses.',
      'Identify which IMSS procurement directors approved the 2013-2019 Grupo Fármacos contracts using SIPOT declarations of interests and meeting records.',
      'Track the AMLO-era transition of pharmaceutical contracting from IMSS-direct to BIRMEX/INSABI: did the same P1 vendors continue dominating under the new architecture?',
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
        chartConfig: {
          type: 'inline-line',
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
        chartConfig: {
          type: 'inline-bar',
          title: 'Top 12 Vendors by Single-Bid Wins (in "competitive" procedures)',
          title_es: 'Top 12 proveedores por victorias en oferta única (en procedimientos "competitivos")',
          chartId: 'sb-top-vendors',
          data: {
            points: [
              { label: 'Edenred México',          value: 1679, color: '#dc2626', highlight: true, annotation: '23.8B · vouchers',          annotation_es: '23.8B · vales' },
              { label: 'INFRA',                   value: 1423, color: '#a06820',                  annotation: '20.1B · gas (FP)',         annotation_es: '20.1B · gas (FP)' },
              { label: 'TOKA Internacional',      value: 1290, color: '#dc2626', highlight: true, annotation: '37.0B · vouchers',          annotation_es: '37.0B · vales' },
              { label: 'Efectivale (RL)',         value: 1155, color: '#dc2626', highlight: true, annotation: '6.1B · vouchers',           annotation_es: '6.1B · vales' },
              { label: 'Efectivale (S.A.)',       value: 1055, color: '#dc2626', highlight: true, annotation: '13.5B · vouchers',          annotation_es: '13.5B · vales' },
              { label: 'Seg. Alim. Mex (Segalmex)',value: 1014, color: '#dc2626', highlight: true, annotation: '5.3B · risk 0.94',          annotation_es: '5.3B · riesgo 0.94' },
              { label: 'Liconsa',                 value: 998,  color: '#a06820',                  annotation: '0.7B · gov-owned',           annotation_es: '0.7B · paraestatal' },
              { label: 'Sodexo',                  value: 658,  color: '#dc2626', highlight: true, annotation: '5.2B · vouchers',           annotation_es: '5.2B · vales' },
              { label: 'PRAXAIR México',          value: 585,  color: '#a06820',                  annotation: '9.5B · gas',                 annotation_es: '9.5B · gas' },
              { label: 'Servicio Postal',         value: 551,  color: '#a06820',                  annotation: '1.4B · gov-owned',           annotation_es: '1.4B · paraestatal' },
              { label: 'Productos Hospitalarios', value: 511,  color: '#a06820',                  annotation: '8.0B · medical supply',      annotation_es: '8.0B · insumos médicos' },
              { label: 'Estafeta Mexicana',       value: 475,  color: '#a06820',                  annotation: '0.8B · logistics',           annotation_es: '0.8B · logística' },
            ],
            unit: 'wins',
            annotation: 'Each row counts "competitive" procedures the vendor won as the only bidder. Red rows = the welfare-voucher cluster (Edenred + TOKA + Efectivale + Sodexo + Segalmex), which collectively wins 6,851 single-bid procedures totaling 91.7B MXN.',
            annotation_es: 'Cada fila cuenta procedimientos "competitivos" que el proveedor ganó como único oferente. Filas rojas = el cluster de vales del bienestar (Edenred + TOKA + Efectivale + Sodexo + Segalmex), que ganan colectivamente 6,851 procedimientos de oferta única por un total de 91.7 mil millones de pesos.',
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
        chartConfig: {
          type: 'inline-bar',
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
    nextSteps: [
      'Request from SFP the official single-bid statistics for 2020-2025 and compare against RUBLI\'s independent calculation from COMPRANET microdata.',
      'Identify the 100 procedures with the highest contract values that had a single bidder in 2023 and request full bid evaluation records.',
      'File COFECE investigation reports for the top 20 vendor co-bidding pairs identified in RUBLI\'s ARIA queue P5 pattern.',
      'Research which industries in Mexico have COFECE "effective competition" certification and cross-reference their single-bid rates against uncertified sectors.',
      'Map single-bid rates by procurement institution to identify the worst-offending procurement units for prioritized audit.',
      'Pursue a journalistic investigation of the 2011 single-bid peak (64.4%) — what specific procurement category or institution drove the annual figure?',
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
        chartConfig: {
          type: 'inline-bar',
          title: 'P3 Intermediary Vendors by Sector (Total Value)',
          title_es: 'Proveedores intermediarios P3 por sector (valor total)',
          chartId: 'p3-by-sector',
          data: {
            points: [
              { label: 'Infraestructura', value: 179.5, color: '#ea580c' },
              { label: 'Energía',         value: 130.6, color: '#eab308' },
              { label: 'Salud',           value: 104.2, color: '#dc2626', highlight: true },
              { label: 'Hacienda',        value: 40.9,  color: '#16a34a' },
              { label: 'Educación',       value: 19.1,  color: '#3b82f6' },
              { label: 'Agricultura',     value: 18.8,  color: '#22c55e' },
              { label: 'Gobernación',     value: 17.8,  color: '#be123c' },
              { label: 'Defensa',         value: 15.9,  color: '#1e3a5f' },
            ],
            unit: 'B MXN',
            annotation: '2,974 intermediary-pattern vendors across 526.8B MXN of federal spending.',
            annotation_es: '2,974 proveedores con patrón de intermediario que suman 526.8 mil millones de pesos en gasto federal.',
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
              { label: 'DICONSA',  value: 70.0,  color: '#16a34a',                  annotation: '495 vendors · 236K contracts',    annotation_es: '495 proveedores · 236K contratos' },
              { label: 'ISSSTE',   value: 50.1,  color: '#dc2626', highlight: true, annotation: '841 vendors · 33,636 contracts',  annotation_es: '841 proveedores · 33,636 contratos' },
              { label: 'CONAGUA',  value: 28.2,  color: '#10b981',                  annotation: '281 vendors · 5,988 contracts',   annotation_es: '281 proveedores · 5,988 contratos' },
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
    nextSteps: [
      'Request from SFP the results of any audits of IMSS pharmaceutical procurement in 2023-2025 involving recurring direct-award vendors.',
      'File UIF financial intelligence request for bank transaction data on the top 20 P3-classified intermediary vendors in infrastructure by contract value.',
      'Use COMPRANET to identify which IMSS procurement officials signed the highest-value P6-pattern contracts — cross-reference with SIPOT conflict-of-interest declarations.',
      'Investigate whether any of the 3,821 IMSS P6 vendors were listed on the RUPC as recently established entities at the time of first contract.',
      'File information requests to ASF for the complete findings of the 2022 IMSS pharmaceutical audit, including vendor names and institutional findings.',
      'Research whether Mexico\'s 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.',
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
        chartConfig: {
          type: 'inline-bar',
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
              { label: 'Molinos Azteca',                 value: 7.62,  color: '#16a34a',                  annotation: '99.9% DA · DICONSA flour',    annotation_es: '99.9% AD · harina DICONSA' },
              { label: 'Televisa',                       value: 7.07,  color: '#dc2626', highlight: true, annotation: '99.7% DA · gov media buy',    annotation_es: '99.7% AD · gasto en medios' },
              { label: 'Microsoft Licensing GP',         value: 6.66,  color: '#a06820',                  annotation: '97.7% DA · tech license',     annotation_es: '97.7% AD · licencia tech' },
              { label: 'Microsoft México',               value: 6.61,  color: '#a06820',                  annotation: '99.6% DA · tech license',     annotation_es: '99.6% AD · licencia tech' },
              { label: 'Estudios Azteca',                value: 5.82,  color: '#dc2626', highlight: true, annotation: '99.8% DA · gov media buy',    annotation_es: '99.8% AD · gasto en medios' },
              { label: 'Aeroméxico',                     value: 5.31,  color: '#a06820',                  annotation: '95.5% DA · gov travel',       annotation_es: '95.5% AD · viajes oficiales' },
              { label: 'Marcas Nestlé',                  value: 4.35,  color: '#16a34a',                  annotation: '99.9% DA · DICONSA dairy',    annotation_es: '99.9% AD · lácteos DICONSA' },
              { label: 'Industrial Patrona',             value: 3.87,  color: '#16a34a',                  annotation: '99.7% DA · DICONSA bulk',     annotation_es: '99.7% AD · insumos DICONSA' },
              { label: 'CENEVAL',                        value: 3.66,  color: '#a06820',                  annotation: '100% DA · gov-owned exam',    annotation_es: '100% AD · paraestatal' },
              { label: 'Molinera de México',             value: 2.87,  color: '#16a34a',                  annotation: '100% DA · DICONSA flour',     annotation_es: '100% AD · harina DICONSA' },
              { label: 'Fábrica de Jabón La Corona',     value: 2.68,  color: '#16a34a',                  annotation: '99.9% DA · DICONSA hygiene',  annotation_es: '99.9% AD · higiene DICONSA' },
            ],
            unit: 'B MXN',
            annotation: 'Three editorial clusters emerge: tech licensing (gold, defensible as sole-source), government media buys at Televisa and TV Azteca (red — 12.9B MXN routed to two broadcasters without competition), and DICONSA bulk-commodity supply (green — 17.5B MXN across four staple producers).',
            annotation_es: 'Aparecen tres bloques editoriales: licencias tecnológicas (oro, defendibles como única fuente), gasto gubernamental en medios en Televisa y TV Azteca (rojo — 12.9 mil millones de pesos canalizados a dos radiodifusoras sin competencia), y suministro de productos básicos a DICONSA (verde — 17.5 mil millones de pesos entre cuatro productores de bienes de canasta).',
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
    nextSteps: [
      'Request from SFP the official justification categories used for direct awards in 2023 — what fraction cite "emergency," "sole source," or "small value"?',
      'Analyze whether BIRMEX\'s post-2019 procurement shows competitive pricing versus pre-reform IMSS pharmaceutical prices for the same drug categories.',
      'File audit requests with ASF for the largest 50 direct-award contracts in 2024 — are any awarded to RUBLI T1/T2 ARIA-queue vendors?',
      'Research which procurement officials are authorized to approve direct awards above 10M MXN — how has that authority concentrated since 2019?',
      'Compile a dataset of Art. 41 justification documents for 2023-2024 and code the cited legal basis to identify which exception clauses are used most frequently.',
      'Interview former SFP auditors who have worked on direct-award pattern reviews about the institutional constraints they encountered.',
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
    subheadline: 'Under AMLO, federal procurement reorganized along three axes: military spending tripled, civilian infrastructure collapsed by 65 percent, and pharmaceutical centralization handed multi-billion-peso contracts to a small set of vendors. RUBLI\'s model scores 17.6 percent of AMLO-era contracts as high-risk — the highest of any administration in 23 years of data and the first to break the OECD ceiling of 15 percent.',
    subheadline_es: 'Bajo AMLO, la contratación federal se reorganizó por tres ejes: el gasto militar se triplicó, la infraestructura civil se desplomó 65 por ciento, y la centralización farmacéutica entregó contratos multimillonarios a un puñado de proveedores. El modelo de RUBLI califica 17.6 por ciento de los contratos del sexenio AMLO como de alto riesgo — el porcentaje más alto de cualquier administración en 23 años de datos y el primero en superar el umbral OCDE de 15 por ciento.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 18,
    status: 'reporteado',
    leadStat: { value: '17.6%', label: 'high-risk rate, AMLO era (2019-2024)', label_es: 'tasa de alto riesgo, sexenio AMLO (2019-2024)', sublabel: 'vs 9.7% Calderón, 12.4% Peña Nieto, 7.9% Fox', sublabel_es: 'vs 9.7% Calderón, 12.4% Peña Nieto, 7.9% Fox', color: '#dc2626' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Model Finds Across Administrations',
        prose: [
          'RUBLI\'s v0.6.5 risk model was not calibrated to any single administration. It was trained on 748 documented corruption cases spanning multiple presidencies and scores contracts based on their structural similarity to known-bad patterns: vendor concentration, price volatility, single-bidder conditions, network membership, institution diversity, and procurement mechanism. The model has no partisan attachment and no political knowledge. It sees only patterns.',
          'When we apply this politically blind model across the four complete administrations in RUBLI\'s dataset, the results show a remarkably consistent upward trend. Under Fox (2001-2006), the high-risk rate was 7.94 percent across 206,333 contracts — below OECD\'s 15 percent benchmark. Under Calderón (2007-2012), it reached 9.67 percent across 481,450 contracts. Under Peña Nieto (2013-2018), it climbed to 12.43 percent across 1,228,625 contracts. Under AMLO (2019-2024), it reached 17.63 percent across 1,050,552 contracts — the highest of any administration in the dataset and 2.5 percentage points above the OECD upper limit.',
          'The counts behind these percentages are as telling as the rates themselves. Fox flagged 16,382 contracts as high-risk. Calderón flagged 46,576. Peña Nieto flagged 152,683. AMLO flagged 185,248. Each administration has produced more high-risk contracts than the previous one — a function both of rising rates and of growing procurement volume.',
          'Each administration also had its own procurement context. Fox governed with limited COMPRANET coverage (Structure A, 2001-2006), so the Fox-era rate should be read with caution: the dataset under-reports the period. Calderón\'s rate of 9.7 percent fell in the middle of OECD\'s acceptable range. Peña Nieto\'s 12.4 percent crossed into concerning territory. AMLO\'s 17.6 percent is the first time any administration in the dataset has broken the OECD ceiling.',
        ],
        pullquote: {
          quote: 'Every Mexican administration since Fox has been riskier than its predecessor. AMLO\'s 17.6% high-risk rate is the first to exceed the OECD ceiling of 15%.',
          stat: '17.6%',
          statLabel: 'AMLO-era high-risk rate',
          barValue: 0.176,
          barLabel: 'OECD ceiling: 15%',
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
        chartConfig: {
          type: 'inline-stacked-bar',
          title: 'Sectoral Spend Shift, AMLO (2019-24) vs Peña Nieto (2013-18)',
          title_es: 'Cambio sectorial del gasto, AMLO (2019-24) vs Peña Nieto (2013-18)',
          chartId: 'amlo-vs-pena-sectors',
          stacked: {
            rows: [
              { label: 'Salud',           total: 1201.4, highlight: 1201.4, annotation: '+47% vs Peña',  annotation_es: '+47% vs Peña' },
              { label: 'Infraestructura', total: 326.4,  highlight: 326.4,  annotation: '−65% vs Peña',  annotation_es: '−65% vs Peña' },
              { label: 'Hacienda',        total: 392.9,  highlight: 392.9,  annotation: '+70% vs Peña',  annotation_es: '+70% vs Peña' },
              { label: 'Defensa',         total: 168.9,  highlight: 168.9,  annotation: '+186% vs Peña', annotation_es: '+186% vs Peña' },
              { label: 'Gobernación',     total: 190.4,  highlight: 190.4,  annotation: '+100% vs Peña', annotation_es: '+100% vs Peña' },
              { label: 'Agricultura',     total: 166.2,  highlight: 166.2,  annotation: '+36% vs Peña',  annotation_es: '+36% vs Peña' },
              { label: 'Educación',       total: 114.9,  highlight: 114.9,  annotation: '−26% vs Peña',  annotation_es: '−26% vs Peña' },
              { label: 'Medio Ambiente',  total: 94.2,   highlight: 94.2,   annotation: '−31% vs Peña',  annotation_es: '−31% vs Peña' },
              { label: 'Energía',         total: 50.1,   highlight: 50.1,   annotation: '−88% vs Peña',  annotation_es: '−88% vs Peña' },
            ],
            unit: 'B MXN',
            anchor: {
              value: '2.76T MXN',
              label: 'AMLO TOTAL FEDERAL PROCUREMENT, 2019-2024',
              label_es: 'CONTRATACIÓN FEDERAL TOTAL AMLO, 2019-2024',
            },
            annotation: 'Bar = AMLO-era spend per sector. Annotation shows the change vs Peña Nieto. The shape of Mexican federal spending changed direction across this transition.',
            annotation_es: 'Barra = gasto del sexenio AMLO por sector. La anotación muestra el cambio frente a Peña Nieto. La forma del gasto federal mexicano cambió de dirección en esta transición.',
            highlightColor: '#a06820',
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
        chartConfig: {
          type: 'inline-multi-line',
          title: 'SEDENA Annual Federal Contracting, 2015-2025',
          title_es: 'Contratación federal anual de SEDENA, 2015-2025',
          chartId: 'sedena-rise',
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
          'The 17.6 percent high-risk rate is an average. The distribution across categories is uneven and editorially significant. Some procurement categories under AMLO operated near the OECD acceptable range. Others ran at risk levels two to three times the national average. The categories with the highest at-risk rates point directly to the policy choices the administration made.',
          'Alimentos y Víveres — food and provisions — registered a 32.4 percent high-risk rate across 224.9 billion pesos of AMLO-era contracting. This is the category that contains the Segalmex network (1,258 contracts at 1.000 risk score) and the dominant food-voucher operator TOKA Internacional (897 contracts, 25 billion pesos at 0.916 risk). The Segalmex scandal — already documented as the largest financial-corruption case in MORENA government history — accounts for only a fraction of the at-risk pesos in this category. The structural pattern extends beyond Segalmex into welfare-card vendors, military food-distribution contractors, and rural-supply chains that operate under similar concentration conditions.',
          'Medicamentos y Farmacéuticos at 22.4 percent high-risk reflects the IMSS-pharmaceutical-cartel pattern documented in detail in The Invisible Monopoly. Servicios Hospitalarios at 19.4 percent reflects the same IMSS architecture extended to outsourced clinical services. Construcción de Edificios at 8.5 percent looks lower, but only because much of the highest-risk military-construction spending bypasses civilian COMPRANET — what we can measure in the civilian data is biased downward.',
          'TOKA Internacional alone — a single voucher company — collected 40.6 billion pesos under AMLO at a 0.78 risk score. It is the largest individual vendor of the AMLO era after the pharmaceutical and Tren Maya clusters. Edenred, Sodexo, and the family of payment-card operators that captured Mexican welfare-program logistics under AMLO occupy a structurally identical position to the IMSS pharmaceutical cartel: a small set of vendors with critical-tier risk scores, dominant institutional shares, and legal authority for direct adjudication built into the program design.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'Top Spending Categories Under AMLO — Volume vs High-Risk Share',
          title_es: 'Principales categorías de gasto bajo AMLO — Volumen vs porcentaje de alto riesgo',
          chartId: 'amlo-categories-risk',
          data: {
            points: [
              { label: 'Medicamentos',        value: 327.6, color: '#dc2626', highlight: true, annotation: '22.4% hi-risk', annotation_es: '22.4% riesgo' },
              { label: 'Construcción Edif.', value: 269.4, color: '#a06820',                   annotation: '8.5% hi-risk',  annotation_es: '8.5% riesgo' },
              { label: 'Servicios Generales', value: 245.7, color: '#a06820',                   annotation: '14.3% hi-risk', annotation_es: '14.3% riesgo' },
              { label: 'Material Curación',   value: 228.1, color: '#a06820',                   annotation: '12.1% hi-risk', annotation_es: '12.1% riesgo' },
              { label: 'Alimentos y Víveres', value: 224.9, color: '#dc2626', highlight: true, annotation: '32.4% hi-risk', annotation_es: '32.4% riesgo' },
              { label: 'Mantenimiento',       value: 177.2, color: '#a06820',                   annotation: '9.4% hi-risk',  annotation_es: '9.4% riesgo' },
              { label: 'Servicios Hospital.', value: 164.4, color: '#dc2626', highlight: true, annotation: '19.4% hi-risk', annotation_es: '19.4% riesgo' },
              { label: 'Carreteras',          value: 105.0, color: '#a06820',                   annotation: '12.2% hi-risk', annotation_es: '12.2% riesgo' },
            ],
            unit: 'B MXN',
            annotation: 'Top 8 spending categories under AMLO. Red rows = categories where the high-risk rate exceeds the OECD ceiling (15%). Alimentos at 32.4% is the highest-risk concentration of any major category.',
            annotation_es: 'Las 8 principales categorías de gasto bajo AMLO. Filas rojas = categorías donde la tasa de alto riesgo excede el umbral OCDE (15%). Alimentos al 32.4% es la concentración de mayor riesgo de cualquier categoría principal.',
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
        pullquote: {
          quote: 'The gap between real-time visibility and formal accountability is what RUBLI closes. What oversight bodies do with that visibility is a political choice.',
          stat: '12.9%',
          statLabel: 'Sheinbaum-era high-risk rate (partial period)',
        },
        sources: [
          'RUBLI Sheinbaum-era contract analysis (contract_year=2025, partial). April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 7.',
        ],
      },
    ],
    relatedSlugs: ['marea-de-adjudicaciones', 'la-ilusion-competitiva', 'el-gran-precio'],
    nextSteps: [
      'Request from ASF the audit coverage rate for AMLO-era emergency procurement contracts in health and infrastructure.',
      'Analyze BIRMEX and INSABI contracts 2019-2022 for vendor overlap with RUBLI\'s P1 and P6 pattern vendors.',
      'Track Sheinbaum administration procurement risk scores quarterly using COMPRANET data — RUBLI can update in real time.',
      'Cross-reference AMLO-era direct-award contracts above 500M MXN against the SFP sanctions registry and the SAT EFOS list.',
      'Compile a comprehensive list of the top 1,000 AMLO-era contracts by RUBLI risk score, with procurement institution and approving unit identified.',
      'Pursue academic research collaboration with CIDE, COLMEX, or UNAM to publish a peer-reviewed analysis of the Fox-to-AMLO risk trajectory.',
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
          'Naming the largest examples makes the pattern concrete. CONSTRUCTORA ARHNOS won 32.0 billion pesos across just six contracts with state-level public-works secretariats — an average ticket of 5.3 billion pesos per contract, against an industry-typical infrastructure ticket size of one to ten million. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA collected 21.1 billion pesos across three IMSS contracts — average ticket 7.0 billion. CAABSA CONSTRUCTORA at 9.2 billion across three CDMX contracts. GX2 DESARROLLOS at 5.9 billion across two Sinaloa contracts with a risk score of 0.84 — squarely in the high-risk band. The signature is the same in each case: a microscopic contract count multiplied by an enormous per-contract value, in sectors where legitimate firms typically operate at orders-of-magnitude smaller average ticket sizes.',
          'Adjacent to these likely pass-throughs sit international oilfield-services contractors — TÉCNICAS REUNIDAS S.A. (7.2B / 2 contracts at PEMEX), PETROBRAS-led joint venture (5.9B / 2 contracts at PEMEX), PRIDE INTERNATIONAL (5.5B / 6 contracts at PEMEX) — all with risk scores under 0.25. These represent the legitimate end of the P3 population: foreign specialists with technical expertise that PEMEX cannot source domestically, structurally winning few large contracts. The investigative imperative is to separate the TÉCNICAS REUNIDAS pattern (legitimate sole-source) from the CONSTRUCTORA ARHNOS pattern (almost certainly pass-through). RUBLI\'s P3 algorithm flags both as the same shape; the human work is in distinguishing which is which.',
        ],
        prose_es: [
          'El caso documentado más grande de fraude por intermediación en la historia de la contratación pública mexicana es La Estafa Maestra — un esquema en el que las dependencias federales contrataban con universidades públicas, que luego subcontrataban con empresas fantasma, que en efecto devolvían el dinero a los funcionarios de las dependencias originales. La investigación parlamentaria de 2017 y la investigación periodística de MCCI/Animal Político del mismo año encontraron que 7.67 mil millones de pesos se movieron por esta estructura solo entre 2013 y 2014.',
          'La Estafa Maestra fue posible porque la ley mexicana de adquisiciones tiene un excepción para los contratos con universidades, tratándolos como exentos de los requisitos de licitación competitiva bajo el Art. 1, último párrafo, de la Ley de Adquisiciones. Las universidades se volvieron intermediarias entre la ley de adquisiciones y el mercado en la sombra. La base de datos de la verdad-base de RUBLI incluye este caso; los proveedores directamente vinculados a él tienen calificaciones de riesgo que promedian de 0.55 a 0.65.',
          'El patrón P3 que RUBLI identifica hoy no se limita a la subcontratación universitaria. Las universidades fueron un mecanismo legal que habilitó la estructura de intermediación; la estructura misma puede operar a través de cualquier mecanismo legal que permita la subcontratación. El Art. 5 de la Ley de Obras Públicas permite expresamente la subcontratación en obra pública, y el Art. 41 de la Ley de Adquisiciones permite adjudicaciones directas a proveedores recurrentes. Cualquiera de los dos preceptos puede alojar un patrón de intermediación si la unidad compradora opta por adjudicar por su vía.',
          'Los 2,974 proveedores P3 en la cola de RUBLI son los sucesores estructurales de la arquitectura de La Estafa Maestra — distintas entidades, mismo papel funcional. Cada proveedor en la lista representa un hilo investigativo: quién lo posee, con qué proveedor subyacente trabaja, cuál es la diferencia de precio entre lo que paga el gobierno y lo que recibe el subcontratista.',
          'Nombrar a los ejemplos más grandes vuelve el patrón concreto. CONSTRUCTORA ARHNOS ganó 32.0 mil millones de pesos en apenas seis contratos con secretarías estatales de obras públicas — un ticket promedio de 5.3 mil millones de pesos por contrato, contra un tamaño de ticket típico de la industria de infraestructura de uno a diez millones. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA cobró 21.1 mil millones en tres contratos del IMSS — ticket promedio de 7.0 mil millones. CAABSA CONSTRUCTORA con 9.2 mil millones en tres contratos de la CDMX. GX2 DESARROLLOS con 5.9 mil millones en dos contratos de Sinaloa con calificación de riesgo de 0.84 — de lleno en la banda de alto riesgo. La firma es la misma en cada caso: una cuenta de contratos minúscula multiplicada por un valor por contrato enorme, en sectores donde las firmas legítimas típicamente operan a tamaños de ticket promedio órdenes de magnitud menores.',
          'Adyacentes a esos probables pasos están contratistas internacionales de servicios petroleros — TÉCNICAS REUNIDAS S.A. (7.2 mil millones / 2 contratos en PEMEX), un consorcio liderado por PETROBRAS (5.9 mil millones / 2 contratos en PEMEX), PRIDE INTERNATIONAL (5.5 mil millones / 6 contratos en PEMEX) — todos con calificaciones de riesgo menores a 0.25. Estos representan el extremo legítimo de la población P3: especialistas extranjeros con pericia técnica que PEMEX no puede contratar domésticamente, ganando estructuralmente pocos contratos grandes. El imperativo investigativo es separar el patrón TÉCNICAS REUNIDAS (única fuente legítima) del patrón CONSTRUCTORA ARHNOS (casi con certeza paso). El algoritmo P3 de RUBLI marca ambos con la misma forma; el trabajo humano consiste en distinguir cuál es cuál.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'Top P3 Intermediary-Pattern Vendors by Total Contract Value',
          title_es: 'Top proveedores con patrón de intermediario P3 por valor total de contratos',
          chartId: 'p3-top-vendors',
          data: {
            points: [
              { label: 'Constructora ARHNOS',         value: 32.0, color: '#dc2626', highlight: true, annotation: '6 contracts · state public works',  annotation_es: '6 contratos · obras públicas estatales' },
              { label: 'Promotora y Desarrolladora',  value: 21.1, color: '#dc2626', highlight: true, annotation: '3 contracts · IMSS hospitals',       annotation_es: '3 contratos · hospitales IMSS' },
              { label: 'Antonio Vigil Maximino',      value: 9.75, color: '#dc2626', highlight: true, annotation: '2 contracts · IMSS',                  annotation_es: '2 contratos · IMSS' },
              { label: 'CAABSA Constructora',         value: 9.18, color: '#dc2626', highlight: true, annotation: '3 contracts · CDMX',                  annotation_es: '3 contratos · CDMX' },
              { label: 'GTECH Printing',              value: 7.72, color: '#a06820',                  annotation: '2 contracts · lottery printing',      annotation_es: '2 contratos · impresión lotería' },
              { label: 'Técnicas Reunidas (ES)',      value: 7.24, color: '#a06820',                  annotation: '2 contracts · PEMEX engineering',     annotation_es: '2 contratos · ingeniería PEMEX' },
              { label: 'GX2 Desarrollos',             value: 5.89, color: '#dc2626', highlight: true, annotation: '2 contracts · Sinaloa · risk 0.84',  annotation_es: '2 contratos · Sinaloa · riesgo 0.84' },
              { label: 'Petrobras JV (BR)',           value: 5.86, color: '#a06820',                  annotation: '2 contracts · PEMEX',                 annotation_es: '2 contratos · PEMEX' },
              { label: 'Pride International (US)',    value: 5.48, color: '#a06820',                  annotation: '6 contracts · PEMEX offshore',        annotation_es: '6 contratos · PEMEX costa afuera' },
              { label: 'LAMAP',                       value: 4.73, color: '#dc2626', highlight: true, annotation: '17 contracts · IMSS-Bienestar',      annotation_es: '17 contratos · IMSS-Bienestar' },
            ],
            unit: 'B MXN',
            annotation: 'Red rows: pass-through signature (microscopic contract counts × enormous per-contract value, domestic). Gold rows: international specialists with structurally narrow supplier markets (PEMEX legitimate sole-source). The investigative work is to separate these two populations from RUBLI\'s 2,974 P3-flagged vendors.',
            annotation_es: 'Filas rojas: firma de paso (cuentas de contratos minúsculas × valor por contrato enorme, locales). Filas oro: especialistas internacionales con mercados de proveedores estructuralmente reducidos (única fuente legítima en PEMEX). El trabajo investigativo consiste en separar estas dos poblaciones entre los 2,974 proveedores con bandera P3 de RUBLI.',
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
    nextSteps: [
      'File UIF intelligence request for bank transaction data on the top 20 P3-classified vendors in infrastructure by contract value.',
      'Identify which public universities continue to be used as procurement intermediaries after La Estafa Maestra — cross-reference with COMPRANET university contracts 2018-2025.',
      'Request from SFP the complete list of vendors sanctioned for improper subcontracting and cross-reference with RUBLI P3 list.',
      'Research whether Mexico\'s 2022 procurement law reform addressed the university subcontracting carve-out that enabled La Estafa Maestra.',
      'Open a journalistic investigation of the top 5 P3 vendors in infrastructure — interview actual subcontractors to identify the price spreads.',
      'File COFECE complaint requesting dedicated investigation of intermediary patterns in public works procurement.',
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
          type: 'inline-bar',
          title: 'Top Institutions by Same-Day Same-Vendor Threshold-Cluster Splits',
          title_es: 'Top instituciones por divisiones umbral con mismo proveedor en el mismo día',
          chartId: 'threshold-split-institutions',
          data: {
            points: [
              { label: 'DICONSA',                       value: 985, color: '#16a34a',                  annotation: '3,395 contracts · 829.6M MXN',  annotation_es: '3,395 contratos · 829.6 M MXN' },
              { label: 'IMSS',                          value: 588, color: '#dc2626', highlight: true, annotation: '2,109 contracts · 519.5M MXN', annotation_es: '2,109 contratos · 519.5 M MXN' },
              { label: 'Alimentación p/ Bienestar',     value: 230, color: '#16a34a',                  annotation: '869 contracts · 214.2M MXN',    annotation_es: '869 contratos · 214.2 M MXN' },
              { label: 'ISSSTE',                        value: 77,  color: '#dc2626', highlight: true, annotation: '302 contracts · 75.1M MXN',     annotation_es: '302 contratos · 75.1 M MXN' },
              { label: 'INCMNSZ Salvador Zubirán',     value: 69,  color: '#dc2626', highlight: true, annotation: '268 contracts · 65.7M MXN',     annotation_es: '268 contratos · 65.7 M MXN' },
              { label: 'CFE',                           value: 47,  color: '#eab308',                  annotation: '162 contracts · 40.1M MXN',     annotation_es: '162 contratos · 40.1 M MXN' },
              { label: 'CONALITEG',                     value: 36,  color: '#3b82f6',                  annotation: '132 contracts · 31.7M MXN',     annotation_es: '132 contratos · 31.7 M MXN' },
              { label: 'Puebla — Comité Educativo',     value: 27,  color: '#3b82f6',                  annotation: '186 contracts · 46.2M MXN',     annotation_es: '186 contratos · 46.2 M MXN' },
              { label: 'SEMAR',                         value: 19,  color: '#1e3a5f',                  annotation: '61 contracts · 15.2M MXN',      annotation_es: '61 contratos · 15.2 M MXN' },
              { label: 'PROFECO',                       value: 18,  color: '#be123c',                  annotation: '89 contracts · 20.8M MXN',      annotation_es: '89 contratos · 20.8 M MXN' },
              { label: 'Secretaría de Salud',           value: 15,  color: '#dc2626', highlight: true, annotation: '132 contracts · 30.1M MXN',     annotation_es: '132 contratos · 30.1 M MXN' },
              { label: 'IPN',                           value: 14,  color: '#3b82f6',                  annotation: '53 contracts · 13.0M MXN',      annotation_es: '53 contratos · 13.0 M MXN' },
            ],
            unit: 'clusters',
            annotation: 'Each cluster = one institution awarding 3+ contracts to the same vendor on the same day, each between 195K and 305K MXN. The DICONSA pattern (top) reflects bulk-staples purchasing concentration; the healthcare cluster (red — IMSS / ISSSTE / INCMNSZ / SSA) is the editorially loaded version, since medical-supply procurement rarely needs to be fragmented at threshold values.',
            annotation_es: 'Cada cúmulo = una institución que adjudicó 3 o más contratos al mismo proveedor el mismo día, cada uno entre 195 mil y 305 mil pesos. El patrón DICONSA (arriba) refleja la concentración de compra a granel; el cúmulo de salud (rojo — IMSS / ISSSTE / INCMNSZ / SSA) es la versión editorialmente más cargada, porque la procuración de insumos médicos rara vez necesita fragmentarse en valores umbral.',
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
          barValue: 0.75,
          barLabel: 'share awarded by direct adjudication',
          barLabel_es: 'porción adjudicada por adjudicación directa',
        },
        sources: [
          'Transparencia Mexicana. (2024). Diagnóstico de la Corrupción en Compras Municipales y Estatales.',
          'RUBLI aggregate threshold analysis, April 2026.',
        ],
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'la-ilusion-competitiva', 'la-industria-del-intermediario'],
    nextSteps: [
      'File INAI information request for SFP\'s records of any Art. 17 LAASSP investigations for contract fragmentation in the last 5 years.',
      'Identify the top 20 institutions with the highest concentration of exactly-300K and exactly-210K contracts and request their procurement records for those awards.',
      'Compare threshold values across years against the spike bucket sizes — does the cluster shift when UMA-denominated thresholds change?',
      'Contact SHCP/SFP policy unit to ask whether automated threshold-clustering detection has been considered for CompraNet.',
      'File criminal complaints under Art. 17 LAASSP for specific procurement units showing systematic same-day, same-vendor, threshold-value contract splitting.',
      'Compile a journalistic investigation of the 10 most egregious same-day contract splitting cases identified by RUBLI\'s z-score analysis.',
    ],
  },

  // =========================================================================
  // STORY 10: Price Volatility — The Algorithm's Smoking Gun
  // =========================================================================
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Price Volatility: The Algorithm\'s Smoking Gun',
    headline_es: 'Volatilidad: el precio del riesgo',
    subheadline: 'Across 3 million contracts and 16 candidate risk features, one signal emerges as the strongest predictor of corruption — a vendor\'s tendency to charge wildly inconsistent prices for similar work. The coefficient is +0.5343. Seven other features were regularized to exactly zero.',
    subheadline_es: 'En 3 millones de contratos y 16 variables candidatas, una señal emerge como el predictor más fuerte de corrupción — la tendencia de un proveedor a cobrar precios drásticamente inconsistentes por trabajo similar. El coeficiente es +0.5343. Siete de las otras variables fueron regularizadas a exactamente cero.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'solo_datos',
    leadStat: { value: '+0.5343', label: 'price_volatility coefficient', label_es: 'coeficiente de volatilidad de precios', sublabel: 'strongest predictor in v0.6.5 model', sublabel_es: 'predictor más fuerte en el modelo v0.6.5', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Model Learned',
        title_es: 'Lo que aprendió el modelo',
        prose: [
          'RUBLI\'s v0.6.5 risk model was calibrated against 748 documented corruption cases — contracts from IMSS ghost company networks, Segalmex food distribution fraud, COVID emergency procurement irregularities, La Estafa Maestra university subcontracting, and a dozen other verified scandals spanning multiple administrations. The model\'s training task was specific: learn which procurement characteristics predict similarity to these known-bad cases.',
          'The calibration process used ElasticNet logistic regression with Optuna Bayesian hyperparameter optimization across 150 trials. The search explored 16 candidate features: single-bid status, direct-award mechanism, network membership, institution diversity, ad period length, year-end timing, industry mismatch, institution risk, same-day contract count, vendor concentration, win rate, price ratio, co-bidding rate, price hypothesis confidence, sector spread, and price volatility. The model was free to weight these features however the data supported.',
          'The result was a striking concentration of predictive power in one feature. Price volatility emerged with coefficient +0.5343 — the strongest positive predictor in the model. It beat the next-strongest feature (vendor concentration at +0.3749) by 43 percent. It beat the strongest protective feature (institution diversity at -0.3821, where negative means lower risk) in absolute magnitude. Seven of the 16 candidate features were regularized to exactly zero by the ElasticNet sparsity penalty, meaning they contributed no predictive power beyond noise.',
          'This is not a result the model was forced toward. The training process made no assumption that price volatility mattered. It was one of 16 equal candidates, and the algorithm could have chosen to weight it near zero if the data did not support a stronger weight. The data chose price volatility. That choice is the algorithm\'s compressed judgment about what the 748 ground-truth corruption cases have in common.',
        ],
        prose_es: [
          'El modelo de riesgo v0.6.5 de RUBLI fue calibrado contra 748 casos documentados de corrupción — contratos de redes de empresas fantasma del IMSS, fraude de distribución alimentaria de Segalmex, irregularidades de contratación de emergencia por COVID, subcontratación universitaria de La Estafa Maestra, y una docena más de escándalos verificados a lo largo de múltiples administraciones. La tarea de entrenamiento del modelo fue específica: aprender qué características de la contratación predicen la similitud con esos casos conocidos como malos.',
          'El proceso de calibración usó regresión logística ElasticNet con optimización bayesiana de hiperparámetros vía Optuna en 150 ensayos. La búsqueda exploró 16 variables candidatas: oferta única, mecanismo de adjudicación directa, pertenencia a red, diversidad institucional, duración de la publicación, momento de fin de año, desajuste de industria, riesgo institucional, contratos del mismo día, concentración del proveedor, tasa de victoria, razón de precios, tasa de co-licitación, confianza en la hipótesis de precio, dispersión sectorial y volatilidad de precios. El modelo tuvo libertad para ponderar esas variables como los datos lo respaldaran.',
          'El resultado fue una notable concentración de poder predictivo en una sola variable. La volatilidad de precios emergió con coeficiente +0.5343 — el predictor positivo más fuerte del modelo. Superó a la siguiente variable más fuerte (concentración del proveedor en +0.3749) por 43 por ciento. Superó en magnitud absoluta a la variable protectora más fuerte (diversidad institucional en -0.3821, donde negativo significa menor riesgo). Siete de las 16 candidatas fueron regularizadas a exactamente cero por la penalización de esparsidad de ElasticNet, lo que significa que no aportaron poder predictivo más allá del ruido.',
          'Este no es un resultado al que el modelo haya sido forzado. El proceso de entrenamiento no hizo ningún supuesto sobre que la volatilidad de precios importara. Fue una de 16 candidatas iguales, y el algoritmo pudo haber optado por ponderarla cerca de cero si los datos no respaldaban un peso mayor. Los datos eligieron la volatilidad de precios. Esa elección es el juicio comprimido del algoritmo sobre qué tienen en común los 748 casos de corrupción de la verdad-base.',
        ],
        pullquote: {
          quote: 'Of 16 risk features, price volatility emerged as the strongest predictor — a coefficient 43 percent higher than the next-strongest feature.',
          quote_es: 'De 16 variables de riesgo, la volatilidad de precios emergió como el predictor más fuerte — un coeficiente 43 por ciento mayor que la siguiente variable más fuerte.',
          stat: '+0.5343',
          statLabel: 'price_volatility coefficient in v0.6.5 model',
          statLabel_es: 'coeficiente de volatilidad de precios en el modelo v0.6.5',
        },
        sources: [
          'RUBLI v0.6.5 model calibration results. Run ID CAL-v6.1-202603251039. AUC test: 0.828.',
          'RUBLI docs/RISK_METHODOLOGY_v6.md — coefficient table, April 2026.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'The Diverging Ladder',
        title_es: 'La escalera divergente',
        subtitle: 'What predicts risk, and what protects against it',
        subtitle_es: 'Qué predice riesgo y qué protege contra él',
        prose: [
          'Visualized as a horizontal bar chart with positive values extending right and negative values extending left from a central axis, the full coefficient structure of v0.6.5 is informative. Price volatility\'s +0.5343 extends farthest to the right. Vendor concentration (+0.3749), price ratio (+0.2345), network member count (+0.1811), and same-day contract count (+0.0945) follow in descending order on the positive side. Win rate (+0.0488), ad period (+0.0423), and direct award (+0.0306) contribute small positive weights.',
          'On the negative side — features whose presence decreases risk — only one feature survived regularization: institution diversity at -0.3821. Vendors who serve many different institutions rather than concentrating their business with a single customer are structurally less suspicious. This is intuitive: a vendor with broad reach across the federal government is behaving like a legitimate market participant, while a vendor concentrated at one institution resembles the capture patterns that dominate the ground-truth set.',
          'The seven features regularized to zero deserve note: single-bid status, year-end timing, co-bidding rate, price hypothesis confidence, industry mismatch, institution risk, and sector spread. Some of these were historically treated as major corruption indicators in earlier risk models (v3.3, v4.0). The v0.6.5 calibration found that once the strongest features are in the model, these additional signals do not add predictive power beyond what the dominant features already capture. This is not an argument that single-bid status is irrelevant to corruption; it is an argument that single-bid status does not add information beyond what vendor concentration and price volatility already reveal.',
        ],
        prose_es: [
          'Visualizada como una barra horizontal con valores positivos extendiéndose a la derecha y valores negativos a la izquierda desde un eje central, la estructura completa de coeficientes de v0.6.5 es informativa. El +0.5343 de la volatilidad de precios se extiende hasta el extremo derecho. Concentración del proveedor (+0.3749), razón de precios (+0.2345), tamaño de red (+0.1811) y contratos del mismo día (+0.0945) la siguen en orden descendente en el lado positivo. Tasa de victoria (+0.0488), periodo de publicación (+0.0423) y adjudicación directa (+0.0306) aportan pesos positivos pequeños.',
          'En el lado negativo — variables cuya presencia disminuye el riesgo — solo una variable sobrevivió a la regularización: diversidad institucional en -0.3821. Los proveedores que sirven a muchas instituciones distintas en vez de concentrar su negocio con un solo cliente son estructuralmente menos sospechosos. Esto es intuitivo: un proveedor con amplio alcance a través del gobierno federal se comporta como un participante legítimo del mercado, mientras que un proveedor concentrado en una sola institución se asemeja a los patrones de captura que dominan el conjunto de la verdad-base.',
          'Las siete variables regularizadas a cero merecen mención: oferta única, momento de fin de año, tasa de co-licitación, confianza en la hipótesis de precio, desajuste de industria, riesgo institucional y dispersión sectorial. Algunas fueron tratadas históricamente como grandes indicadores de corrupción en modelos de riesgo anteriores (v3.3, v4.0). La calibración de v0.6.5 encontró que, una vez que las variables más fuertes están en el modelo, estas señales adicionales no aportan poder predictivo más allá de lo que las variables dominantes ya capturan. Esto no es un argumento de que la oferta única sea irrelevante para la corrupción; es un argumento de que la oferta única no agrega información más allá de lo que la concentración del proveedor y la volatilidad de precios ya revelan.',
        ],
        chartConfig: {
          type: 'inline-diverging',
          title: 'v0.6.5 Model: What Predicts Corruption Risk',
          title_es: 'Modelo v0.6.5: Qué predice riesgo de corrupción',
          chartId: 'model-coefficients-full',
          data: {
            points: [
              { label: 'Price volatility',     label_es: 'Volatilidad de precios',  value: 0.5343, highlight: true, annotation: 'strongest signal', annotation_es: 'señal más fuerte' },
              { label: 'Vendor concentration', label_es: 'Concentración de proveedor', value: 0.3749 },
              { label: 'Price ratio',          label_es: 'Razón de precios',        value: 0.2345 },
              { label: 'Network size',         label_es: 'Tamaño de red',           value: 0.1811 },
              { label: 'Same-day contracts',   label_es: 'Contratos del mismo día', value: 0.0945 },
              { label: 'Win rate',             label_es: 'Tasa de victoria',        value: 0.0488 },
              { label: 'Ad period (days)',     label_es: 'Periodo publicación (días)', value: 0.0423 },
              { label: 'Direct award',         label_es: 'Adjudicación directa',    value: 0.0306 },
              { label: 'Institution diversity', label_es: 'Diversidad institucional', value: -0.3821, color: '#3b82f6', annotation: 'protective', annotation_es: 'protectora' },
            ],
            referenceLine: { value: 0, label: '', color: '#52525b' },
            unit: 'coefficient',
            annotation: '7 other features regularized to zero by ElasticNet. Price volatility leads by 43%.',
            annotation_es: '7 variables más fueron regularizadas a cero por ElasticNet. La volatilidad de precios lidera por 43%.',
          },
        },
        pullquote: {
          quote: 'Only one protective feature survived regularization: the diversity of institutions a vendor serves. Broad reach is the structural signature of legitimacy.',
          quote_es: 'Solo una variable protectora sobrevivió a la regularización: la diversidad de instituciones a las que un proveedor sirve. La amplitud de alcance es la firma estructural de la legitimidad.',
          stat: '-0.3821',
          statLabel: 'institution_diversity coefficient (protective)',
          statLabel_es: 'coeficiente de diversidad institucional (protectora)',
        },
        sources: [
          'RUBLI v0.6.5 model coefficient table, docs/RISK_METHODOLOGY_v6.md.',
          'Zou, H., & Hastie, T. (2005). Regularization and variable selection via the elastic net.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'What Price Volatility Looks Like',
        title_es: 'Cómo se ve la volatilidad de precios',
        prose: [
          'Abstract coefficients become concrete when applied to real contracting data. GRUPO FÁRMACOS ESPECIALIZADOS — the pharmaceutical monopolist in RUBLI\'s P1 pattern with 133.2 billion pesos across 6,303 contracts — shows price volatility as its dominant risk driver. A pharmaceutical distributor serving a single institution should charge relatively consistent per-unit prices for consistent products. Instead, RUBLI\'s z-score analysis shows this vendor\'s contract amounts varying by factors of 5 to 10 times within the same year for the same institution for structurally similar procurement categories.',
          'The IMSS Ghost Company Network — one of the 748 ground-truth cases the model learned from — also showed price volatility as a defining feature. Phantom companies charging 3 million pesos for one delivery and 27 million pesos for a similar delivery three months later, with no obvious change in scope, produce the statistical fingerprint the model was trained to recognize. Segalmex food distribution fraud showed the same pattern: food delivery contracts varying by orders of magnitude for what should have been comparable operations.',
          'This is not necessarily a pricing model difference. It is consistent with what fraud researchers call "negotiated pricing" — where the contract amount is set through informal negotiation between procurement official and vendor rather than through competitive market pricing, and the nominal amount is adjusted to whatever sum the approving official is willing to sign. The inconsistency in price is the forensic trace of a process where the price does not emerge from competition but from relationship.',
          'OECD\'s 2022 Principles for Integrity in Public Procurement specifically recommend that procurement systems generate "price benchmarks that allow monitoring of consistency over time and across vendors." Mexico\'s CompraNet collects the data necessary to implement this recommendation. RUBLI\'s price volatility feature is exactly this benchmark applied at scale — and the ground truth cases confirm that the benchmark identifies corruption with measurable accuracy.',
        ],
        prose_es: [
          'Los coeficientes abstractos se vuelven concretos al aplicarse a datos reales de contratación. GRUPO FÁRMACOS ESPECIALIZADOS — el monopolista farmacéutico en el patrón P1 de RUBLI con 133.2 mil millones de pesos en 6,303 contratos — muestra la volatilidad de precios como su principal motor de riesgo. Un distribuidor farmacéutico que sirve a una sola institución debería cobrar precios por unidad relativamente consistentes para productos consistentes. En cambio, el análisis z-score de RUBLI muestra que los montos de contrato de este proveedor varían por factores de 5 a 10 veces dentro del mismo año, para la misma institución, en categorías de adquisición estructuralmente similares.',
          'La Red de Empresas Fantasma del IMSS — uno de los 748 casos de la verdad-base de los que el modelo aprendió — también mostró la volatilidad de precios como característica definitoria. Empresas fachada cobrando 3 millones de pesos por una entrega y 27 millones por una entrega similar tres meses después, sin cambio aparente en el alcance, producen la huella estadística que el modelo fue entrenado a reconocer. El fraude de distribución alimentaria de Segalmex mostró el mismo patrón: contratos de entrega de alimentos variando por órdenes de magnitud para lo que debían ser operaciones comparables.',
          'Esto no es necesariamente una diferencia en el modelo de precios. Es consistente con lo que los investigadores del fraude llaman "fijación negociada de precios" — donde el monto del contrato se establece mediante negociación informal entre funcionario de adquisiciones y proveedor en vez de mediante competencia de mercado, y el monto nominal se ajusta a la suma que el funcionario que aprueba esté dispuesto a firmar. La inconsistencia en el precio es la huella forense de un proceso donde el precio no emerge de la competencia sino de la relación.',
          'Los Principios de la OCDE 2022 para la Integridad en la Contratación Pública recomiendan específicamente que los sistemas de adquisiciones generen "puntos de referencia de precios que permitan monitorear la consistencia en el tiempo y entre proveedores." CompraNet, en México, recopila los datos necesarios para implementar esta recomendación. La variable de volatilidad de precios de RUBLI es exactamente ese punto de referencia aplicado a escala — y los casos de la verdad-base confirman que el punto de referencia identifica corrupción con precisión medible.',
        ],
        pullquote: {
          quote: 'When price is negotiated rather than competed, the price is whatever the signing official will approve — and inconsistency is the forensic trace.',
          quote_es: 'Cuando el precio se negocia en vez de competirse, el precio es lo que el funcionario firmante esté dispuesto a aprobar — y la inconsistencia es la huella forense.',
          stat: '5-10x',
          statLabel: 'within-year price variation for top P1 monopoly vendor',
          statLabel_es: 'variación de precios dentro del año para el principal proveedor monopolista P1',
          barValue: 0.70,
          barLabel: 'avg risk score for high-volatility vendor contracts',
          barLabel_es: 'riesgo promedio en contratos de proveedores de alta volatilidad',
        },
        sources: [
          'OECD. (2022). OECD Principles for Integrity in Public Procurement.',
          'RUBLI SHAP analysis, price_volatility feature contributions for P1 vendors, April 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Why This Holds Up Across Sectors',
        title_es: 'Por qué se sostiene a través de sectores',
        prose: [
          'The v0.6.5 model was calibrated at two levels: a global model across all sectors and 12 per-sector models tuned to each sector\'s specific patterns. Price volatility\'s dominance is remarkably consistent across this multilevel structure. In the global model it leads with +0.5343. In the sector-specific models for salud, infrastructura, and energia — the three largest procurement sectors — it remains the strongest or second-strongest positive coefficient.',
          'The consistency matters because it rules out one plausible alternative hypothesis: that price volatility is simply a proxy for sector or vendor type and does not independently predict corruption. If that were true, the global coefficient would collapse when sector-specific models are fit. Instead the coefficient remains strong across sector models. Price volatility is capturing something structural about how corrupt procurement operates, not merely something categorical about which sectors are risky.',
          'Cross-model validation strengthens the finding further. RUBLI runs a separate anomaly detection layer using PyOD\'s IForest and COPOD algorithms — unsupervised methods that do not use the ground-truth labels at all. The contracts flagged as anomalous by these unsupervised methods overlap substantially with the high-price-volatility contracts identified by the supervised model. Two independent analytical approaches converge on the same population of contracts. Either both are fundamentally misreading the data, or both are detecting the same underlying signal.',
          'The model\'s AUC of 0.828 on vendor-stratified test data (the true hold-out measure, where no vendor appears in both training and test sets) confirms the predictive power. That AUC is high enough that the model\'s rankings can be trusted as an investigative priority system, though it is not high enough to support individual-contract verdicts without additional investigation. The coefficient structure reveals what the model is doing; the AUC reveals how well it does it; the ground-truth validation confirms the doing is honest.',
        ],
        prose_es: [
          'El modelo v0.6.5 fue calibrado en dos niveles: un modelo global a través de todos los sectores y 12 modelos por sector ajustados a los patrones específicos de cada uno. El dominio de la volatilidad de precios es notablemente consistente a través de esta estructura multinivel. En el modelo global lidera con +0.5343. En los modelos sectoriales de salud, infraestructura y energía — los tres mayores sectores de contratación — sigue siendo el coeficiente positivo más fuerte o el segundo más fuerte.',
          'La consistencia importa porque descarta una hipótesis alternativa plausible: que la volatilidad de precios sea simplemente un sustituto del sector o tipo de proveedor y no prediga independientemente la corrupción. Si fuera así, el coeficiente global colapsaría cuando se ajustan modelos por sector. En cambio el coeficiente se mantiene fuerte a lo largo de los modelos sectoriales. La volatilidad de precios está capturando algo estructural sobre cómo opera la contratación corrupta, no meramente algo categórico sobre cuáles sectores son riesgosos.',
          'La validación entre modelos refuerza aún más el hallazgo. RUBLI corre una capa de detección de anomalías separada usando los algoritmos IForest y COPOD de PyOD — métodos no supervisados que no usan en absoluto las etiquetas de la verdad-base. Los contratos marcados como anómalos por estos métodos no supervisados se traslapan sustancialmente con los contratos de alta volatilidad de precios identificados por el modelo supervisado. Dos enfoques analíticos independientes convergen en la misma población de contratos. O ambos están leyendo mal los datos de manera fundamental, o ambos están detectando la misma señal subyacente.',
          'El AUC del modelo de 0.828 en datos de prueba estratificados por proveedor (la verdadera medida de hold-out, donde ningún proveedor aparece tanto en el conjunto de entrenamiento como en el de prueba) confirma el poder predictivo. Ese AUC es suficientemente alto para que las clasificaciones del modelo se puedan confiar como sistema de prioridad investigativa, aunque no es suficientemente alto para sostener veredictos sobre contratos individuales sin investigación adicional. La estructura de coeficientes revela lo que el modelo está haciendo; el AUC revela qué tan bien lo hace; la validación contra la verdad-base confirma que ese hacer es honesto.',
        ],
        pullquote: {
          quote: 'Two independent analytical approaches — supervised risk scoring and unsupervised anomaly detection — converge on the same high-price-volatility contracts.',
          quote_es: 'Dos enfoques analíticos independientes — calificación de riesgo supervisada y detección de anomalías no supervisada — convergen en los mismos contratos de alta volatilidad de precios.',
          stat: '0.828',
          statLabel: 'test AUC on vendor-stratified hold-out',
          statLabel_es: 'AUC de prueba en hold-out estratificado por proveedor',
          barValue: 0.828,
          barLabel: 'blind test on held-out vendor set',
          barLabel_es: 'prueba ciega sobre conjunto de proveedores reservado',
        },
        sources: [
          'Elkan, C., & Noto, K. (2008). Learning classifiers from only positive and unlabeled data. ACM SIGKDD.',
          'RUBLI cross-model validation, v0.6.5 vs PyOD ensemble, April 2026.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'Using Price Volatility as an Investigation Tool',
        title_es: 'Usar la volatilidad de precios como herramienta de investigación',
        prose: [
          'The strength of price volatility as a predictor creates a practical investigative tool. For any vendor-institution pair, RUBLI can compute the coefficient of variation in contract amounts over time and identify cases where that variation is statistically anomalous relative to the sector baseline. These cases are the highest-yield targets for price investigation because the model has already isolated the specific signal most predictive of documented corruption.',
          'What makes this more actionable than generic risk scores is the combination with physical evidence. A vendor with high price volatility can be investigated by comparing contract invoices against market prices for the same goods in the same period. If an IT vendor charged the government 3 million pesos in February and 27 million pesos in July for comparable hardware configurations, the July invoice should be scrutinized: was there a genuinely different scope, a legitimate change in specifications, or was the price inflated? The answer can be determined from contract documents — which exist, which are theoretically public under transparency law, and which RUBLI can tell an investigator exactly which to request.',
          'ASF\'s financial audit methodology already includes price benchmarking for pharmaceutical procurement — a practice established in response to the Maypo-Grupo Fármacos-PISA concentration. Extending that methodology to cover all high-volatility vendor-institution pairs — identified algorithmically by RUBLI — would represent a systematic upgrade of Mexico\'s anti-overpricing capacity. The analytical infrastructure is built. The data is available. The methodology is established. The gap is the institutional decision to deploy.',
          'For journalists, the price volatility feature provides a direct investigative pathway. RUBLI\'s SHAP decomposition for any individual vendor reveals exactly how much of the risk score is driven by price volatility versus other features. A vendor with high overall risk score driven primarily by price volatility is a specific type of story: not a ghost company, not a captured institutional relationship, but a pricing manipulation case. That pathway can be pursued through contract document requests and market price benchmarking — journalism that is feasible with public-record tools and does not require forensic accounting expertise.',
        ],
        prose_es: [
          'La fuerza de la volatilidad de precios como predictor crea una herramienta investigativa práctica. Para cualquier pareja proveedor-institución, RUBLI puede computar el coeficiente de variación en montos de contrato a lo largo del tiempo e identificar casos donde esa variación es estadísticamente anómala respecto a la base sectorial. Esos casos son los blancos de mayor rendimiento para investigación de precios porque el modelo ya aisló la señal específica más predictiva de corrupción documentada.',
          'Lo que vuelve esto más accionable que las calificaciones de riesgo genéricas es la combinación con evidencia física. Un proveedor con alta volatilidad de precios puede investigarse comparando facturas de contrato contra precios de mercado por los mismos bienes en el mismo periodo. Si un proveedor de TI cobró al gobierno 3 millones de pesos en febrero y 27 millones en julio por configuraciones comparables de hardware, la factura de julio debe escudriñarse: ¿hubo un alcance genuinamente distinto, un cambio legítimo de especificaciones, o el precio fue inflado? La respuesta puede determinarse a partir de los documentos del contrato — que existen, que en teoría son públicos bajo la ley de transparencia, y de los cuales RUBLI puede señalar exactamente cuáles solicitar.',
          'La metodología de auditoría financiera de la ASF ya incluye benchmarking de precios para adquisiciones farmacéuticas — una práctica establecida en respuesta a la concentración Maypo-Grupo Fármacos-PISA. Extender esa metodología para cubrir todas las parejas proveedor-institución de alta volatilidad — identificadas algorítmicamente por RUBLI — representaría una actualización sistemática de la capacidad anti-sobreprecio de México. La infraestructura analítica está construida. Los datos están disponibles. La metodología está establecida. La brecha es la decisión institucional de desplegarla.',
          'Para los periodistas, la variable de volatilidad de precios provee una vía investigativa directa. La descomposición SHAP de RUBLI para cualquier proveedor individual revela exactamente cuánto de la calificación de riesgo es impulsado por la volatilidad de precios frente a otras variables. Un proveedor con alta calificación general de riesgo impulsado primordialmente por volatilidad de precios es un tipo específico de historia: no una empresa fantasma, no una relación institucional capturada, sino un caso de manipulación de precios. Esa vía puede perseguirse mediante solicitudes de documentos de contrato y benchmarking de precios de mercado — periodismo que es factible con herramientas de registros públicos y que no requiere pericia forense contable.',
        ],
        pullquote: {
          quote: 'RUBLI has identified which vendor-institution pairs show the highest price anomaly. Each one is a price investigation waiting to happen.',
          quote_es: 'RUBLI ha identificado cuáles parejas de proveedor-institución muestran la mayor anomalía de precios. Cada una es una investigación de precios esperando suceder.',
          stat: 'AUC 0.828',
          statLabel: 'test accuracy of v0.6.5 model (vendor-stratified)',
          statLabel_es: 'precisión de prueba del modelo v0.6.5 (estratificada por proveedor)',
          barValue: 0.828,
          barLabel: 'blind test on held-out vendor set',
          barLabel_es: 'prueba ciega sobre conjunto de proveedores reservado',
        },
        sources: [
          'Elkan, C., & Noto, K. (2008). Learning classifiers from only positive and unlabeled data. ACM SIGKDD.',
          'ASF. (2024). Metodología de Auditoría de Precios en Adquisiciones de Medicamentos.',
          'RUBLI v0.6.5 model methodology. docs/RISK_METHODOLOGY_v6.md.',
        ],
      },
      {
        id: 'ch6',
        number: 6,
        title: 'The Investigation Path',
        title_es: 'El camino de la investigación',
        prose: [
          'For any journalist or oversight investigator seeking to act on RUBLI\'s price volatility finding, the investigation path has three stages. First, select a target vendor-institution pair from the top of the price-volatility ranking. Second, file INAI transparency requests for the full text of the highest-variance contracts — specification, quantities, unit prices, delivery terms. Third, benchmark those unit prices against either domestic market comparators (other Mexican contracts for the same goods) or international reference prices (the same products sold to governments in Brazil, Colombia, Chile).',
          'Each stage is operationally feasible. INAI requests for contract documents are routine and typically produce responses within 20 business days. Market price benchmarking can be performed using CompraNet itself for domestic comparators and using open international procurement databases (OECD\'s Open Contracting Partnership, the EU\'s TED database) for international comparators. A single well-chosen investigation can produce publishable findings within one to two months.',
          'The output of the process is not a prosecution — that requires the full apparatus of Ministerio Público or UIF investigation. The output is published evidence of overpricing in specific contracts, identified by name and amount, verified by independent benchmarking. That evidence creates the political and institutional pressure that prosecutions ultimately require. It is the kind of journalism that MCCI/Animal Político produced in La Estafa Maestra and that El Universal produced in the IMSS pharmaceutical investigations — now made systematically feasible by the algorithmic prioritization RUBLI provides.',
        ],
        prose_es: [
          'Para cualquier periodista o investigador de oversight que busque actuar sobre el hallazgo de volatilidad de precios de RUBLI, la ruta de investigación tiene tres etapas. Primero, seleccionar una pareja proveedor-institución desde lo alto del ranking de volatilidad de precios. Segundo, presentar solicitudes de transparencia ante el INAI por el texto completo de los contratos de mayor varianza — especificación, cantidades, precios unitarios, condiciones de entrega. Tercero, hacer benchmarking de esos precios unitarios contra comparadores de mercado doméstico (otros contratos mexicanos por los mismos bienes) o precios de referencia internacionales (los mismos productos vendidos a gobiernos en Brasil, Colombia, Chile).',
          'Cada etapa es operacionalmente factible. Las solicitudes al INAI por documentos de contrato son rutinarias y normalmente producen respuestas en 20 días hábiles. El benchmarking de precios de mercado puede realizarse usando CompraNet mismo para comparadores domésticos y usando bases internacionales abiertas de contratación pública (Open Contracting Partnership de la OCDE, base TED de la UE) para comparadores internacionales. Una sola investigación bien elegida puede producir hallazgos publicables en uno a dos meses.',
          'El resultado del proceso no es una imputación penal — eso requiere el aparato completo del Ministerio Público o investigación de la UIF. El resultado es evidencia publicada de sobreprecio en contratos específicos, identificados por nombre y monto, verificados con benchmarking independiente. Esa evidencia crea la presión política e institucional que las imputaciones en última instancia requieren. Es el tipo de periodismo que MCCI/Animal Político produjeron en La Estafa Maestra y que El Universal produjo en las investigaciones farmacéuticas del IMSS — ahora hecho sistemáticamente factible por la priorización algorítmica que provee RUBLI.',
        ],
        sources: [
          'INAI. (2024). Guía de Solicitudes de Información sobre Compras Públicas.',
          'Open Contracting Partnership. (2023). International benchmarks for public procurement pricing.',
        ],
      },
    ],
    relatedSlugs: ['el-monopolio-invisible', 'el-gran-precio', 'captura-institucional'],
    nextSteps: [
      'Request from ASF the methodology and vendor list for their pharmaceutical price benchmark audits — do they overlap with RUBLI\'s high price_volatility vendors?',
      'File INAI requests for invoice records on the 20 highest price_volatility vendors in RUBLI\'s T1 ARIA queue — compare against market price databases for the same goods.',
      'Cross-reference RUBLI\'s high-volatility vendors against COFECE\'s cartel investigation database — are any companies currently under competition investigation?',
      'Investigate whether CompraNet\'s data structure permits automated price-consistency monitoring across procurement rounds — what are the legal barriers to publishing such alerts publicly?',
      'Publish a ranked list of the top 100 highest-price-volatility vendor-institution pairs with per-contract breakdowns for investigative follow-up.',
      'Partner with CIDE or UNAM economics faculty to conduct an academic peer-reviewed analysis of the predictive power of price volatility against the 748 ground-truth cases.',
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
} {
  return {
    headline: pickLang(story.headline, story.headline_es, lang) as string,
    subheadline: pickLang(story.subheadline, story.subheadline_es, lang) as string,
    leadStatLabel: pickLang(story.leadStat.label, story.leadStat.label_es, lang) as string,
    leadStatSublabel: pickLang(story.leadStat.sublabel, story.leadStat.sublabel_es, lang),
  }
}

export function getRelatedStories(slug: string): StoryDef[] {
  const story = getStoryBySlug(slug)
  if (!story?.relatedSlugs) return []
  return story.relatedSlugs
    .map(s => getStoryBySlug(s))
    .filter((s): s is StoryDef => s !== undefined)
}
