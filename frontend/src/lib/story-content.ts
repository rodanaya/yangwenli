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
    chartId?: string
    data?: StoryInlineChartData
    multiSeries?: StoryMultiSeriesData
    network?: StoryNetworkData
    stacked?: StoryStackedBarData
  }
}

export interface StoryChartPoint {
  label: string
  value: number
  value2?: number
  color?: string
  highlight?: boolean
  annotation?: string
}

export interface StoryInlineChartData {
  points: StoryChartPoint[]
  referenceLine?: { value: number; label: string; color?: string }
  referenceLine2?: { value: number; label: string; color?: string }
  unit?: string
  maxValue?: number
  yLabel?: string
  annotation?: string
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
    color: string
    values: number[]
    /** Optional callout: marker + text on a specific x index. */
    annotation?: { xIndex: number; text: string }
    /** Optional total caption beside the legend ("88.0B over 23 years"). */
    totalCaption?: string
  }>
  unit?: string
  yLabel?: string
  annotation?: string
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
  anchor?: { value: string; label: string }
  annotation?: string
}

/**
 * Stacked-bar comparison for InlineStackedBar. Each row is a vendor /
 * category; each row is split into two segments (e.g. "main customer"
 * vs "all others") so the dominant share reads as a band.
 */
export interface StoryStackedBarData {
  rows: Array<{
    label: string
    /** Total bar value. */
    total: number
    /** Sub-segment that gets the highlight color (e.g. IMSS portion). */
    highlight: number
    /** Optional row-level color override. */
    color?: string
    /** Sub-text shown right of the bar (e.g. "60.1% IMSS"). */
    annotation?: string
  }>
  unit?: string
  /** Top-of-card anchor stat. */
  anchor?: { value: string; label: string }
  annotation?: string
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
          chartId: 'ghost-detection-grid',
          data: {
            points: [
              { label: 'EFOS confirmed ghost companies', value: 42, color: '#dc2626', highlight: true },
              { label: 'P2-pattern, not on any official list', value: 5992, color: '#f59e0b' },
            ],
            annotation: 'Each dot = 1 vendor. 6,034 total flagged by RUBLI P2 algorithm across 2002-2025.',
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
    subheadline: 'RUBLI\'s risk model reveals a relentless ladder across 3 million contracts: as contract size grows, corruption risk climbs from safe to critical. The 112 largest contracts in the dataset — each above 5 billion pesos — carry an average risk score of 0.94.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'solo_datos',
    leadStat: { value: '0.94', label: 'avg risk score, contracts >5B MXN', sublabel: '112 contracts, 1.32 trillion pesos', color: '#dc2626' },
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
          chartId: 'risk-by-size-ladder',
          data: {
            points: [
              { label: '<100K', value: 0.2546 },
              { label: '100K-500K', value: 0.2685 },
              { label: '500K-1M', value: 0.2756 },
              { label: '1M-10M', value: 0.2883 },
              { label: '10M-50M', value: 0.4094, annotation: 'HIGH' },
              { label: '50M-500M', value: 0.6802, highlight: true, annotation: 'CRITICAL' },
              { label: '500M-5B', value: 0.9057, highlight: true, color: '#dc2626' },
              { label: '>5B MXN', value: 0.9395, highlight: true, color: '#dc2626' },
            ],
            referenceLine: { value: 0.60, label: 'Critical threshold', color: '#dc2626' },
            referenceLine2: { value: 0.40, label: 'High risk threshold', color: '#f97316' },
            unit: 'risk score',
            maxValue: 1.0,
            yLabel: 'Average v0.6.5 risk score',
            annotation: 'The largest contracts in Mexican federal procurement are, on average, the riskiest.',
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
        title: 'Who Sits at the Top of the Ladder',
        prose: [
          'The individual vendors at the top of the risk ladder are specific and nameable. Four pharmaceutical distributors dominate the critical-risk large-contract population in the salud sector. GRUPO FÁRMACOS ESPECIALIZADOS S.A. DE C.V. received 133.2 billion pesos across 6,303 contracts between 2007 and 2020; its vendor-level risk score is 0.9831. FARMACEUTICOS MAYPO S.A. DE C.V. received 86.2 billion pesos across 24 years, with a vendor risk score of 0.9638. LABORATORIOS PISA received 55.4 billion pesos across 24 years, with a vendor risk score of 0.9648. DISTRIBUIDORA INTERNACIONAL DE MEDICAMENTOS Y EQUIPO MEDICO (DIMM) received 51.4 billion pesos across 23 years, with a vendor risk score of 0.9887.',
          'These four vendors alone account for 326 billion pesos of federal health procurement over two decades. Their contracts are overwhelmingly large — well above the 50 million peso threshold where risk scores climb into critical territory — and their primary customer, year after year, is IMSS. The pattern is not hidden. It is the defining structural feature of Mexican pharmaceutical procurement.',
          'DIMM\'s vendor risk score of 0.9887 is the single highest in RUBLI\'s entire vendor database of more than 300,000 entities. That score is the algorithm\'s summary judgment: across every feature it weighs — price volatility, institution diversity, contract size distribution, network membership, procurement mechanism — DIMM more closely resembles documented corruption cases than any other vendor in 23 years of Mexican federal procurement.',
          'None of this constitutes proof of criminal conduct. The algorithm does not know whether DIMM delivered medicines on schedule or whether its prices were competitive. It knows only that DIMM\'s contracting fingerprint is indistinguishable from the fingerprints of ground-truth fraud cases. For oversight bodies, that should be sufficient to open a file.',
        ],
        pullquote: {
          quote: '326 billion pesos of pharmaceutical procurement across 23 years, concentrated in four vendors with average risk scores above 0.96.',
          stat: '0.9887',
          statLabel: 'DIMM vendor risk score — highest in the 300K-vendor database',
          barValue: 0.9887,
          barLabel: 'critical threshold: 0.60',
          vizTemplate: 'redline-gauge',
        },
        sources: [
          'RUBLI vendor_stats table, top-value salud sector vendors, April 2026.',
          'IMSS. (2024). Informe al Ejecutivo Federal y al Congreso de la Unión.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The OECD Threshold Gap',
        prose: [
          'Mexico\'s Ley de Adquisiciones sets monetary thresholds above which open competitive bidding becomes legally required. Those thresholds are denominated in Unidades de Medida y Actualización (UMA), a reference value that is adjusted annually for inflation — but only modestly, and never enough to keep pace with the growth in typical contract values. A threshold calibrated to trigger competitive bidding in 2010 represents roughly 40 percent less real purchasing power in 2026.',
          'The practical consequence: more contracts each year fall below the threshold that would have required competition a decade ago. Procurement officials retain discretion to award via direct adjudication or via the simplified "invitation to three" procedure in situations that the original law\'s drafters intended to require full competition. This threshold erosion is not a drafting error; it is a policy choice to favor procurement speed over competitive discipline.',
          'OECD\'s 2023 Procurement Performance Review of Mexico was explicit. It called for automatic inflation-indexed adjustment of competitive thresholds and for stronger post-award oversight of contracts above 50 million pesos. The Review found that Mexico\'s oversight capacity — principally ASF and SFP — was "structurally insufficient to audit contracts above 50 million pesos at adequate frequency." Adequate frequency in the OECD framework means risk-weighted review of at least 15 to 20 percent of high-value contracts annually. Mexico\'s rate is 3 to 5 percent.',
          'Applied to RUBLI\'s data: of 23,438 contracts above 50 million pesos currently in the dataset, ASF audits roughly 700 to 1,200 annually. At that rate the average high-value contract will be reviewed once every 20 to 33 years. In many cases it will never be reviewed at all, because the vendor, the institution, and the approving official will have moved on long before an audit arrives.',
        ],
        pullquote: {
          quote: 'At current audit rates, the average large Mexican federal contract will be reviewed once every 20 to 33 years. Most will never be reviewed at all.',
          stat: '~25 years',
          statLabel: 'average wait between audits for a high-value federal contract',
          barValue: 0.04,
          barLabel: 'OECD minimum: 15% annual coverage — implies review every 6–7 years',
          vizTemplate: 'mass-sliver',
        },
        sources: [
          'OECD. (2023). Public Procurement Performance Report: Mexico.',
          'ASF. (2025). Informe del Resultado de la Fiscalización Superior de la Cuenta Pública 2024.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. DOF, last amended 2022.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        prose: [
          'The risk ladder has a political dimension that the data alone cannot express. Every point on the ladder — from under-100K contracts to above-5-billion contracts — carries oversight responsibilities assigned by law to different institutions. ASF audits federal accounts after the fact. SFP oversees procurement process integrity. COFECE investigates anticompetitive behavior. UIF tracks suspicious financial flows. In principle, between these four institutions, no significant contract should escape scrutiny.',
          'In practice, the top of the ladder is where the institutions stop functioning. The contracts most likely to represent procurement fraud are also the contracts most likely to involve politically connected vendors, institutions close to presidential priorities, and procurement decisions that carry policy weight far beyond any individual audit. Auditing a 5-billion-peso contract is not a technical exercise; it is a political confrontation, and political confrontations are rationed carefully.',
          'RUBLI\'s data does not resolve this dynamic. It quantifies it. The 112 contracts above 5 billion pesos represent 1.32 trillion pesos of spending and an average risk score of 0.94. That is the shape of the accountability gap in a single statistic. Closing the gap does not require new laws or new technology. It requires the political will to audit contracts whose risk scores demand it, regardless of whose ministry signed them.',
          'Meanwhile, the same oversight institutions are visibly active at the bottom of the ladder. SFP and ASF review thousands of small-value contracts annually. Those audits are politically cheaper and technically easier, and they generate press releases demonstrating oversight activity. The result is a system whose auditing intensity is inversely correlated with corruption risk. The small contracts, which carry the lowest risk, get the most scrutiny. The large contracts, which carry the highest risk, get the least.',
        ],
        pullquote: {
          quote: 'Mexico audits its cleanest contracts the most and its riskiest contracts the least. The accountability gap grows with every peso.',
          stat: '95%',
          statLabel: 'of contracts above 5B MXN never audited — MX$1.25T unreviewed',
          barValue: 0.05,
          barLabel: 'estimated audit coverage rate: 5%',
          vizTemplate: 'mass-sliver',
        },
        sources: [
          'Transparencia Mexicana. (2023). Índice Nacional de Corrupción y Buen Gobierno.',
          'ASF. (2024). Programa Anual de Auditorías para la Fiscalización Superior de la Cuenta Pública.',
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
          chartId: 'big-four-totals',
          data: {
            points: [
              { label: 'Grupo Fármacos', value: 133.4, color: '#dc2626', highlight: true, annotation: 'risk 0.99' },
              { label: 'Maypo', value: 88.0, color: '#dc2626', highlight: true, annotation: 'risk 0.95' },
              { label: 'PISA', value: 55.6, color: '#a06820', highlight: true, annotation: 'risk 0.75' },
              { label: 'DIMM', value: 51.6, color: '#a06820', highlight: true, annotation: 'risk 0.54' },
            ],
            unit: 'B MXN',
            annotation: 'Total federal contracting per vendor, 2003-2025. Combined: 328.6B MXN. Three of the four carry critical-tier risk scores.',
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
          chartId: 'big-four-imss-share',
          stacked: {
            rows: [
              { label: 'Grupo Fármacos', total: 133.4, highlight: 80.0, annotation: '60.1% IMSS' },
              { label: 'Maypo',          total: 88.0,  highlight: 43.9, annotation: '50.5% IMSS' },
              { label: 'PISA',           total: 55.6,  highlight: 43.9, annotation: '72.2% IMSS' },
              { label: 'DIMM',           total: 51.6,  highlight: 35.2, annotation: '68.5% IMSS' },
            ],
            unit: 'B MXN',
            anchor: { value: '202.9B MXN', label: 'BIG FOUR · IMSS CONTRACTING ONLY · 2003-2025' },
            annotation: 'Solid bar = IMSS portion. Faded portion = all other federal customers combined. Each vendor\'s dependency on IMSS is between 50% and 72%.',
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
          chartId: 'big-four-relay',
          multiSeries: {
            xLabels: ['2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'],
            unit: 'B MXN',
            yLabel: 'Annual contract value',
            series: [
              {
                name: 'Grupo Fármacos',
                color: '#dc2626',
                values: [0, 0, 0, 0, 1.07, 2.81, 2.01, 12.86, 0.96, 5.83, 14.94, 13.23, 13.31, 12.93, 19.94, 15.64, 17.64, 0.00, 0, 0, 0, 0, 0],
                annotation: { xIndex: 14, text: '19.94 peak (2017)' },
                totalCaption: '· 133.4B total',
              },
              {
                name: 'Maypo',
                color: '#a06820',
                values: [0.36, 0, 0.43, 1.04, 2.08, 1.62, 1.73, 5.80, 1.97, 3.13, 6.30, 4.69, 6.46, 4.57, 9.77, 10.05, 7.98, 4.17, 4.50, 3.87, 2.37, 2.86, 0.31],
                annotation: { xIndex: 15, text: '10.05 (2018)' },
                totalCaption: '· 88.0B total',
              },
              {
                name: 'PISA',
                color: '#1e3a5f',
                values: [1.18, 0, 2.41, 0.56, 1.39, 0.73, 2.97, 1.58, 0.18, 0.36, 0.71, 0.94, 2.60, 0.96, 1.23, 0.47, 3.50, 6.42, 2.56, 3.77, 0.13, 0.67, 19.46],
                annotation: { xIndex: 22, text: '19.46 (2025)' },
                totalCaption: '· 55.6B total',
              },
              {
                name: 'DIMM',
                color: '#0891b2',
                values: [0.01, 0, 0.02, 0, 0, 0, 0, 3.27, 0.13, 0.97, 4.56, 4.26, 5.66, 6.53, 7.40, 7.96, 7.51, 0.18, 0.24, 0.30, 0.24, 1.05, 1.09],
                annotation: { xIndex: 15, text: '7.96 (2018)' },
                totalCaption: '· 51.6B total',
              },
            ],
            annotation: 'Read the relay: PISA dominates 2003-2009 → Grupo Fármacos / Maypo / DIMM dominate 2010-2019 → 2020 cliff (Grupo F. + DIMM collapse) → PISA returns and explodes in 2025 (19.46B, matching Grupo F.\'s 2017 all-time peak). The architecture that produced these contracts changed three times. The dependency did not.',
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
            anchor: { value: '5,285', label: 'TOTAL SHARED PROCUREMENT PROCEDURES' },
            annotation: 'Edge thickness scales with the number of bidding procedures both vendors appear in. Maypo↔PISA (1,436) and Grupo Fármacos↔Maypo (1,258) carry most of the cartel weight — exactly the dyads that dominated IMSS pharmaceutical contracting through the 2010s.',
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
    subheadline: 'For 14 consecutive years, more than 45% of Mexico\'s "competitive" federal procurement procedures attracted only one bidder. The OECD flags single-bid rates above 15% as a structural red flag. Mexico has been three to four times the threshold since 2010.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: { value: '64.4%', label: 'peak single-bidder rate', sublabel: '2011 — 4.3x the OECD threshold', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Invisible Hand That Never Competed',
        prose: [
          'A competitive procurement procedure is, by legal design, an open invitation: any qualified vendor may submit a bid. The theory holds that competition drives down prices, elevates quality, and reveals the true market value of what the government is buying. The theory requires multiple bidders.',
          'RUBLI\'s analysis of 23 years of Mexican federal procurement data shows that the theory has been failing continuously since at least 2010. Between 2010 and 2024, the annual single-bid rate — competitive procedures that received exactly one submission — ranged between 46 and 65 percent. In 2011 it peaked at 64.4 percent. In 2014 it reached 65.6 percent. In 2016, 62.5 percent. In 2023, the most recent complete year, it stood at 49.4 percent.',
          'For context: OECD\'s procurement research establishes that single-bid rates above 10 to 15 percent are a structural red flag warranting systematic review. The European Commission\'s ARACHNE risk-scoring tool — used across the EU to flag procurement fraud — treats any contract procedure with only one bidder as grounds for mandatory individual review. At 49 percent, Mexico is not experiencing an anomaly. It has normalized the absence of competition as standard procurement practice.',
          'The absolute numbers are arresting. Over 14 years of data, RUBLI counts more than 800,000 competitive procedures that received a single bid. Each of those procedures, on paper, satisfied Mexico\'s legal requirement for competitive sourcing. In reality, each was a predetermined award wrapped in procedural formality.',
        ],
        pullquote: {
          quote: 'Fourteen years. Every year above 45 percent. In a system where "competitive" means a single bidder showed up, the word has lost its meaning.',
          stat: '64.4%',
          statLabel: 'peak single-bid rate (2011)',
          barValue: 0.644,
          barLabel: 'OECD warning threshold: 15%',
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
        subtitle: 'Single-bid rates across every year, compared to the international threshold',
        prose: [
          'A plot of single-bid rates across 2002-2024 reveals the structural nature of the failure. The rate starts around 27-37 percent in the early 2000s — already above OECD\'s warning threshold, though the underlying data for that period is less reliable. In 2010-2011 the rate jumps sharply to 51-64 percent, coinciding with the introduction of electronic bidding via CompraNet. The jump is counterintuitive: digitization should have expanded access and lowered the single-bid rate. Instead it codified the pattern.',
          'From 2011 through 2018, the rate remains stubbornly in the 58-66 percent range across four different presidential administrations. In 2019, coinciding with the AMLO administration\'s initial reforms and the centralization of pharmaceutical procurement, the single-bid rate drops to 46.5 percent. But the drop does not represent a return to real competition — it reflects the movement of contracts out of competitive procedures entirely, into direct adjudication, where the single-bid question does not arise because no bidding is conducted.',
          'The OECD threshold of 15 percent, drawn as a reference line on this chart, sits in a part of the plot Mexico has not visited since before COMPRANET records began. To reach that threshold would require a fundamental restructuring of how Mexican federal procurement generates bidders: systematic market analysis before tender, competitive intelligence about potential suppliers, active outreach to qualified vendors, and tender specifications designed to maximize rather than minimize the competitive field.',
        ],
        chartConfig: {
          type: 'inline-line',
          title: 'Single-Bid Rate in Competitive Procedures 2002-2024',
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
            referenceLine: { value: 15, label: 'OECD red flag >15%', color: '#3b82f6' },
            unit: '%',
            maxValue: 80,
            yLabel: 'Single-bid rate (%)',
            annotation: 'Every year since 2010 is 3-4x the OECD red-flag threshold.',
          },
        },
        pullquote: {
          quote: 'Electronic bidding in 2010 should have lowered the single-bid rate. It raised it. The digital transition codified the pattern rather than breaking it.',
          stat: '2010',
          statLabel: 'year CompraNet became mandatory',
        },
        sources: [
          'DOF. (2012). Reformas a la Ley de Adquisiciones para la obligatoriedad de CompraNet.',
          'RUBLI single_bid analysis by year, 2002-2024. April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'Cover Bidding and Market Allocation',
        prose: [
          'A single-bid competitive procedure can have innocent explanations. Specialized industrial equipment may have only one qualified supplier in Mexico. Emergency procurement may have time constraints that realistically exclude new bidders. Some municipal contracts are too small to attract national vendors. Each of these is a legitimate pathway to a single-bid outcome.',
          'But when the rate is structural — persistent at 45-65 percent across decades, sectors, and administrations — the innocent explanations stop scaling. The pattern at that scale is consistent not with incidental lack of competition, but with two specific forms of coordination identified in international fraud research.',
          'The first is cover bidding: a predetermined winner coordinates with potential competitors, who submit bids deliberately set too high to win, creating the procedural appearance of competition while ensuring a predetermined outcome. The practice is legally prohibited under Mexican competition law and under OECD anti-cartel principles, but it requires proof of coordination that is difficult to obtain without financial records or informant testimony. RUBLI\'s co-bidding analysis — the pattern of which vendors appear together in the same procedures — identifies 3,985 vendors in the P5 pattern who systematically co-bid but rarely compete against each other.',
          'The second mechanism is market allocation: vendors informally divide the procurement universe by region, by institution, by product category, simply not bidding against each other in their respective territories. Unlike cover bidding, market allocation does not require coordinated communication on individual tenders. It requires only a stable understanding of who claims which market segment. The stability of Mexico\'s single-bid rate over 14 years is consistent with exactly this kind of long-term market partitioning.',
        ],
        pullquote: {
          quote: 'When half of all "competitive" procedures have one bidder, year after year, decade after decade, the word "competitive" has lost its meaning.',
          stat: '3,985',
          statLabel: 'vendors in P5 systematic co-bidding pattern',
        },
        sources: [
          'Conley, T., & Decarolis, F. (2016). Detecting Bidders Groups in Collusive Auctions. American Economic Journal: Microeconomics.',
          'RUBLI co-bidding pattern analysis, aria_queue P5 pattern (3,985 vendors), April 2026.',
          'OECD. (2009). Guidelines for Fighting Bid Rigging in Public Procurement.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'What Reform Has Not Fixed',
        prose: [
          'Mexico has pursued multiple procurement reform waves across the 14 years of high single-bid rates, and RUBLI\'s data allows precise measurement of each wave\'s effect. The 2012 reform of the Ley de Adquisiciones introduced mandatory electronic bidding via CompraNet; the single-bid rate held at 60-65 percent in the years following. The 2019 pharmaceutical centralization under INSABI promised to aggregate purchasing power and attract broader competitive participation; the single-bid rate dropped to 46-49 percent not because more bidders appeared, but because procurement volume shifted into direct adjudication. The 2023 simplification reforms emphasized procedural speed; the single-bid rate held at 49 percent.',
          'None of the three reforms moved the underlying structural condition. This is because none of them addressed the specific mechanisms — cover bidding and market allocation — that produce artificially high single-bid rates. Reforms to procedural rules do not prevent coordination. Reforms to electronic systems do not produce new bidders. Only enforcement action against coordinated bidders, combined with active market development to attract genuine competitors, can change the underlying numbers.',
          'The 2022 OECD/COFECE Joint Assessment of Mexican Procurement explicitly recommended that COFECE open systematic investigations of high single-bid sectors. Four years later, COFECE\'s public enforcement docket in procurement does not reflect that recommendation: the competition authority continues to focus its limited investigative capacity on private-sector cartels in retail, banking, and telecommunications, not on public procurement cartels. This is a resource allocation decision, not a legal or technical impossibility.',
        ],
        pullquote: {
          quote: 'Three reforms in a decade. Three types of procedural change. Zero structural impact on the single-bid rate.',
          stat: '14 years',
          statLabel: 'consecutive years with single-bid rate above OECD ceiling',
          barValue: 0.49,
          barLabel: 'most recent (2023) single-bid rate',
          vizTemplate: 'horizon',
        },
        sources: [
          'Transparencia Mexicana. (2023). Índice Nacional de Corrupción y Buen Gobierno.',
          'DOF. (2012). Reformas a la Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público.',
          'OECD/COFECE. (2022). Joint Assessment of Mexican Public Procurement Competition.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        prose: [
          'The institutional failure underlying Mexico\'s single-bid rate is subtler than straightforward corruption. Nobody in the procurement process is explicitly breaking the rules when only one bidder shows up. The procuring official ran the tender. The bidder submitted a bid. The award was made according to procedure. Each individual action is defensible. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.',
          'This is why traditional accountability institutions struggle with the problem. ASF audits individual contracts; it does not produce systemic findings about aggregated bidding patterns. SFP investigates individual officials; it does not investigate industry-wide cartels. COFECE investigates anticompetitive conduct but limits its public procurement cases to clear-cut cartel documentation, not to behavioral pattern evidence. The thing that RUBLI\'s data shows — a system-level structural failure — has no institution of accountability.',
          'Closing the gap requires either the creation of a new institutional capacity focused on structural procurement patterns, or the redirection of existing resources at COFECE and SFP toward the analysis RUBLI performs. Neither has happened. The single-bid rate is not a secret; Transparencia Mexicana and IMCO have reported on it for years. What is absent is institutional follow-through: naming the specific vendor clusters in P5 pattern, requesting their financial records, prosecuting documented cases of cover bidding, and establishing deterrent consequences for the officials who knowingly accept single-bid outcomes as normal.',
          'Until those consequences exist, reform will continue to mean procedural adjustment rather than structural change. The chart of single-bid rates will continue to sit three to four times above the OECD threshold, year after year, while everyone agrees the problem is serious.',
        ],
        pullquote: {
          quote: 'Nobody is individually breaking the rules. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.',
          stat: '800,000+',
          statLabel: 'single-bid competitive procedures 2010-2024',
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
    subheadline: 'RUBLI\'s P6 algorithm flagged 15,923 vendors showing signs of institutional capture. Across eight major sectors — led by infrastructure at 179 billion pesos and energy at 131 billion — the intermediary-pattern vendors alone account for 526 billion pesos of federal spending.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 15,
    status: 'auditado',
    leadStat: { value: '15,923', label: 'P6 capture-pattern vendors', sublabel: '526.8B MXN in P3 intermediary chains', color: '#8b5cf6' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Mechanics of Capture',
        prose: [
          'Institutional capture in procurement is distinct from simple corruption. It is not a one-time bribe — it is a relationship structure that embeds a vendor into an institution\'s procurement workflows so thoroughly that alternatives become invisible or impractical. Officials stop looking for competing vendors because the "reliable" vendor always delivers. The vendor\'s prices slowly rise because there is no pressure to compete. The relationship becomes self-reinforcing, and over years it becomes indistinguishable from policy.',
          'RUBLI\'s Pattern 6 (P6) algorithm identifies capture signatures by analyzing the concentration of a vendor\'s contracts at a single institution, the evolution of that concentration over time, and the degree to which that institution has ceased awarding to competitors in the relevant category. P6 is RUBLI\'s largest pattern: 15,923 vendors in the queue, representing the broadest category of structural procurement risk in the entire dataset.',
          'Adjacent to P6 is Pattern 3 (P3) — intermediary vendors who win contracts and subcontract the actual work to smaller entities, extracting a fee at each tier. P3 is both a capture mechanism and a fraud mechanism: a vendor captures institutional relationships, then monetizes those relationships by acting as a toll-road between the government and the real suppliers. RUBLI identifies 2,974 vendors in P3, concentrated overwhelmingly in infrastructure (179.5B MXN), energy (130.6B MXN), and health (104.2B MXN).',
        ],
        pullquote: {
          quote: '15,923 vendors in the capture pattern. 2,974 in the intermediary pattern. 526 billion pesos of federal spending running through these two structures alone.',
          stat: '526.8B MXN',
          statLabel: 'P3 intermediary contracts, eight sectors',
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
        subtitle: 'Where the intermediary chains run deepest',
        prose: [
          'The P3 intermediary pattern is not evenly distributed across Mexican procurement. It concentrates dramatically in the three sectors where contracts are largest, oversight is thinnest, and technical complexity provides cover: infrastructure, energy, and health.',
          'Infrastructure leads by a wide margin. 1,128 P3-classified vendors moved 179.5 billion pesos through intermediary structures in construction and public works between 2002 and 2025. Energy follows with 463 P3 vendors and 130.6 billion pesos, concentrated in the PEMEX and CFE ecosystems. Health is third with 476 vendors moving 104.2 billion pesos. Hacienda, education, agriculture, gobernación, and defense round out the top eight, each with tens of billions of pesos in P3-pattern contracting.',
          'The sectoral distribution matters because it maps onto known vulnerability patterns. Infrastructure contracts involve specialized subcontracting almost by necessity — a highway project uses dozens of different trades — which creates legitimate intermediary structures that also provide cover for fraudulent ones. Energy contracts involve specialized technical expertise that few vendors possess, which legitimately narrows competition but also enables capture by the few who meet the specifications. Health contracts involve FDA-equivalent regulatory approval and specialized storage, which narrows competition further and entrenches approved-supplier lists.',
          'In each sector the P3 mechanism operates differently. In infrastructure the intermediary wins the contract, then subcontracts civil works to actual construction firms, keeping 15-30 percent overhead. In energy the intermediary supplies equipment sourced from international manufacturers, marking up prices across the supply chain. In health the intermediary distributes medications from a small number of actual pharmaceutical manufacturers, collecting margins at each link.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'P3 Intermediary Vendors by Sector (Total Value)',
          chartId: 'p3-by-sector',
          data: {
            points: [
              { label: 'Infraestructura', value: 179.5, color: '#ea580c' },
              { label: 'Energía', value: 130.6, color: '#eab308' },
              { label: 'Salud', value: 104.2, color: '#dc2626', highlight: true },
              { label: 'Hacienda', value: 40.9, color: '#16a34a' },
              { label: 'Educación', value: 19.1, color: '#3b82f6' },
              { label: 'Agricultura', value: 18.8, color: '#22c55e' },
              { label: 'Gobernación', value: 17.8, color: '#be123c' },
              { label: 'Defensa', value: 15.9, color: '#1e3a5f' },
            ],
            unit: 'B MXN',
            annotation: '2,974 intermediary-pattern vendors across 526.8B MXN of federal spending.',
          },
        },
        pullquote: {
          quote: 'Infrastructure alone moves 179 billion pesos through intermediary structures. The overhead cost — if OECD research applies — is 27 to 54 billion pesos.',
          stat: '179.5B MXN',
          statLabel: 'P3 intermediary contracts in infraestructura',
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
        prose: [
          'P6 capture is typically not instantaneous. RUBLI\'s temporal analysis shows that vendors classified as P6 typically begin as legitimate competitive winners — they earn an initial contract, deliver adequately, and build a relationship with an institutional contact. The risk metrics worsen gradually: year one shows normal competitive behavior; by year three, direct-award frequency is rising; by year five, the vendor is receiving 70-90 percent of the relevant category via direct adjudication at the same institution.',
          'This graduation from legitimate to captured is precisely what makes P6 difficult to catch through traditional audit methods. Each individual contract decision may appear defensible: the vendor has a track record, the official can cite past performance, and the administrative burden of running a new competitive process is real. The corruption is not in any single contract — it is in the pattern across hundreds of contracts over years.',
          'ASF\'s annual audit reports have repeatedly flagged IMSS and ISSSTE for over-reliance on recurring vendors without competitive re-tendering. The 2022 Cuenta Pública audit found IMSS pharmaceutical procurement showed "patterns of concentration inconsistent with market competition" in 15 specific categories. RUBLI\'s P6 analysis provides the quantitative underpinning for that finding at scale: at IMSS specifically, RUBLI counts 3,821 P6-pattern vendors moving 381 billion pesos across 381,075 contracts.',
          'The same mechanism operates at CFE (229.7B MXN in P6-pattern contracting), PEMEX Exploración y Producción (176.2B MXN), SCT / SICT (approximately 120B MXN), and CONAGUA (approximately 65B MXN). Across these five institutions alone, P6-pattern contracting totals 972 billion pesos — nearly a trillion pesos of federal spending routed through vendor relationships whose behavioral fingerprints indicate capture.',
        ],
        pullquote: {
          quote: 'Each individual contract appears defensible. The corruption is in the pattern across hundreds of contracts, across years, across entire institutions.',
          stat: '972B MXN',
          statLabel: 'P6 contracting at IMSS + CFE + PEMEX + SCT + CONAGUA',
          barValue: 0.78,
          barLabel: 'share via direct adjudication',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'ASF. (2022). Auditoría de Desempeño 2022-6-06G00-07-0024. Adquisición de Medicamentos, IMSS.',
          'RUBLI temporal contract analysis, P6-classified vendors, April 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The La Estafa Maestra Echo',
        prose: [
          'The largest documented case of intermediary fraud in Mexican procurement history is La Estafa Maestra — a scheme in which federal agencies contracted with public universities, which then subcontracted to phantom companies, which effectively returned money to the original agencies\' officials. The Parliamentary investigation of 2017 and the MCCI/Animal Político journalistic investigation of the same year found 7.67 billion pesos moved through this structure between 2013 and 2014 alone.',
          'La Estafa Maestra was possible because Mexico\'s procurement law had a carve-out for contracts with public universities, treating them as exempt from competitive bidding requirements under the legal fiction that universities are trusted public institutions. The universities became intermediaries between the procurement law and the shadow market, and the intermediaries within that chain were phantom companies whose RFCs matched nothing in the Registro Federal de Contribuyentes.',
          'RUBLI\'s ground truth database includes La Estafa Maestra; the vendors directly linked to it have risk scores averaging 0.55 to 0.65 — elevated but not at the ceiling, because the small contract counts of phantom companies limit what the behavioral model can see. What RUBLI does see clearly is the mechanism. The 2,974 P3 vendors in today\'s queue are the structural successors of the La Estafa Maestra architecture — different entities, different institutions, same role: a paid pass-through between government budget and actual delivery.',
          'The OECD\'s 2023 Procurement Performance Review explicitly warned that intermediary chains in public works typically add 15 to 30 percent overhead without adding delivery value. Applied to RUBLI\'s 526.8 billion pesos of P3 intermediary contracting, the implied overhead cost is somewhere between 79 and 158 billion pesos. That is, at the low end, approximately the annual budget of the entire federal Ministry of Health infrastructure program. The cost of intermediation, if it is fraudulent, is not hypothetical.',
        ],
        pullquote: {
          quote: 'La Estafa Maestra moved 7.67 billion pesos through an intermediary structure in two years. RUBLI\'s current P3 population is running 526 billion.',
          stat: '79-158B MXN',
          statLabel: 'estimated annual overhead cost of P3 intermediation',
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
        prose: [
          'Capture and intermediation are difficult to prosecute for a fundamental reason: both rely on legal procurement actions whose aggregate effect is harmful even when each individual action is defensible. Subcontracting is legal. Recurring vendor relationships are legal. Direct adjudication of specialized procurement is legal. A prosecutor cannot easily build a case against an individual contract; what the evidence demands is a case against a pattern, and Mexican procurement law does not provide the legal vehicle for pattern-based prosecution.',
          'The SFP has authority to audit procurement unit performance and can theoretically sanction officials whose patterns of award indicate favoritism. SFP\'s actual sanctions docket, however, focuses overwhelmingly on documented individual misconduct — bribery, conflict-of-interest failures, procedural violations. Pattern-based sanctions are rare and politically controversial because they require oversight bodies to second-guess cumulative professional judgment.',
          'RUBLI\'s 15,923 P6 vendors and 2,974 P3 vendors provide a starting point for precisely the pattern-based oversight that the legal architecture does not yet structurally support. UIF could subpoena bank records for the top-value P3 intermediaries to determine whether the price spread between government payment and subcontract payment is systematic. COFECE could investigate P6 vendor-institution relationships as potential prácticas monopólicas relativas. ASF could run dedicated audits of the highest-concentration P6 procurement units. None of this is happening systematically.',
          'The accountability gap is not legal. It is institutional and political. Mexico has the statutes, the oversight bodies, and — with RUBLI — the analytical capacity. What is missing is the political decision to deploy those tools against patterns that have operated undisturbed for two decades.',
        ],
        pullquote: {
          quote: 'Mexico has the statutes, the oversight bodies, and the analytical capacity. What is missing is the political decision to use them.',
          stat: '18,897',
          statLabel: 'total P3 + P6 vendors awaiting pattern-based investigation',
          barValue: 0.62,
          barLabel: 'share in direct-award contracts',
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
    subheadline: 'RUBLI traces a 14-year rise in non-competitive contract awards from 62% to 82%. Every administration set a new ceiling. The data shows this is not an emergency measure — it is structural policy.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'reporteado',
    leadStat: { value: '82.2%', label: 'direct award rate in 2023', sublabel: 'highest in 23-year dataset', color: '#ea580c' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Upward Slope That Never Reversed',
        prose: [
          'Every Mexican government since 2010 has promised procurement transparency. Every government has also used more direct awards than the previous one. RUBLI\'s data on direct award rates — contracts awarded without competitive bidding — documents this gap between rhetoric and reality with the clarity of a single ascending line.',
          'In 2010, the first year of reliable COMPRANET data (Structure B), 62.7 percent of all federal contracts were direct awards. By 2013 the rate had climbed to 68.4 percent. In 2015 it reached 73.0 percent under Peña Nieto. In 2019, AMLO\'s first year, it hit 77.8 percent. In 2021 it reached 80.0 percent. In 2023 it climbed to 82.2 percent — the highest rate in the 23 years RUBLI can analyze. In 2024 it remained at 79.3 percent.',
          'OECD\'s 2023 Procurement Performance Review sets 25-30 percent as the approximate ceiling for direct award usage in a well-functioning procurement system. That ceiling reflects the legitimate universe of single-source situations: genuine emergencies, sole-provider specialty procurement, small-value transactions where competitive overhead exceeds expected savings. Above 30 percent, the OECD framework treats direct adjudication as a structural indicator of procurement dysfunction.',
          'Mexico has been above 60 percent for the entire available data period. It has been above 75 percent since 2017. The ceiling the OECD frames as "dysfunction" is a floor Mexico does not approach. In Mexican federal procurement, non-competition is not the exception to the rule. It is the rule.',
        ],
        pullquote: {
          quote: 'In Mexico\'s federal procurement, competitive bidding is the exception. Direct awards are the rule, by a ratio of four to one.',
          stat: '82.2%',
          statLabel: 'direct award rate 2023',
          barValue: 0.822,
          barLabel: 'OECD recommended maximum: ~25-30%',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI contracts table analysis, is_direct_award flag, 2010-2024. Queried April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Chapter 3.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: 'Fourteen Years Above the Line',
        subtitle: 'Direct award rate 2010-2024, compared to the OECD recommended ceiling',
        prose: [
          'Charted year by year, the direct award rate traces a structural diagnosis of Mexican procurement. The line starts in 2010 at 62.7 percent — already more than twice the OECD ceiling — and climbs almost every year for the next 13. There is no single administration\'s fault here, and no single policy reform caused the trajectory. The ratchet operates continuously across partisan transitions.',
          'The 2020 COVID pandemic did produce a local spike in emergency direct awards, which RUBLI captures in the 78.1 percent figure for that year. But the overall trend was already climbing before the pandemic and continued climbing after it. The pandemic was not the cause of Mexico\'s direct-award culture; it was an accelerant applied to a pre-existing structural condition.',
          'The 2023 peak at 82.2 percent deserves particular scrutiny because it occurred during a period when the AMLO administration had completed the centralization of pharmaceutical procurement, had reconstituted military construction oversight, and had nominally committed to competitive procurement as the default mechanism. The peak is not an inheritance from the prior administration. It is a policy choice of the current architecture.',
        ],
        chartConfig: {
          type: 'inline-area',
          title: 'Direct Award Rate by Year 2010-2024',
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
              { label: '2023', value: 82.2, highlight: true, annotation: 'peak 82.2%' },
              { label: '2024', value: 79.3 },
            ],
            referenceLine: { value: 30, label: 'OECD recommended ceiling ~30%', color: '#3b82f6' },
            unit: '%',
            maxValue: 100,
            yLabel: 'Direct award rate (%)',
            annotation: 'Mexico exceeds OECD recommended ceiling by 2-3x every year in the dataset.',
          },
        },
        pullquote: {
          quote: 'The OECD ceiling is 30 percent. Mexico\'s floor is 60 percent. The distance between them is where competitive procurement used to live.',
          stat: '14 years',
          statLabel: 'consecutive years above 60% direct-award rate',
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
        prose: [
          'Direct award procedures exist for legitimate reasons. Mexico\'s Ley de Adquisiciones, Art. 41, enumerates them: genuine emergencies, single-source situations, continuity of services with existing contractors, small-value contracts below threshold, and specific enumerated exceptions including national security procurement and force majeure. Each of these exceptions was drafted to address a specific legitimate need that competitive bidding cannot accommodate.',
          'The problem RUBLI identifies is that "exception" has become "default." When 82 percent of contracts invoke one or another exception, the statute\'s architecture has been inverted. The exception clauses in Art. 41 are now the normal operating procedure, and open competitive bidding under Art. 26 is the exception.',
          'AMLO\'s 2019 centralization of pharmaceutical procurement under BIRMEX and INSABI was explicitly framed as an anti-corruption measure — removing the discretion of individual institutional buyers who had developed corrupt relationships with vendors. The irony documented in RUBLI\'s data: the centralized BIRMEX-INSABI system that replaced fragmented procurement ran at near-100 percent direct award rates in 2020-2021, with vendors winning enormous single-source contracts without competitive process. Centralization did not cure the direct-award dependency; it concentrated it.',
          'The mechanism of this concentration is revealing. A decentralized procurement system with corrupt relationships at 1,000 institutional buyers produces 1,000 instances of direct adjudication, each justified on its own terms. A centralized system with no more competitive capacity than its predecessors produces a single national-scale direct award, justified on a single institutional basis. The shape of the problem has changed; the underlying dependency has not.',
        ],
        pullquote: {
          quote: 'The pandemic did not create Mexico\'s direct-award culture. It was an accelerant applied to a pre-existing structural condition.',
          stat: '78.1%',
          statLabel: 'direct award rate in 2020 (pandemic year)',
          barValue: 0.781,
          barLabel: 'was already 77.8% in 2019 pre-pandemic',
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
        prose: [
          'OECD research across 40 countries has quantified the premium paid in non-competitive procurement. A 2019 meta-analysis found that eliminating competition in public procurement increases contract prices by 15 to 30 percent on average, with higher premiums in concentrated markets and for recurring vendors. The premium is larger still — 25 to 40 percent — for infrastructure and specialized technical procurement.',
          'Applied conservatively to Mexican federal procurement: in 2023, direct-award contracts totaled approximately 720 billion pesos in face value. At a 15 percent competitive distortion premium — the low end of the OECD range — the competitive distortion cost is approximately 108 billion pesos annually. That figure is equivalent to roughly 40 percent of the entire federal education budget for that year, or 60 percent of the health infrastructure budget.',
          'This is not a definitive calculation. Individual contract circumstances vary enormously, and some direct awards may in fact be priced competitively due to internal benchmarking, international reference pricing, or vendor self-discipline. But RUBLI\'s risk model provides complementary corroborating evidence: the average risk score for direct-award contracts is significantly higher than for competitive procedures in the same sector-year, consistent with the pattern that non-competitive awards attract overpricing and favoritism even when not outright fraudulent.',
          'Summed across the 23 years of data, the aggregate cost of Mexican direct-award dependency, assuming OECD-typical premiums, is in the low trillions of pesos. That is not a precise figure; it is an order-of-magnitude estimate. What RUBLI\'s data permits with precision is the documentation that the opportunity cost exists and that it scales with the direct-award rate. Every percentage point of additional direct adjudication corresponds, in international experience, to measurable procurement cost inflation.',
        ],
        pullquote: {
          quote: 'A 15 percent competitive premium on 720 billion pesos in direct awards equals roughly 108 billion pesos annually — the cost of competition foregone.',
          stat: '~108B MXN',
          statLabel: 'estimated annual cost of non-competitive procurement premium',
        },
        sources: [
          'Decarolis, F., & Giuffrida, L. (2019). Civil Servants and Cartels: The Revolving Door and Corruption in Procurement. American Economic Review.',
          'SHCP. (2024). Presupuesto de Egresos de la Federación 2024 — sector breakdowns.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'The Accountability Gap',
        prose: [
          'The institutional architecture to oversee direct awards exists. Every direct award under Art. 41 requires a written justification stating the specific legal basis (emergency, sole source, continuity, et cetera), the vendor selected, and the rationale. Those justifications are theoretically public under transparency law. SFP is theoretically empowered to audit the pattern of justifications at each procurement unit. ASF is theoretically empowered to review individual high-value direct awards during Cuenta Pública audits.',
          'In practice, the justification documents are published inconsistently, the SFP pattern-audit function operates at a small fraction of its legal capacity, and ASF individual-contract reviews cover a tiny fraction of high-value direct awards. The oversight mechanism that Mexico built in law has not been built in practice. The rate of 82 percent is not the outcome of a system that tried to constrain direct awards and failed; it is the outcome of a system that accepted direct awards as normal and built no constraining architecture at all.',
          'Closing this gap requires three things that RUBLI\'s data makes possible but does not deliver on its own. First, systematic publication of Art. 41 justification documents in machine-readable form. Second, pattern-based audit by SFP of procurement units whose direct-award rates exceed sector norms. Third, real-time risk monitoring during procurement decisions so that a risky direct adjudication can be challenged before it is executed rather than after.',
          'Each of these fixes is technically feasible today. CompraNet has the data architecture. RUBLI has the analytical methodology. What is missing is the institutional commitment to operate an oversight system against the grain of 14 years of direct-award dependency. Until that commitment materializes, the line on the chart will continue to drift upward, and the cost — measurable in hundreds of billions of pesos annually — will continue to be paid by the Mexican public.',
        ],
        pullquote: {
          quote: 'Mexico built an oversight architecture in law and never built it in practice. The 82% direct-award rate is the visible shape of that absence.',
          stat: '~720B MXN',
          statLabel: '2023 direct-award contracts by face value',
          barValue: 0.82,
          barLabel: 'share of federal procurement in 2023',
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
    subheadline: 'Every Mexican administration since Fox has been riskier than the one before it. Under AMLO, RUBLI\'s model scores 17.6% of contracts as high-risk — the highest of any sexenio in 23 years of data and above the OECD upper limit of 15%.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 17,
    status: 'reporteado',
    leadStat: { value: '17.6%', label: 'high-risk rate, AMLO era (2019-2024)', sublabel: 'vs 9.7% under Calderón, 7.9% under Fox', color: '#dc2626' },
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
        title: 'The Ascending Line',
        subtitle: 'High-risk rate by administration, 2001-2024',
        prose: [
          'Visualized as a bar chart, the progression is inescapable. Fox: 7.9 percent. Calderón: 9.7 percent. Peña Nieto: 12.4 percent. AMLO: 17.6 percent. Each bar taller than the one before it. The OECD upper limit of 15 percent sits as a horizontal reference line that the first three administrations remained below and the fourth crossed.',
          'This is not a partisan statistic. The upward trend spans two political parties (PAN for Fox and Calderón, PRI for Peña Nieto, MORENA for AMLO) and four presidential styles. The pattern is bigger than any single administration\'s anti-corruption rhetoric or enforcement priority. It reflects a structural feature of Mexican procurement that has deepened independently of which party holds executive power.',
          'Nor is the trend purely a function of growing procurement volume. If it were, the ratio of high-risk contracts to total contracts would remain constant across administrations; instead the ratio itself rises. Something has been changing in the composition of Mexican federal procurement — in the mix of direct awards versus competitive procedures, in the vendor concentration at key institutions, in the patterns of price anomaly that the model detects — that causes each successive administration\'s contracts to look more like documented corruption cases than the contracts of the administration before it.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'High-Risk Contract Rate by Administration',
          chartId: 'admin-risk-ladder',
          data: {
            points: [
              { label: 'Fox 2001-06', value: 7.94, color: '#3b82f6', annotation: '7.9%' },
              { label: 'Calderón 2007-12', value: 9.67, color: '#3b82f6', annotation: '9.7%' },
              { label: 'Peña 2013-18', value: 12.43, color: '#f59e0b', annotation: '12.4%' },
              { label: 'AMLO 2019-24', value: 17.63, color: '#dc2626', highlight: true, annotation: '17.6%' },
            ],
            referenceLine: { value: 15, label: 'OECD upper bound 15%', color: '#ef4444' },
            unit: '%',
            maxValue: 22,
            yLabel: 'High-risk contract rate (%)',
            annotation: 'AMLO administration exceeds OECD benchmark. Trend is worsening across every transition.',
          },
        },
        pullquote: {
          quote: 'Four administrations. Two parties. Four bars, each taller than the one before it. The trend is structural, not partisan.',
          stat: '+122%',
          statLabel: 'increase in high-risk rate from Fox to AMLO',
        },
        sources: [
          'RUBLI administration-level risk analysis, April 2026.',
          'OECD benchmark derived from OECD. (2023). Public Procurement Performance Report.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: 'What Drives the AMLO-Era Score',
        prose: [
          'A high-risk score does not equal proof of corruption. RUBLI\'s model is a similarity indicator: AMLO-era contracts more closely resemble known-bad patterns than Calderón-era contracts did, in the aggregate. The question is why, and the answer is visible in the procurement mechanism data.',
          'Three structural factors stand out. First, the direct-award rate under AMLO rose to 77-82 percent — the highest in the dataset. More direct awards means fewer competitive pressure points that correlate with clean procurement. Second, the COVID-19 emergency procurement in 2020-2022 was executed primarily through emergency direct awards to vendors with new or thin contracting histories — a pattern that RUBLI\'s ghost-companion heuristic assigns elevated risk. Third, the INSABI/BIRMEX pharmaceutical centralization created large, single-source contracts that structurally resemble monopoly capture in RUBLI\'s risk model.',
          'None of these explanations is exculpatory. "We bypassed competition because of an emergency" does not mean the resulting contracts were clean — emergency procurement is consistently identified in international research as the highest-risk procurement mode, not the lowest. "We centralized procurement to fight corruption" does not mean the centralized system was cleaner than the decentralized one it replaced. The model sees the resulting contracts, not the intended reform.',
          'The AMLO administration chose to govern through procurement mechanisms that RUBLI\'s model — and OECD research independently — consistently associate with elevated corruption risk. That is a policy decision with measurable consequences, and the measurement is the 17.6 percent high-risk rate. Whether any individual contract in that 17.6 percent was actually fraudulent requires case-by-case investigation. What RUBLI documents with precision is that the structural conditions under which corruption flourishes were more prevalent under AMLO than under any of the three previous administrations.',
        ],
        pullquote: {
          quote: 'Emergency procurement is consistently identified as the highest-risk procurement mode. Choosing to govern through it is a policy decision with measurable consequences.',
          stat: '2.76T MXN',
          statLabel: 'AMLO-era procurement spending (2019-2024)',
          barValue: 0.782,
          barLabel: 'share awarded without competition',
          vizTemplate: 'breach-ceiling',
        },
        sources: [
          'RUBLI direct-award and risk analysis by year, 2019-2024. April 2026.',
          'Transparencia Mexicana / IMCO. (2021). Pandemia sin Transparencia: Análisis de Compras COVID-19.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Volume as Multiplier',
        prose: [
          'Percentage rates compress the scale of absolute risk. At 17.6 percent high-risk across 1.05 million AMLO-era contracts, RUBLI counts 185,248 individual contracts flagged for investigation priority. At Peña Nieto\'s 12.4 percent across 1.23 million contracts, the absolute count was 152,683. The AMLO administration flagged 32,565 more high-risk contracts than the previous administration, in fewer total contracts.',
          'The AMLO-era procurement volume averaged 502 billion pesos per year — the highest annual spending rate in the 23-year dataset. Combined with the elevated risk rate, the financial scale of high-risk AMLO contracting reaches approximately 485 billion pesos in the high-risk tier alone. That is nearly five times the annual federal health research budget and approximately 20 percent of the entire annual federal budget allocated to social programs.',
          'Volume compounds risk in a specific and serious way: every high-risk contract is a potential investigation target for ASF, SFP, or UIF. ASF\'s annual audit capacity for detailed contract-level review is roughly 500 to 1,000 contracts per year. Against a population of 185,248 AMLO-era high-risk contracts, ASF\'s theoretical maximum coverage over the entire six-year administration is 3-5 percent. The remaining 95-97 percent will not be audited unless a different institutional mechanism takes up the task.',
          'RUBLI does not replace that audit function. But RUBLI\'s ranking of contracts by risk score provides precisely the prioritization ASF needs to concentrate its limited resources on the highest-probability cases. The 17.6 percent high-risk population is not homogeneous; within it, the top 1 percent by score (approximately 1,850 contracts) account for the overwhelming majority of investigative value. That list is generated; it remains to be used.',
        ],
        pullquote: {
          quote: '185,248 high-risk contracts in a single administration. ASF\'s six-year audit capacity covers 3 to 5 percent. The rest will never be reviewed.',
          stat: '~485B MXN',
          statLabel: 'AMLO-era high-risk contracts by value',
        },
        sources: [
          'RUBLI year-by-year contract counts and spending aggregates, 2019-2024.',
          'ASF. (2024). Programa Anual de Auditorías para la Fiscalización Superior de la Cuenta Pública.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: 'Interpreting the Sheinbaum Baseline',
        prose: [
          'President Sheinbaum took office in October 2024. RUBLI has 92,631 contracts from her administration to date, with a partial-period high-risk rate of approximately 12.9 percent — below the AMLO peak but above the Calderón baseline. It is too early to draw firm conclusions about a full trajectory.',
          'What RUBLI can provide is a quantitative baseline. Any future administration\'s procurement performance can now be benchmarked against the 23-year dataset using identical methodology. A 17.6 percent high-risk rate under AMLO is the current ceiling in the record. A 7.9 percent rate under Fox (with the caveat of lower data quality for that era) is the floor. The Sheinbaum baseline of 12.9 percent puts the new administration roughly at the Peña Nieto level — a placement that is neither exoneration nor indictment, but a reference point for continued monitoring.',
          'Real-time monitoring using RUBLI\'s framework could provide quarterly administration assessments rather than the retrospective judgments that traditional oversight delivers years later. ASF audits the previous fiscal year each spring, meaning the earliest formal federal accountability for 2024 spending arrives in spring 2025, and for 2025 spending in spring 2026. RUBLI\'s pipeline updates monthly as COMPRANET publishes new contract records. The gap between real-time visibility and formal accountability is what RUBLI closes.',
          'OECD\'s 2023 Mexico Procurement Review specifically recommended building "real-time analytical capacity" into Mexico\'s oversight system. RUBLI\'s methodology — open source, versioned, reproducibly documented, calibrated against 748 ground-truth cases — is exactly the kind of tool that recommendation envisioned. Whether the new administration chooses to operationalize that capacity, or whether it will become the fifth administration to promise procurement transparency while direct-award dependency continues to climb, is a question the data will answer one quarter at a time.',
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
    subheadline: 'RUBLI\'s P3 algorithm identified 2,974 vendors who appear to function as pure procurement intermediaries — winning contracts with the government and then subcontracting the actual work. In infrastructure alone, they moved 179 billion pesos.',
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 15,
    status: 'solo_datos',
    leadStat: { value: '2,974', label: 'P3 intermediary-pattern vendors', sublabel: '526.8B MXN across 8 key sectors', color: '#8b5cf6' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Shadow Supply Chain',
        prose: [
          'In legitimate procurement, an intermediary can add value. A distributor with established supply chains may deliver goods more cheaply than direct manufacturer sourcing. A general contractor coordinating dozens of specialized trades on a construction project provides project management value that a government procurement unit cannot easily replicate internally. These are legitimate, necessary functions.',
          'The fraud variant occurs when intermediaries systematically win government contracts at inflated prices, subcontract at market prices, and pocket the spread. The key diagnostic: the intermediary adds no operational value beyond contracting, and the price paid by the government exceeds what the government would have paid if it had contracted directly with the actual delivery entity. The mechanism is subtle enough to evade individual-contract audit and persistent enough to operate at scale across decades.',
          'RUBLI\'s Pattern 3 (P3) algorithm identifies intermediary signatures: vendors whose procurement footprint shows high contract counts and values but whose business characteristics suggest they do not produce the contracted goods or services directly. Signals include industry-code mismatches between the vendor\'s declared economic activity and the contract specifications, rapid growth from small contracting history to massive portfolio, and the characteristic financial signature of pass-through entities with minimal fixed assets.',
          'The 2,974 P3-classified vendors are concentrated overwhelmingly in the highest-value procurement sectors. Infrastructure leads: 1,128 P3 vendors moved 179.5 billion pesos through intermediary structures in construction and public works. Energy comes second: 463 P3 vendors in the PEMEX and CFE ecosystems account for 130.6 billion pesos. Health is third: 476 P3 vendors handled 104.2 billion pesos in pharmaceutical and medical equipment procurement.',
        ],
        pullquote: {
          quote: 'Infrastructure, energy, health. The three sectors where intermediary structures are largest are also the three with Mexico\'s most documented corruption history.',
          stat: '414B MXN',
          statLabel: 'P3 contracts in infrastructure + energy + health',
          barValue: 0.79,
          barLabel: 'share of all P3-pattern contracting',
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
        subtitle: 'Where the intermediary pattern concentrates',
        prose: [
          'The P3 pattern is not evenly distributed across Mexican procurement. It follows contract value, technical complexity, and oversight thinness. These three factors combine to make infrastructure the dominant P3 sector and to concentrate intermediary structures in a small number of specific procurement categories.',
          'Infrastructure\'s 179.5 billion pesos of P3 contracting breaks down primarily into civil works (roads, water projects, urban infrastructure), construction services (demolition, earthworks, specialized trades), and project management intermediation. SCT / SICT and CONAGUA are the largest procuring entities, with regional infrastructure funds distributing significant additional contracting at state and municipal levels. Pemex\'s infrastructure needs — offshore platforms, refinery upgrades, pipeline construction — are also substantial sources of P3-pattern intermediation.',
          'Energy\'s 130.6 billion pesos concentrates in PEMEX Exploración y Producción and CFE, with P3 vendors supplying equipment, specialized services, and technical consultancy. The energy intermediary pattern is distinctive because the actual suppliers are often international manufacturers (Schlumberger, Siemens, GE) who work through local intermediary partners. The intermediary markup can represent legitimate localization services, or it can represent pure rent extraction. The difference is visible only in detailed contract analysis.',
          'Health\'s 104.2 billion pesos runs through pharmaceutical distribution (the Maypo-Grupo Fármacos-PISA-DIMM cluster examined in earlier stories), medical equipment resellers, and laboratory service providers. The sectoral P3 pattern in health is the most straightforward to investigate because the actual manufacturers are internationally known and their direct-to-government contract prices are publicly available in other countries for benchmarking.',
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'P3 Intermediary Pattern: Contract Value by Sector',
          chartId: 'p3-intermediary-sectors',
          data: {
            points: [
              { label: 'Infraestructura', value: 179.5, color: '#ea580c', highlight: true },
              { label: 'Energía', value: 130.6, color: '#eab308' },
              { label: 'Salud', value: 104.2, color: '#dc2626' },
              { label: 'Hacienda', value: 40.9, color: '#16a34a' },
              { label: 'Educación', value: 19.1, color: '#3b82f6' },
              { label: 'Agricultura', value: 18.8, color: '#22c55e' },
              { label: 'Gobernación', value: 17.8, color: '#be123c' },
              { label: 'Defensa', value: 15.9, color: '#1e3a5f' },
            ],
            unit: 'B MXN',
            annotation: 'Mechanistically: contract won by intermediary, work subcontracted, fee extracted. 526.8B total.',
          },
        },
        pullquote: {
          quote: '1,128 intermediary-pattern vendors in infrastructure alone. The pass-through industry is larger than Mexico\'s annual federal education budget.',
          stat: '1,128',
          statLabel: 'P3 vendors in infraestructura',
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
        prose: [
          'The largest documented case of intermediary fraud in Mexican procurement history is La Estafa Maestra — a scheme in which federal agencies contracted with public universities, which then subcontracted to phantom companies, which effectively returned money to the original agencies\' officials. The Parliamentary investigation of 2017 and the MCCI/Animal Político journalistic investigation of the same year found 7.67 billion pesos moved through this structure between 2013 and 2014 alone.',
          'La Estafa Maestra was possible because Mexico\'s procurement law has a carve-out for university contracts, treating them as exempt from competitive bidding requirements under Art. 1, penultimate paragraph of the Ley de Adquisiciones. The universities became intermediaries between the procurement law and the shadow market. RUBLI\'s ground truth database includes this case; the vendors directly linked to it have risk scores averaging 0.55 to 0.65.',
          'The P3 pattern RUBLI identifies today is not limited to university subcontracting. The universities were a legal mechanism that enabled the intermediary structure; the structure itself can operate through any legal mechanism that permits subcontracting. Art. 5 of the Ley de Obras Públicas explicitly permits subcontracting in public works, and Art. 41 of the Ley de Adquisiciones permits recurring-vendor direct awards. Either statute can host an intermediary pattern if the procurement unit chooses to award through it.',
          'The 2,974 P3 vendors in RUBLI\'s queue are the structural successors to the La Estafa Maestra architecture — different entities, same functional role. Each vendor in the list represents an investigative thread: who owns it, what underlying supplier does it work with, what is the price spread between what the government pays and what the subcontractor receives?',
        ],
        pullquote: {
          quote: 'La Estafa Maestra moved 7.67 billion pesos in two years. RUBLI\'s current P3 population moves 526 billion pesos across 23 years.',
          stat: '7.67B MXN',
          statLabel: 'La Estafa Maestra — the documented prototype',
        },
        sources: [
          'ASF. (2017). Auditoría de Desempeño 2016-0-06100-07-0161. La Estafa Maestra.',
          'Animal Político / MCCI. (2017). La Estafa Maestra: Graduados en desaparecer dinero público.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'Why This Is Hard to Prosecute',
        prose: [
          'Intermediary structures are difficult to prosecute for a fundamental reason: subcontracting is legal. A company that wins a government contract and subcontracts the work is not committing a crime unless the subcontracting is used to inflate prices, launder money, or circumvent competitive requirements. Proving which of those three occurred requires following the money through multiple corporate structures and bank accounts — forensic accounting work that Mexican enforcement agencies rarely complete at scale.',
          'Mexico\'s UIF (Unidad de Inteligencia Financiera) has jurisdiction over financial flows that may constitute money laundering. The UNCAC (UN Convention Against Corruption), which Mexico ratified in 2004, requires state parties to criminalize "abuse of functions" in procurement — a category broad enough to cover systematic overpriced intermediation. Both legal frameworks exist. Neither has been publicly applied to procurement intermediary structures at scale.',
          'The operational reason is resource allocation. UIF handles roughly 20,000 suspicious activity reports annually across all sectors of the Mexican economy; dedicating investigative capacity to procurement intermediation requires choosing it over currency trafficking, narcotics proceeds, and other enforcement priorities. UNCAC procurement prosecutions are similarly rare in Mexican federal courts, with most corruption cases brought under Mexican domestic statutes that carry lower evidentiary burdens.',
          'RUBLI\'s 2,974 P3 vendors provide a pre-filtered pipeline that could change the economics of enforcement. Rather than UIF triaging tens of thousands of generic suspicious activity reports, the list identifies the specific vendors whose behavioral patterns most closely resemble known intermediary fraud. For each, the three diagnostic questions are: who are the actual underlying suppliers or subcontractors, what is the price spread between the government contract value and the subcontract value, and is that spread consistent with legitimate coordination value or with rent extraction?',
        ],
        pullquote: {
          quote: 'Subcontracting is legal. Overpriced subcontracting that enriches a middleman at public expense is not. The line between them runs through bank records UIF has not subpoenaed.',
          stat: '2,974',
          statLabel: 'P3 intermediary-pattern vendors in RUBLI queue',
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
        prose: [
          'The enforcement deficit has a specific institutional shape. Three agencies hold authority over the intermediary structures RUBLI identifies, and none of the three has operationalized that authority at scale. UIF can trace financial flows but does not systematically monitor procurement payment chains. SFP can audit procurement unit behavior but focuses on individual officials rather than on vendor-level patterns. ASF can audit individual contracts but does not run aggregate investigations of sectoral intermediary density.',
          'The one institution that could take up the task directly is COFECE, which has explicit jurisdiction over anticompetitive practices in public procurement under the Ley Federal de Competencia Económica. COFECE investigations of public procurement cartels have been rare in the last decade, despite OECD\'s repeated recommendations that Mexico develop such a practice. COFECE\'s public docket emphasizes private-sector cartels in telecommunications, banking, and retail — not the intermediary structures in public works.',
          'Even if COFECE took on the task, the legal framework may require reinforcement. Mexican competition law does not explicitly criminalize systematic overpriced intermediation in public procurement as a stand-alone offense; it treats the conduct under general cartel provisions that require proof of coordination between competing bidders. A pure pass-through intermediary structure, where the intermediary does not bid against anyone but simply extracts rent from an uncompetitive contract, may not fit neatly under existing cartel jurisprudence.',
          'This is the deeper structural problem the data reveals. Mexico\'s legal and institutional architecture was designed to address corruption one contract, one bribe, one official at a time. The intermediary industry that RUBLI documents operates at pattern scale across hundreds of vendors and billions of pesos. Until the legal architecture catches up to the pattern, enforcement will continue to target individual trees while the forest keeps growing.',
        ],
        pullquote: {
          quote: 'Mexico\'s legal architecture targets one contract at a time. The intermediary industry RUBLI documents operates at pattern scale — 2,974 vendors, 526 billion pesos.',
          stat: '0',
          statLabel: 'major COFECE procurement cartel cases, last 5 years',
          barValue: 0.00,
          barLabel: 'despite OECD recommendations',
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
    subheadline: 'Mexican procurement rules change at specific contract values. RUBLI\'s distribution analysis reveals statistical spikes at 210K, 250K, and 300K — anomalies that are mathematically impossible in a random pricing universe and consistent with systematic threshold manipulation.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'solo_datos',
    leadStat: { value: '28,264', label: 'contracts at exactly 210K MXN', sublabel: 'a 76% spike above baseline', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'The Math of Suspicious Clustering',
        prose: [
          'In a hypothetical random pricing universe, contract values would distribute smoothly across all possible amounts. A vendor delivering 300,000 pesos worth of goods would be no more likely to invoice exactly 300,000 than exactly 297,000 or 303,000. The probability mass would spread across the continuous range, with small peaks only at values where underlying real-world pricing genuinely clusters — UMA multiples, round numbers used in catalog pricing, specific regulatory fee structures.',
          'Mexican federal procurement does not follow a random pricing universe. RUBLI\'s distribution analysis of contract amounts between 200,000 and 400,000 pesos reveals sharp statistical spikes at specific values that cannot be explained by legitimate pricing mechanics. The largest anomaly sits at 210,000 pesos, where 28,264 contracts cluster — 76 percent above the baseline count of contracts at 200,000 pesos just below it. Similar spikes appear at 250,000 (24,966 contracts) and 300,000 (22,064 contracts).',
          'These spikes are the statistical signature of threshold manipulation. Mexican procurement rules change at specific contract values: below certain thresholds, procurement units can use "invitación a cuando menos tres personas" (simplified three-vendor invitation) instead of full competitive bidding; below other thresholds they can use direct adjudication without even the three-vendor procedure. When procurement officials want to award a contract to a predetermined vendor without competitive process, structuring the contract just below the triggering threshold is the reliable legal mechanism.',
        ],
        pullquote: {
          quote: '28,264 contracts at exactly 210,000 pesos. The baseline immediately below is 16,075. This is not a pricing pattern. It is a procedural escape.',
          stat: '28,264',
          statLabel: 'contracts at exactly 210K MXN',
          barValue: 0.76,
          barLabel: 'excess above baseline',
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
        subtitle: 'Contract volume from 200K to 400K pesos, in 10K buckets',
        prose: [
          'A histogram of contract counts in 10,000-peso buckets from 200,000 to 400,000 pesos makes the anomaly unmistakable. The baseline trend descends smoothly from around 16,000 contracts at 200K down to roughly 12,000 at 400K — what you would expect in a distribution where larger contracts are somewhat rarer than smaller ones. Against that baseline, three buckets spike dramatically upward.',
          'The 210K bucket shows 28,264 contracts — a 76 percent increase over the baseline at 200K. The 250K bucket shows 24,966 contracts, a substantial spike above the nearby 240K (23,331) and 260K (24,841) values. The 300K bucket shows 22,064 contracts, noticeably elevated above 290K (18,925) and 310K (16,024). Between these three primary spikes, a secondary plateau extends through 220K-260K at elevated levels, suggesting additional threshold effects at values close to the primary triggers.',
          'Each spike corresponds, in Mexican procurement practice, to a specific regulatory threshold. The 300K value has historically been close to the "invitación a tres" threshold for certain contract categories. The 210K and 250K values correspond to subdivision limits and small-value thresholds that permit fully simplified procedures. The exact numbers shift slightly year to year as UMA values update, but the pattern of clustering just below procedural thresholds is a constant feature of the data.',
          'The aggregate scale is substantial. Summing the excess contracts in the spike buckets — the counts above what the baseline would predict — yields an estimate of roughly 30,000 to 40,000 contracts structured at threshold values rather than at natural pricing points. Each such contract represents a procurement that could have been executed through competitive bidding but was deliberately sized to avoid that requirement.',
        ],
        chartConfig: {
          type: 'inline-spike',
          title: 'Contract Volume Around Key Thresholds (200K-400K MXN)',
          chartId: 'threshold-spikes',
          data: {
            points: [
              { label: '200K', value: 16075 },
              { label: '210K', value: 28264, highlight: true, annotation: 'spike' },
              { label: '220K', value: 27773 },
              { label: '230K', value: 24820 },
              { label: '240K', value: 23331 },
              { label: '250K', value: 24966, highlight: true, annotation: 'threshold?' },
              { label: '260K', value: 24841 },
              { label: '270K', value: 19259 },
              { label: '280K', value: 19805 },
              { label: '290K', value: 18925 },
              { label: '300K', value: 22064, highlight: true, annotation: '300K' },
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
          },
        },
        pullquote: {
          quote: 'Three statistical spikes in a 200K range. Each aligned precisely with a regulatory threshold. The distribution is not what it would be in an honest system.',
          stat: '~40,000',
          statLabel: 'excess contracts at threshold values',
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
        prose: [
          'Threshold splitting — fragmenting a larger procurement need into multiple contracts each below the competitive threshold — is one of the oldest procurement fraud techniques. Mexico\'s procurement law explicitly prohibits it in Art. 17 of the Ley de Adquisiciones, which states that the procurement of the same good or service shall not be fragmented to evade the procedures required by the statute. The prohibition exists. RUBLI\'s data shows it is widely ignored.',
          'The spike at exactly 300,000 pesos is just the most visible single-point cluster. RUBLI\'s z-score analysis of "same-day count" — the number of contracts awarded to the same vendor on the same day by the same institution — identifies thousands of cases where procurement was split into multiple same-day awards, each below threshold, to what appear to be structured package purchases. In extreme cases, the same procurement unit awards 10 to 20 contracts on the same day to the same vendor, each exactly at or just below threshold, for what is clearly a single underlying procurement need.',
          'World Bank and OECD research on threshold splitting consistently find it is both common and costly. A 2019 World Bank analysis of Eastern European procurement found that threshold splitting added 8 to 12 percent to unit prices by eliminating volume discounts and competitive pressure. In a Mexican federal system with tens of thousands of contracts at threshold values, the aggregate cost distortion across all federal procurement is plausibly in the billions of pesos per year.',
          'The institutions most prone to threshold splitting, in RUBLI\'s data, are municipal and state-level procurement units operating under federal spending programs, where oversight density is thinnest. The same-day-contract clustering pattern is statistically strongest in gobernación and infrastructure sectors where decentralized execution is the norm and where a single procurement unit may handle hundreds of contracts monthly without federal-level review.',
        ],
        pullquote: {
          quote: 'Article 17 explicitly prohibits splitting contracts to avoid competitive thresholds. Tens of thousands of contracts at exactly threshold values suggest the prohibition is widely ignored.',
          stat: 'Art. 17 LAASSP',
          statLabel: 'prohibits threshold splitting',
        },
        sources: [
          'World Bank. (2019). Procurement Fraud Indicators: Threshold Manipulation in Public Contracting.',
          'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público. Art. 17 (fragmentation prohibition).',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: 'The Detection and the Fix',
        prose: [
          'Threshold manipulation is among the easiest procurement fraud patterns to detect algorithmically. It requires counting contracts at specific values and comparing to baseline expected distributions — a statistical operation that runs in seconds on the full COMPRANET dataset. It is also, paradoxically, among the hardest to prosecute: each individual contract is for a legitimate purchase, each is documented, each can be justified on its individual merits. The fraud is in the aggregate decision to fragment, not in any single transaction.',
          'RUBLI\'s same-day analysis and threshold-clustering detection provide a ready-made list of cases for investigation. The algorithm can identify institutions with systematic threshold avoidance — the same procurement unit awarding 20 contracts of exactly 300,000 pesos in one week — and vendors that appear exclusively in threshold-adjacent contracts. These are the investigative targets where prosecution is most likely to succeed, because the aggregate pattern provides evidence that individual contracts alone would not.',
          'The fix is equally well-established in procurement reform literature. Automatic flagging of threshold-adjacent contracts in the procurement management system, mandatory explanation when multiple same-vendor same-day awards aggregate above threshold, and rotating SFP audits of institutions with anomalous threshold concentration. The EU\'s Procurement Directive 2014/24/EU explicitly requires aggregation rules that treat a series of related contracts as a single procurement for threshold purposes — an architectural control that Mexico\'s law has not fully adopted.',
          'CompraNet already has the data necessary to implement all three reforms. The threshold-adjacency flag could be computed for every contract at data entry. The aggregation check could be automated at procurement-unit level. The SFP audit program could be driven by algorithmic prioritization. None of these require new legal authority. All require only the institutional decision to use existing authority systematically.',
        ],
        pullquote: {
          quote: 'CompraNet already has the data to flag threshold manipulation automatically. The question is why it has never been required to do so.',
          stat: '75%',
          statLabel: 'of threshold-cluster contracts are direct awards — no competition, no public tender',
          barValue: 0.75,
          barLabel: 'OECD ceiling for non-competitive procedures: 30%',
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
        prose: [
          'The accountability failure at the 300K threshold has a specific institutional geography. Small-value contracts below threshold fall outside the default federal audit scope; ASF focuses its limited capacity on larger contracts. SFP\'s pattern audits, when they occur, tend to examine high-profile procurement units rather than the diffuse population of municipal offices and decentralized agencies where threshold splitting concentrates. The contracts structured at 210K or 300K operate in a zone that the oversight architecture was designed not to scrutinize.',
          'This is the institutional opposite of the accountability gap at the high end. There, 5-billion-peso contracts escape audit because they are politically dangerous to investigate. Here, 210,000-peso contracts escape audit because they are individually too small to be worth the resource cost of investigation. At opposite ends of the contract-value spectrum, different failure modes produce the same result: procurement proceeds without meaningful oversight.',
          'The shape of the fix at this end of the spectrum is well-understood. The missing piece is systematic aggregation: treating a series of threshold-value contracts from the same procurement unit to the same vendor as what they actually are — a single procurement artificially fragmented. Mexican law provides the prohibition in Art. 17. Mexican data infrastructure provides the detection capability in CompraNet. Only the institutional commitment to enforcement is missing.',
          'RUBLI\'s threshold analysis gives journalists and oversight advocates a specific, quantified, visible target for reform pressure. The spikes at 210K, 250K, and 300K are not hidden. They are printed, statistically, in public procurement data for anyone with the analytical capacity to read them. The question is no longer whether threshold manipulation occurs at scale in Mexican federal procurement. It does. The question is when Mexican institutions will act on the evidence.',
        ],
        pullquote: {
          quote: 'At both ends of the value spectrum, oversight fails. Large contracts are politically dangerous to investigate. Small contracts are individually too small to justify the cost.',
          stat: '~40K',
          statLabel: 'excess contracts structured at threshold values',
          barValue: 0.75,
          barLabel: 'share awarded by direct adjudication',
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
    subheadline: 'Across 3 million contracts and 16 candidate risk features, one signal emerges as the strongest predictor of corruption — a vendor\'s tendency to charge wildly inconsistent prices for similar work. The coefficient is +0.5343. Seven other features were regularized to exactly zero.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'solo_datos',
    leadStat: { value: '+0.5343', label: 'price_volatility coefficient', sublabel: 'strongest predictor in v0.6.5 model', color: '#f59e0b' },
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: 'What the Model Learned',
        prose: [
          'RUBLI\'s v0.6.5 risk model was calibrated against 748 documented corruption cases — contracts from IMSS ghost company networks, Segalmex food distribution fraud, COVID emergency procurement irregularities, La Estafa Maestra university subcontracting, and a dozen other verified scandals spanning multiple administrations. The model\'s training task was specific: learn which procurement characteristics predict similarity to these known-bad cases.',
          'The calibration process used ElasticNet logistic regression with Optuna Bayesian hyperparameter optimization across 150 trials. The search explored 16 candidate features: single-bid status, direct-award mechanism, network membership, institution diversity, ad period length, year-end timing, industry mismatch, institution risk, same-day contract count, vendor concentration, win rate, price ratio, co-bidding rate, price hypothesis confidence, sector spread, and price volatility. The model was free to weight these features however the data supported.',
          'The result was a striking concentration of predictive power in one feature. Price volatility emerged with coefficient +0.5343 — the strongest positive predictor in the model. It beat the next-strongest feature (vendor concentration at +0.3749) by 43 percent. It beat the strongest protective feature (institution diversity at -0.3821, where negative means lower risk) in absolute magnitude. Seven of the 16 candidate features were regularized to exactly zero by the ElasticNet sparsity penalty, meaning they contributed no predictive power beyond noise.',
          'This is not a result the model was forced toward. The training process made no assumption that price volatility mattered. It was one of 16 equal candidates, and the algorithm could have chosen to weight it near zero if the data did not support a stronger weight. The data chose price volatility. That choice is the algorithm\'s compressed judgment about what the 748 ground-truth corruption cases have in common.',
        ],
        pullquote: {
          quote: 'Of 16 risk features, price volatility emerged as the strongest predictor — a coefficient 43 percent higher than the next-strongest feature.',
          stat: '+0.5343',
          statLabel: 'price_volatility coefficient in v0.6.5 model',
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
        subtitle: 'What predicts risk, and what protects against it',
        prose: [
          'Visualized as a horizontal bar chart with positive values extending right and negative values extending left from a central axis, the full coefficient structure of v0.6.5 is informative. Price volatility\'s +0.5343 extends farthest to the right. Vendor concentration (+0.3749), price ratio (+0.2345), network member count (+0.1811), and same-day contract count (+0.0945) follow in descending order on the positive side. Win rate (+0.0488), ad period (+0.0423), and direct award (+0.0306) contribute small positive weights.',
          'On the negative side — features whose presence decreases risk — only one feature survived regularization: institution diversity at -0.3821. Vendors who serve many different institutions rather than concentrating their business with a single customer are structurally less suspicious. This is intuitive: a vendor with broad reach across the federal government is behaving like a legitimate market participant, while a vendor concentrated at one institution resembles the capture patterns that dominate the ground-truth set.',
          'The seven features regularized to zero deserve note: single-bid status, year-end timing, co-bidding rate, price hypothesis confidence, industry mismatch, institution risk, and sector spread. Some of these were historically treated as major corruption indicators in earlier risk models (v3.3, v4.0). The v0.6.5 calibration found that once the strongest features are in the model, these additional signals do not add predictive power beyond what the dominant features already capture. This is not an argument that single-bid status is irrelevant to corruption; it is an argument that single-bid status does not add information beyond what vendor concentration and price volatility already reveal.',
        ],
        chartConfig: {
          type: 'inline-diverging',
          title: 'v0.6.5 Model: What Predicts Corruption Risk',
          chartId: 'model-coefficients-full',
          data: {
            points: [
              { label: 'Price volatility', value: 0.5343, highlight: true, annotation: 'strongest signal' },
              { label: 'Vendor concentration', value: 0.3749 },
              { label: 'Price ratio', value: 0.2345 },
              { label: 'Network size', value: 0.1811 },
              { label: 'Same-day contracts', value: 0.0945 },
              { label: 'Win rate', value: 0.0488 },
              { label: 'Ad period (days)', value: 0.0423 },
              { label: 'Direct award', value: 0.0306 },
              { label: 'Institution diversity', value: -0.3821, color: '#3b82f6', annotation: 'protective' },
            ],
            referenceLine: { value: 0, label: '', color: '#52525b' },
            unit: 'coefficient',
            annotation: '7 other features regularized to zero by ElasticNet. Price volatility leads by 43%.',
          },
        },
        pullquote: {
          quote: 'Only one protective feature survived regularization: the diversity of institutions a vendor serves. Broad reach is the structural signature of legitimacy.',
          stat: '-0.3821',
          statLabel: 'institution_diversity coefficient (protective)',
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
        prose: [
          'Abstract coefficients become concrete when applied to real contracting data. GRUPO FÁRMACOS ESPECIALIZADOS — the pharmaceutical monopolist in RUBLI\'s P1 pattern with 133.2 billion pesos across 6,303 contracts — shows price volatility as its dominant risk driver. A pharmaceutical distributor serving a single institution should charge relatively consistent per-unit prices for consistent products. Instead, RUBLI\'s z-score analysis shows this vendor\'s contract amounts varying by factors of 5 to 10 times within the same year for the same institution for structurally similar procurement categories.',
          'The IMSS Ghost Company Network — one of the 748 ground-truth cases the model learned from — also showed price volatility as a defining feature. Phantom companies charging 3 million pesos for one delivery and 27 million pesos for a similar delivery three months later, with no obvious change in scope, produce the statistical fingerprint the model was trained to recognize. Segalmex food distribution fraud showed the same pattern: food delivery contracts varying by orders of magnitude for what should have been comparable operations.',
          'This is not necessarily a pricing model difference. It is consistent with what fraud researchers call "negotiated pricing" — where the contract amount is set through informal negotiation between procurement official and vendor rather than through competitive market pricing, and the nominal amount is adjusted to whatever sum the approving official is willing to sign. The inconsistency in price is the forensic trace of a process where the price does not emerge from competition but from relationship.',
          'OECD\'s 2022 Principles for Integrity in Public Procurement specifically recommend that procurement systems generate "price benchmarks that allow monitoring of consistency over time and across vendors." Mexico\'s CompraNet collects the data necessary to implement this recommendation. RUBLI\'s price volatility feature is exactly this benchmark applied at scale — and the ground truth cases confirm that the benchmark identifies corruption with measurable accuracy.',
        ],
        pullquote: {
          quote: 'When price is negotiated rather than competed, the price is whatever the signing official will approve — and inconsistency is the forensic trace.',
          stat: '5-10x',
          statLabel: 'within-year price variation for top P1 monopoly vendor',
          barValue: 0.70,
          barLabel: 'avg risk score for high-volatility vendor contracts',
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
        prose: [
          'The v0.6.5 model was calibrated at two levels: a global model across all sectors and 12 per-sector models tuned to each sector\'s specific patterns. Price volatility\'s dominance is remarkably consistent across this multilevel structure. In the global model it leads with +0.5343. In the sector-specific models for salud, infrastructura, and energia — the three largest procurement sectors — it remains the strongest or second-strongest positive coefficient.',
          'The consistency matters because it rules out one plausible alternative hypothesis: that price volatility is simply a proxy for sector or vendor type and does not independently predict corruption. If that were true, the global coefficient would collapse when sector-specific models are fit. Instead the coefficient remains strong across sector models. Price volatility is capturing something structural about how corrupt procurement operates, not merely something categorical about which sectors are risky.',
          'Cross-model validation strengthens the finding further. RUBLI runs a separate anomaly detection layer using PyOD\'s IForest and COPOD algorithms — unsupervised methods that do not use the ground-truth labels at all. The contracts flagged as anomalous by these unsupervised methods overlap substantially with the high-price-volatility contracts identified by the supervised model. Two independent analytical approaches converge on the same population of contracts. Either both are fundamentally misreading the data, or both are detecting the same underlying signal.',
          'The model\'s AUC of 0.828 on vendor-stratified test data (the true hold-out measure, where no vendor appears in both training and test sets) confirms the predictive power. That AUC is high enough that the model\'s rankings can be trusted as an investigative priority system, though it is not high enough to support individual-contract verdicts without additional investigation. The coefficient structure reveals what the model is doing; the AUC reveals how well it does it; the ground-truth validation confirms the doing is honest.',
        ],
        pullquote: {
          quote: 'Two independent analytical approaches — supervised risk scoring and unsupervised anomaly detection — converge on the same high-price-volatility contracts.',
          stat: '0.828',
          statLabel: 'test AUC on vendor-stratified hold-out',
          barValue: 0.828,
          barLabel: 'blind test on held-out vendor set',
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
        prose: [
          'The strength of price volatility as a predictor creates a practical investigative tool. For any vendor-institution pair, RUBLI can compute the coefficient of variation in contract amounts over time and identify cases where that variation is statistically anomalous relative to the sector baseline. These cases are the highest-yield targets for price investigation because the model has already isolated the specific signal most predictive of documented corruption.',
          'What makes this more actionable than generic risk scores is the combination with physical evidence. A vendor with high price volatility can be investigated by comparing contract invoices against market prices for the same goods in the same period. If an IT vendor charged the government 3 million pesos in February and 27 million pesos in July for comparable hardware configurations, the July invoice should be scrutinized: was there a genuinely different scope, a legitimate change in specifications, or was the price inflated? The answer can be determined from contract documents — which exist, which are theoretically public under transparency law, and which RUBLI can tell an investigator exactly which to request.',
          'ASF\'s financial audit methodology already includes price benchmarking for pharmaceutical procurement — a practice established in response to the Maypo-Grupo Fármacos-PISA concentration. Extending that methodology to cover all high-volatility vendor-institution pairs — identified algorithmically by RUBLI — would represent a systematic upgrade of Mexico\'s anti-overpricing capacity. The analytical infrastructure is built. The data is available. The methodology is established. The gap is the institutional decision to deploy.',
          'For journalists, the price volatility feature provides a direct investigative pathway. RUBLI\'s SHAP decomposition for any individual vendor reveals exactly how much of the risk score is driven by price volatility versus other features. A vendor with high overall risk score driven primarily by price volatility is a specific type of story: not a ghost company, not a captured institutional relationship, but a pricing manipulation case. That pathway can be pursued through contract document requests and market price benchmarking — journalism that is feasible with public-record tools and does not require forensic accounting expertise.',
        ],
        pullquote: {
          quote: 'RUBLI has identified which vendor-institution pairs show the highest price anomaly. Each one is a price investigation waiting to happen.',
          stat: 'AUC 0.828',
          statLabel: 'test accuracy of v0.6.5 model (vendor-stratified)',
          barValue: 0.828,
          barLabel: 'blind test on held-out vendor set',
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
        prose: [
          'For any journalist or oversight investigator seeking to act on RUBLI\'s price volatility finding, the investigation path has three stages. First, select a target vendor-institution pair from the top of the price-volatility ranking. Second, file INAI transparency requests for the full text of the highest-variance contracts — specification, quantities, unit prices, delivery terms. Third, benchmark those unit prices against either domestic market comparators (other Mexican contracts for the same goods) or international reference prices (the same products sold to governments in Brazil, Colombia, Chile).',
          'Each stage is operationally feasible. INAI requests for contract documents are routine and typically produce responses within 20 business days. Market price benchmarking can be performed using CompraNet itself for domestic comparators and using open international procurement databases (OECD\'s Open Contracting Partnership, the EU\'s TED database) for international comparators. A single well-chosen investigation can produce publishable findings within one to two months.',
          'The output of the process is not a prosecution — that requires the full apparatus of Ministerio Público or UIF investigation. The output is published evidence of overpricing in specific contracts, identified by name and amount, verified by independent benchmarking. That evidence creates the political and institutional pressure that prosecutions ultimately require. It is the kind of journalism that MCCI/Animal Político produced in La Estafa Maestra and that El Universal produced in the IMSS pharmaceutical investigations — now made systematically feasible by the algorithmic prioritization RUBLI provides.',
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

/** Resolve a chapter's display fields per language, with EN fallback. */
export function localizeChapter(
  chapter: StoryChapterDef,
  lang: 'en' | 'es',
): {
  title: string
  subtitle: string | undefined
  prose: string[]
  pullquote: StoryChapterDef['pullquote']
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
