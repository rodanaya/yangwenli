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
    /** Optional explicit pull-quote role (else auto-derived from chapter variant). */
    role?: 'ledger' | 'plate' | 'margin' | 'verdict'
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
  /** Optional delta callout (e.g. "+37.1pp vs Calderón"). ThresholdDistribution
   *  renders this below the dot for the point that supplies it — used to bake
   *  the climb/gap into the chart instead of leaving it in the prose. */
  delta?: string
  /** Optional Spanish translation of `delta`. */
  delta_es?: string
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
   *  starting at value2 (baseline) and extending to the gap.
   *  InlineBarChart-only: 'dominance' draws the FT-bullet single-band path
   *  (one anchor share vs an OECD reference rule + a stacked minor register). */
  mode?: 'pair' | 'excess' | 'dominance'
  /** InlineBarChart/InlineRoster (dominance + roster): a small archival
   *  provenance stamp rendered in the ChartCard chrome (e.g. recovery date). */
  stamp?: { en: string; es: string }
  /** ClevelandPairChart-only (default mode): how to format the right-column
   *  readout. 'signed' (default) shows the raw value-minus-value2 gap with
   *  a + prefix for positives. 'ratio' shows (value / value2) as a
   *  percentage — used when value is a subset of value2 (e.g. single-bid
   *  wins out of total wins) and the gap is always negative + meaningless. */
  gapFormat?: 'signed' | 'ratio'
  /** InlineLineChart-only: zoom the y-axis to a non-zero floor so a series
   *  that lives in a narrow band (e.g. DA rate 71–87% on a 0–90 scale) shows
   *  its variation instead of hugging the top. Default 0. */
  yMin?: number
  /** ClevelandPairChart-only (pair mode): rank rows by the value/value2 ratio
   *  descending instead of the default absolute gap — use when the editorial
   *  metric IS the share (gapFormat 'ratio'), so the most-distorted row reads
   *  at the top. Opt-in so charts ranking by magnitude are unaffected. */
  sortBy?: 'gap' | 'ratio'
  /** ClevelandPairChart ratio mode: label for the row's own 100% track (the
   *  denominator, e.g. "sector's high-risk spend"). Falls back to a generic
   *  "of the row total" when absent. */
  trackLabel?: string
  trackLabel_es?: string
  /** ThresholdDistribution-only: draw a faint ordered connector through the
   *  dots (e.g. the rising "water line" across administrations) so the
   *  trajectory reads as a single climb rather than disconnected points. */
  connectDots?: boolean
  /** ThresholdDistribution-only: a vertical "riser" bracket from the
   *  referenceLine up to the dot at `index`, captioned with the multiple
   *  (e.g. "≈6×") — makes "N times the threshold" a visible measure rather
   *  than a footer sentence. Requires `referenceLine`. */
  riser?: {
    index: number
    multipleLabel: string
    multipleLabel_es?: string
    color?: string
  }
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
  /** Optional vertical event markers (e.g. the 2020 INSABI/BIRMEX break that
   *  cut Grupo Fármacos to zero). Each draws a dashed vertical rule at the
   *  x index with a top label — baking the structural cause of a cliff into
   *  the chart instead of leaving it only in the prose. */
  eventLines?: Array<{ xIndex: number; label: string; label_es?: string; color?: string }>
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
  // === STORY 0: The Gap — recovering the procurement the government stopped publishing ===
  {
    slug: 'el-vacio',
    outlet: 'investigative',
    type: 'thematic',
    era: 'sheinbaum',
    byline: 'RUBLI Investigative Data Unit',
    status: 'solo_datos',
    estimatedMinutes: 9,
    headline: "A Government Erased Its Own Procurement Record. We Rebuilt 69,516 Contracts It Stopped Publishing.",
    headline_es: "Un gobierno borró su propio registro de compras. Reconstruimos los 69,516 contratos que dejó de publicar.",
    subheadline:
      "In a single year, Mexico dismantled the transparency apparatus it spent two decades building — and the spending never paused. By reverse-engineering the successor portal that replaced CompraNet, RUBLI rebuilt 69,516 awards that fell out of the public record. Four in five were handed out with no competition. Three in four don't disclose what they cost. Among the few we could read off the scans: a 3.15-billion-peso no-bid award to Pfizer.",
    subheadline_es:
      "En un solo año, México desmanteló el aparato de transparencia que tardó dos décadas en construir — y el gasto nunca se detuvo. Al hacer ingeniería inversa del portal que reemplazó a CompraNet, RUBLI reconstruyó 69,516 adjudicaciones que se cayeron del registro público. Cuatro de cada cinco se entregaron sin competencia. Tres de cada cuatro no revelan cuánto costaron. Entre las pocas que pudimos leer en los escaneos: una adjudicación directa de 3,150 millones de pesos a Pfizer.",
    leadStat: {
      value: '69,516',
      label: "awards the government stopped publishing",
      label_es: "adjudicaciones que el gobierno dejó de publicar",
      sublabel: "78.7% with no competition",
      sublabel_es: "78.7% sin competencia",
      color: '#b45309',
    },
    kickerStats: [
      {
        prefix: "The feed went dark, and behind it sat",
        prefix_es: "El flujo se apagó, y detrás había",
        value: '69,516',
        suffix: "awards no one could see.",
        suffix_es: "adjudicaciones que nadie podía ver.",
        tone: 'data',
      },
      {
        prefix: "Of those,",
        prefix_es: "De ellas,",
        value: '78.7%',
        suffix: "were direct awards — no bid, no competition.",
        suffix_es: "fueron adjudicación directa — sin licitación, sin competencia.",
        tone: 'critical',
      },
      {
        prefix: "And",
        prefix_es: "Y el",
        value: '76%',
        suffix: "never disclose what they cost at all.",
        suffix_es: "nunca revela cuánto costó.",
        tone: 'muted',
      },
    ],
    relatedSlugs: ['el-ejercito-fantasma', 'la-ilusion-competitiva', 'captura-institucional'],
    lensTags: {
      patterns: ['P2', 'P5'],
      sectors: ['salud'],
      years: [2025, 2026],
      terms: ['ComprasMX', 'CompraNet', 'adjudicación directa', 'transparencia', 'fantasma'],
    },
    nextSteps: [
      'File FOI requests via Transparencia para el Pueblo for the unredacted award files of the highest-value no-bid contracts — beginning with the 3.15-billion-peso Pfizer–BIRMEX award (Art. 54 fr. XII).',
      'Cross-reference every recovered vendor RFC against SAT\'s 69-B (EFOS) blacklist once the long-tail OCR completes — the shell companies hide in the small contracts, not the billion-peso tier.',
      'Investigate the cluster of companies incorporated less than three years before winning nine-figure awards (e.g. SLYCOM, incorporated December 2023, awarded ~880 million pesos).',
      'Request the written justificación de excepción for the agencies that lean hardest on discretionary sole-source grounds (Art. 54 fr. I/II/III), led by INDAABIN and BIRMEX.',
      'Audit Alimentación para el Bienestar — the single largest buyer in the gap with 12,018 procedures — against its predecessor Segalmex\'s documented fraud history.',
    ],
    nextSteps_es: [
      'Solicitar vía Transparencia para el Pueblo los expedientes de adjudicación sin testar de los contratos sin licitación de mayor valor — empezando por la adjudicación de 3,150 MDP a Pfizer–BIRMEX (Art. 54 fr. XII).',
      'Cruzar cada RFC de proveedor recuperado contra la lista 69-B (EFOS) del SAT cuando termine el OCR de la cola larga — las empresas fachada se esconden en los contratos pequeños, no en los de miles de millones.',
      'Investigar el grupo de empresas constituidas menos de tres años antes de ganar adjudicaciones de nueve cifras (p. ej. SLYCOM, constituida en diciembre de 2023, adjudicada ~880 MDP).',
      'Solicitar la justificación de excepción por escrito de las dependencias que más recurren a causales discrecionales de proveedor único (Art. 54 fr. I/II/III), encabezadas por INDAABIN y BIRMEX.',
      'Auditar a Alimentación para el Bienestar — el mayor comprador del vacío con 12,018 procedimientos — frente al historial documentado de fraude de su antecesor Segalmex.',
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: "The Year the Lights Went Out",
        title_es: "El Año en que se Apagaron las Luces",
        subtitle: "Mexico abolished CompraNet, dissolved its transparency institute, and let the public record stop",
        subtitle_es: "México abolió CompraNet, disolvió su instituto de transparencia, y dejó que el registro público se detuviera",
        prose: [
          "Mexico spent twenty years building a record of who its government pays and why. In 2025 it took that record apart. In March, the autonomous transparency institute, INAI, was dissolved. In April, CompraNet — the federal procurement system that for two decades published a yearly bulk file of vendor, amount, date, and procedure type — was legally abolished. On September 28, its feed updated for the last time and never moved again.",
          "What replaced it was not a better system but a quieter one. ComprasMX, run by the new Secretaría Anticorrupción, releases contracts the way a filing cabinet does: one folder at a time, behind a portal, with no bulk export. The big buyers — the health institutes, the welfare agencies, the armed forces — appear in fragments or not at all.",
          "The contracts didn't stop. Only the record did. The data wasn't classified or deleted; it was scattered across enough places that no one can hold the whole picture at once — which, for the public trying to follow the money, is the same as gone. Everything Mexico bought after September 28 became unknowable by design. This story is about reading it anyway.",
        ],
        prose_es: [
          "México tardó veinte años en construir un registro de a quién le paga su gobierno y por qué. En 2025 lo desarmó. En marzo, el instituto autónomo de transparencia, el INAI, fue disuelto. En abril, CompraNet — el sistema de compras federales que durante dos décadas publicó un archivo masivo anual con proveedor, monto, fecha y tipo de procedimiento — fue abolido legalmente. El 28 de septiembre, su flujo se actualizó por última vez y nunca volvió a moverse.",
          "Lo que lo reemplazó no fue un sistema mejor sino uno más silencioso. ComprasMX, operado por la nueva Secretaría Anticorrupción, libera los contratos como lo haría un archivero: una carpeta a la vez, detrás de un portal, sin exportación masiva. Los grandes compradores — los institutos de salud, las agencias de bienestar, las fuerzas armadas — aparecen en fragmentos o no aparecen.",
          "Los contratos no se detuvieron. Solo el registro. Los datos no se clasificaron ni se borraron; se dispersaron en suficientes lugares como para que nadie sostenga la imagen completa de una vez — lo que, para el público que intenta seguir el dinero, es lo mismo que si no existieran. Todo lo que México compró después del 28 de septiembre se volvió incognoscible por diseño. Esta historia trata de leerlo de todos modos.",
        ],
        pullquote: {
          quote: "The contracts didn't stop. Only the record did — scattered across enough places that no one can hold the whole picture at once.",
          quote_es: "Los contratos no se detuvieron. Solo el registro — disperso en suficientes lugares como para que nadie sostenga la imagen completa de una vez.",
          stat: 'Sep 28 2025',
          statLabel: "the date the federal procurement feed froze",
          statLabel_es: "la fecha en que se congeló el flujo de contratación federal",
        },
      },
      {
        id: 'ch2',
        number: 2,
        title: "We Read the Silence",
        title_es: "Leímos el Silencio",
        subtitle: "The successor portal guarded each request with a signature — and that signature could be reproduced",
        subtitle_es: "El portal sucesor protegía cada petición con una firma — y esa firma pudo reproducirse",
        prose: [
          "A portal that shows you one contract at a time is not the same as a portal that hides them. ComprasMX guarded every request with a cryptographic signature meant to keep automated tools out. That signature turned out to be a self-contained scheme — no human-verification gate behind it — and it could be reproduced. Once it was, the whole catalogue became queryable again, exactly as the old bulk file used to be.",
          "The recovery ran in two passes. The first enumerated every awarded procedure published after the freeze: 69,516 of them, complete with who bought what, by which method, when, and under which legal exception. The second went after the part the portal buries hardest — the winning vendor and the price — which survive only inside scanned award documents, images rather than text. Optical character recognition pulled those back off the page, one notification of award at a time.",
          "None of this is privileged. Every figure here was published by the Mexican state in 2025 and 2026 — just in a form built to defeat anyone reading it whole. Reassembled, it is the closest thing that exists to a record of what Mexico has bought since the lights went out.",
        ],
        prose_es: [
          "Un portal que te muestra un contrato a la vez no es lo mismo que un portal que los esconde. ComprasMX protegía cada petición con una firma criptográfica pensada para dejar fuera a las herramientas automatizadas. Esa firma resultó ser un esquema autocontenido — sin verificación humana detrás — y pudo reproducirse. Una vez hecho, todo el catálogo volvió a ser consultable, igual que el viejo archivo masivo.",
          "La recuperación corrió en dos etapas. La primera enumeró cada procedimiento adjudicado publicado tras el congelamiento: 69,516, con quién compró qué, por qué método, cuándo y bajo qué excepción legal. La segunda fue por lo que el portal más entierra — el proveedor ganador y el precio — que sobreviven solo dentro de documentos de adjudicación escaneados, imágenes en lugar de texto. El reconocimiento óptico de caracteres los sacó de la página, una notificación de adjudicación a la vez.",
          "Nada de esto es información privilegiada. Cada cifra aquí fue publicada por el Estado mexicano en 2025 y 2026 — solo que en una forma hecha para vencer a quien la leyera completa. Reensamblada, es lo más parecido que existe a un registro de lo que México ha comprado desde que se apagaron las luces.",
        ],
        pullquote: {
          quote: "Every figure here was published by the Mexican state — just in a form built to defeat anyone reading it whole.",
          quote_es: "Cada cifra aquí fue publicada por el Estado mexicano — solo que en una forma hecha para vencer a quien la leyera completa.",
          stat: '69,516',
          statLabel: "awards reassembled from the successor portal",
          statLabel_es: "adjudicaciones reensambladas del portal sucesor",
        },
      },
      {
        id: 'ch3',
        number: 3,
        title: "Four in Five, No Bid",
        title_es: "Cuatro de Cada Cinco, Sin Licitación",
        subtitle: "The recovered record runs on direct awards — and stays silent on what most of them cost",
        subtitle_es: "El registro recuperado funciona con adjudicación directa — y calla cuánto cuestan casi todas",
        prose: [
          "Of the 69,516 awards, 54,714 went out with no public tender and no rival bids: adjudicación directa, 78.7 percent. The OECD treats direct award as an exception that should sit in the low single digits to low tens of a percent even under emergency conditions. Four in five is not an exception regime. It is the default, and the chart below shows how lopsided it is — public tender, invitation-to-three, and framework agreements together account for barely one award in five.",
          "Then there is the silence on cost. Three of every four awards disclose no amount at all — not a final price, not even an estimate. The state records that it bought something, from someone, and declines to say for how much. About 21,000 of these awards cite the low-value threshold (Art. 55), legitimate small purchases that sit below the bidding floor. But the discretionary sole-source grounds — Art. 54, fractions I through XIV — carry the big-ticket contracts, the ones worth hundreds of millions where competition was simply waived.",
          "No rival bids to lose, no public number to be measured against: this is a procurement system running in the dark, by design.",
        ],
        prose_es: [
          "De las 69,516 adjudicaciones, 54,714 salieron sin licitación pública y sin ofertas rivales: adjudicación directa, 78.7 por ciento. La OCDE trata la adjudicación directa como una excepción que debería ubicarse en cifras bajas de un dígito a decenas bajas de por ciento, incluso en condiciones de emergencia. Cuatro de cada cinco no es un régimen de excepción. Es la regla, y la gráfica de abajo muestra qué tan desbalanceado está — licitación pública, invitación a tres y acuerdos marco juntos apenas suman una de cada cinco adjudicaciones.",
          "Luego está el silencio sobre el costo. Tres de cada cuatro adjudicaciones no revelan monto alguno — ni precio final, ni siquiera un estimado. El Estado registra que compró algo, a alguien, y se niega a decir por cuánto. Unas 21,000 de estas adjudicaciones citan el umbral de bajo monto (Art. 55), compras pequeñas legítimas que están por debajo del piso de licitación. Pero las causales discrecionales de proveedor único — Art. 54, fracciones I a XIV — cargan los contratos de gran valor, los de cientos de millones donde simplemente se renunció a la competencia.",
          "Sin ofertas rivales que perder, sin un número público contra el cual medirse: este es un sistema de contratación operando en la oscuridad, por diseño.",
        ],
        chartConfig: {
          type: 'inline-bar',
          title: 'How the 69,516 awards were handed out',
          title_es: 'Cómo se entregaron las 69,516 adjudicaciones',
          chartId: 'gap-procedure-types',
          highlight: 'Adjudicación directa',
          data: {
            points: [
              {
                label: 'Adjudicación directa',
                label_en: 'Direct award (no bid)',
                value: 54714,
                annotation: '78.7% — NO COMPETITION',
                annotation_es: '78.7% — SIN COMPETENCIA',
                highlight: true,
              },
              {
                label: 'Licitación pública',
                label_en: 'Public tender',
                value: 8507,
                annotation: '12.2%',
                annotation_es: '12.2%',
              },
              {
                label: 'Invitación a 3',
                label_en: 'Invitation to three',
                value: 5282,
                annotation: '7.6%',
                annotation_es: '7.6%',
              },
              {
                label: 'Acuerdo marco',
                label_en: 'Framework agreement',
                value: 1013,
                annotation: '1.5%',
                annotation_es: '1.5%',
              },
            ],
            unit: 'contracts',
            mode: 'dominance',
            referenceLine: { value: 0.15, label: 'OECD ~15%', label_es: 'OCDE ~15%' },
            stamp: { en: 'RECOVERED · OCR', es: 'RECUPERADO · OCR' },
            annotation:
              'Procedure type for all 69,516 awards recovered after the Sep 28 2025 freeze. Direct award — no public tender — accounts for 78.7%, against an OECD norm in the low tens of a percent even for emergencies.',
            annotation_es:
              'Tipo de procedimiento para las 69,516 adjudicaciones recuperadas tras el congelamiento del 28 de sep 2025. La adjudicación directa — sin licitación pública — representa el 78.7%, frente a una norma OCDE de decenas bajas de por ciento incluso para emergencias.',
          },
        },
        pullquote: {
          quote: "The state records that it bought something, from someone, and declines to say for how much.",
          quote_es: "El Estado registra que compró algo, a alguien, y se niega a decir por cuánto.",
          stat: '76%',
          statLabel: "of awards disclose no amount at all",
          statLabel_es: "de las adjudicaciones no revelan monto alguno",
        },
      },
      {
        id: 'ch4',
        number: 4,
        title: "What the Scans Were Hiding",
        title_es: "Lo que los Escaneos Ocultaban",
        subtitle: "Read off the images: $65.5 billion in no-bid awards, a 3.15-billion-peso contract to Pfizer, and a company born months before it won",
        subtitle_es: "Leído de las imágenes: 65,500 millones en adjudicaciones directas, un contrato de 3,150 MDP a Pfizer, y una empresa nacida meses antes de ganar",
        prose: [
          "From roughly ten thousand of the largest no-bid contracts, optical recognition pulled 65.5 billion pesos in real, named amounts that appeared nowhere in the structured record. The single largest is a 3.15-billion-peso award to Pfizer, signed by BIRMEX — the state vaccine distributor — under the discretionary sole-source ground Art. 54 fr. XII. Behind it: 2.9 billion pesos to a firm called Serprosep through IMSS-Bienestar, and 2.4 billion for medical equipment through ISSSTE. Each handed out with no competition.",
          "Some winners had barely existed before they won. SLYCOM, a company whose incorporation date is encoded — as Mexican tax IDs are — into its RFC, was founded in December 2023 and awarded roughly 880 million pesos within two years. A firm incorporated months before landing a nine-figure federal contract is the textbook signature of a ghost vendor — a flag for further reporting, not a verdict. The recovered record is dotted with them.",
          "These are the contracts the freeze was hiding in practice. Not because anyone classified them — most are nominally public — but because reading them meant defeating a signature, downloading an image, and running it through character recognition. The price of transparency had become a technical barrier most reporters cannot clear.",
        ],
        prose_es: [
          "De alrededor de diez mil de los contratos sin licitación más grandes, el reconocimiento óptico recuperó 65,500 millones de pesos en montos reales y nombrados que no aparecían en ninguna parte del registro estructurado. El más grande es una adjudicación de 3,150 MDP a Pfizer, firmada por BIRMEX — el distribuidor estatal de vacunas — bajo la causal discrecional de proveedor único Art. 54 fr. XII. Detrás: 2,900 MDP a una empresa llamada Serprosep vía IMSS-Bienestar, y 2,400 MDP por equipo médico vía ISSSTE. Cada una entregada sin competencia.",
          "Algunos ganadores apenas habían existido antes de ganar. SLYCOM, una empresa cuya fecha de constitución está codificada — como ocurre con los RFC mexicanos — en su propio RFC, fue fundada en diciembre de 2023 y adjudicada con unos 880 MDP en menos de dos años. Una empresa constituida meses antes de aterrizar un contrato federal de nueve cifras coincide con la firma de manual de un proveedor fantasma; es una bandera para seguir reporteando, no un veredicto, y el registro recuperado está salpicado de ellas.",
          "Estos son los contratos que el congelamiento ocultaba en la práctica. No porque alguien los clasificara — la mayoría son nominalmente públicos — sino porque leerlos exigía vencer una firma, descargar una imagen, y pasarla por reconocimiento de caracteres. El precio de la transparencia se había vuelto una barrera técnica que la mayoría de los reporteros no puede superar.",
        ],
        chartConfig: {
          type: 'inline-roster',
          title: 'The biggest no-bid awards, recovered from scanned PDFs',
          title_es: 'Las mayores adjudicaciones directas, recuperadas de PDFs escaneados',
          chartId: 'gap-top-recovered',
          data: {
            points: [
              {
                label: 'PFIZER, S.A. DE C.V.',
                value: 3146,
                annotation: 'BIRMEX · ART. 54 FR. XII · NO BID',
                annotation_es: 'BIRMEX · ART. 54 FR. XII · SIN LICITACIÓN',
                highlight: true,
              },
              {
                label: 'SERPROSEP, S.A. DE C.V.',
                value: 2909,
                annotation: 'IMSS-BIENESTAR · ART. 54 FR. II · NO BID',
                annotation_es: 'IMSS-BIENESTAR · ART. 54 FR. II · SIN LICITACIÓN',
              },
              {
                label: 'INSTRUMENTOS Y EQUIPOS FALCON',
                value: 2449,
                annotation: 'ISSSTE · ART. 54 FR. VII · NO BID',
                annotation_es: 'ISSSTE · ART. 54 FR. VII · SIN LICITACIÓN',
              },
              {
                label: 'SLYCOM, S.A. DE C.V.',
                value: 880,
                annotation: 'INCORPORATED DEC 2023 · YOUNG-VENDOR FLAG',
                annotation_es: 'CONSTITUIDA DIC 2023 · BANDERA PROVEEDOR JOVEN',
                highlight: true,
              },
            ],
            unit: 'MDP',
            stamp: { en: 'RECOVERED · OCR', es: 'RECUPERADO · OCR' },
            annotation:
              'Top no-bid awards by amount, recovered off scanned award documents via OCR — figures that appear in no structured public dataset. $65.5B MXN was recovered across the ~10,000 highest-value direct awards.',
            annotation_es:
              'Mayores adjudicaciones directas por monto, recuperadas de documentos de adjudicación escaneados vía OCR — cifras que no aparecen en ningún conjunto de datos público estructurado. Se recuperaron 65,500 MDP en las ~10,000 adjudicaciones directas de mayor valor.',
          },
        },
        pullquote: {
          quote: "A 3.15-billion-peso award to Pfizer, handed out with no competition, recovered only by reading it off an image.",
          quote_es: "Una adjudicación de 3,150 MDP a Pfizer, entregada sin competencia, recuperada solo al leerla de una imagen.",
          stat: '65.5B',
          statLabel: "pesos in no-bid awards recovered off scanned PDFs",
          statLabel_es: "pesos en adjudicaciones directas recuperados de PDFs escaneados",
          // 8,414 of 69,516 awards had the amount read off a scan
          barValue: 0.121,
          vizTemplate: 'mass-sliver',
          barLabel: '8.4K of 69.5K direct awards · amount read off scans',
          barLabel_es: '8.4K de 69.5K adjudicaciones directas · monto leído de escaneos',
        },
      },
      {
        id: 'ch5',
        number: 5,
        title: "Grading the Dark",
        title_es: "Calificar la Oscuridad",
        subtitle: "Where the state stopped grading itself, an outside record can",
        subtitle_es: "Donde el Estado dejó de calificarse, un registro externo puede hacerlo",
        prose: [
          "A list of recovered contracts is not yet an accountability tool. So RUBLI assigns each of the 69,516 awards a structural red-flag grade — exactly that, not a probability of corruption. It cannot be the platform's trained risk model, because post-freeze data lacks the features that model needs. Instead it weighs what can be observed: absence of competition, absence of a disclosed price, a discretionary sole-source justification, a ghost or blacklisted vendor, single-vendor concentration, and contract size. Routine low-value purchases score low, so the flag means something when it is raised.",
          "Graded that way, 13.5 percent of the recovered awards land in the high-alert band, and a handful reach critical — a figure that will only grow as the long-tail recovery surfaces more young and blacklisted vendors. The grade also names the agencies that lean hardest into the dark: INDAABIN, the federal real-estate and appraisal institute, and BIRMEX, the distributor that signed the Pfizer contract, carry the highest average red-flag scores among large buyers.",
          "This is the whole point. The apparatus Mexico spent twenty years building was dismantled in a single year, and the spending did not pause for it. Where the government stopped publishing, stopped pricing, and stopped grading its own no-bid awards, an outside record can do all three — not to replace the state's accountability, but to refuse to let its absence be the end of the story.",
        ],
        prose_es: [
          "Una lista de contratos recuperados todavía no es una herramienta de rendición de cuentas. Por eso RUBLI asigna a cada una de las 69,516 adjudicaciones una calificación estructural de banderas — etiquetada honestamente como tal, no como una probabilidad de corrupción. No puede ser el modelo de riesgo entrenado de la plataforma, porque los datos posteriores al congelamiento carecen de las variables que ese modelo necesita. En cambio, pondera lo observable: ausencia de competencia, ausencia de un precio revelado, una justificación discrecional de proveedor único, un proveedor fantasma o en lista negra, concentración en un solo proveedor, y el tamaño del contrato. Las compras rutinarias de bajo monto califican bajo, de modo que la bandera significa algo cuando se levanta.",
          "Calificadas así, el 13.5 por ciento de las adjudicaciones recuperadas caen en la banda de alerta alta, y un puñado llegan a crítico — una cifra que solo crecerá conforme la recuperación de la cola larga revele más proveedores jóvenes y en lista negra. La calificación también nombra a las dependencias que más se inclinan hacia la oscuridad: INDAABIN, el instituto federal de bienes nacionales y avalúos, y BIRMEX, el distribuidor que firmó el contrato con Pfizer, cargan los promedios de banderas más altos entre los grandes compradores.",
          "Este es todo el punto. El aparato que México tardó veinte años en construir fue desmantelado en un solo año, y el gasto no se detuvo por ello. Donde el gobierno dejó de publicar, dejó de poner precio y dejó de calificar sus propias adjudicaciones directas, un registro externo puede hacer las tres cosas — no para reemplazar la rendición de cuentas del Estado, sino para negarse a que su ausencia sea el final de la historia.",
        ],
        pullquote: {
          quote: "Where the government stopped publishing, stopped pricing, and stopped grading its own no-bid awards, an outside record can do all three.",
          quote_es: "Donde el gobierno dejó de publicar, dejó de poner precio y dejó de calificar sus propias adjudicaciones directas, un registro externo puede hacer las tres cosas.",
          stat: '13.5%',
          statLabel: "of recovered awards land in the high-alert band",
          statLabel_es: "de las adjudicaciones recuperadas caen en la banda de alerta alta",
        },
      },
    ],
  },
  // === STORY 1: The Man Who Won 370 Million Pesos and Disappeared ===
  {
    slug: 'el-ejercito-fantasma',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    byline: 'RUBLI Investigative Data Unit',
    status: 'solo_datos',
    estimatedMinutes: 11,
    headline: "The Man Who Won 370 Million Pesos and Disappeared",
    headline_es: "El Hombre Que Ganó 370 Millones de Pesos y Desapareció",
    subheadline:
      "Emilio Carranza Obersohn is one person — not a company — holding two federal contracts worth roughly 370 million pesos, with no record before and none after. He is one of 6,118 vendors RUBLI's algorithm flags as matching ghost-company patterns across 23 years. Mexico's tax authority has officially confirmed 42 of them. The other 6,076 are still contracting with the government.",
    subheadline_es:
      "Emilio Carranza Obersohn es una sola persona — no una empresa — con dos contratos federales por unos 370 millones de pesos, sin registro antes ni después. Es uno de los 6,118 proveedores que el algoritmo de RUBLI marca con patrón de empresa fantasma a lo largo de 23 años. La autoridad fiscal mexicana ha confirmado oficialmente a 42. Los otros 6,076 siguen contratando con el gobierno.",
    leadStat: {
      value: '6,118',
      label: "vendors matching the same pattern",
      label_es: "proveedores con el mismo patrón",
      sublabel: "0.7% officially confirmed",
      sublabel_es: "0.7% confirmados oficialmente",
      color: '#dc2626',
    },
    kickerStats: [
      {
        prefix: "One person, not a company, won",
        prefix_es: "Una persona, no una empresa, ganó",
        value: '370M',
        suffix: "pesos — then vanished from the record.",
        suffix_es: "de pesos — y luego desapareció del registro.",
        tone: 'critical',
      },
      {
        prefix: "His behavior matches",
        prefix_es: "Su conducta coincide con",
        value: '6,118',
        suffix: "vendors flagged on the same pattern.",
        suffix_es: "proveedores marcados con el mismo patrón.",
        tone: 'data',
      },
      {
        prefix: "Official enforcement has confirmed only",
        prefix_es: "La autoridad fiscal solo ha confirmado a",
        value: '42',
        suffix: "of them.",
        suffix_es: "de ellos.",
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
        title: "The Vendor With No Past and No Future",
        title_es: "El Proveedor Sin Pasado ni Futuro",
        subtitle: "One name, two contracts, 370 million pesos, then nothing",
        subtitle_es: "Un nombre, dos contratos, 370 millones de pesos, y después nada",
        prose: [
          "Emilio Carranza Obersohn exists in the federal procurement record as a single line. He is a persona física — a physical person, not a company — and he holds two contracts worth approximately 370 million pesos, between 18 and 25 million US dollars. No contracting history precedes his name; none follows. His activity concentrates inside one institution across one year, and then it stops. One name, two contracts, 370 million pesos, and then nothing.",
          "He is not alone in that shape. Arturo Pueblita Fernández holds two contracts worth roughly 370 million pesos and then disappears from the record. Valeria Fernández Díaz repeats the line exactly: 370 million pesos, two contracts, a single person rather than a company, gone afterward. Three identical rows. Mexican law does let individuals win federal contracts, and legitimate cases exist — specialized consulting, artistic commissions, small local services — but none of them explains 370 million pesos awarded to a single named person.",
          "RUBLI found Carranza with a lens that reads behavior, not names or domiciles. Its Pattern 2 (P2) algorithm weighs a sudden single-year appearance, contract values 10 to 50 times the sector median, no prior or subsequent activity, an RFC that resolves to nothing in the Registro Único de Proveedores y Contratistas, and bursts measured in weeks rather than years. That is why the chart below sets two foreign-domiciled companies — RAPISCAN SYSTEMS INC at 2,500 MDP, APIS FOOD BV at 732 MDP — beside three personas físicas, Carranza among them, each at 370 MDP. The algorithm flagged all five on conduct alone; on every axis, Carranza reads as a textbook match.",
        ],
        prose_es: [
          "Emilio Carranza Obersohn aparece en el registro federal de contrataciones como una sola línea. Es una persona física — un individuo, no una empresa — y tiene dos contratos por aproximadamente 370 millones de pesos, entre 18 y 25 millones de dólares. No hay historial de contratación antes de su nombre; tampoco después. Su actividad se concentra en una sola institución durante un solo año, y luego se detiene. Un nombre, dos contratos, 370 millones de pesos, y después nada.",
          "No está solo en esa forma. Arturo Pueblita Fernández tiene dos contratos por unos 370 millones de pesos y después desaparece del registro. Valeria Fernández Díaz repite la línea idéntica: 370 millones de pesos, dos contratos, una persona y no una empresa, esfumada después. Tres renglones idénticos. La ley mexicana sí permite que personas físicas ganen contratos federales, y existen casos legítimos — consultoría especializada, comisiones artísticas, pequeños servicios locales — pero ninguno explica 370 millones de pesos adjudicados a una sola persona con nombre y apellido.",
          "RUBLI encontró a Carranza con un lente que lee conducta, no nombres ni domicilios. Su algoritmo de Patrón 2 (P2) pondera una aparición súbita en un solo año, montos de 10 a 50 veces la mediana del sector, sin actividad previa ni posterior, un RFC que no resuelve a nada en el Registro Único de Proveedores y Contratistas, y ráfagas medidas en semanas y no en años. Por eso la gráfica coloca a dos empresas de domicilio extranjero — RAPISCAN SYSTEMS INC con 2,500 MDP, APIS FOOD BV con 732 MDP — junto a tres personas físicas, entre ellas Carranza, cada una en 370 MDP. El algoritmo marcó a las cinco solo por su conducta; en cada eje, Carranza encaja como caso de manual.",
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
                color: '#dc2626',
              },
              {
                label: 'ARTURO PUEBLITA FERNÁNDEZ',
                value: 370,
                annotation: 'PERSONA FÍSICA · INDIVIDUAL CONTRACTOR · 2 CONTRACTS',
                annotation_es: 'PERSONA FÍSICA · CONTRATISTA INDIVIDUAL · 2 CONTRATOS',
                highlight: true,
                color: '#dc2626',
              },
              {
                label: 'VALERIA FERNÁNDEZ DÍAZ',
                value: 370,
                annotation: 'PERSONA FÍSICA · INDIVIDUAL CONTRACTOR · 2 CONTRACTS',
                annotation_es: 'PERSONA FÍSICA · CONTRATISTA INDIVIDUAL · 2 CONTRATOS',
                highlight: true,
                color: '#dc2626',
              },
            ],
            unit: 'MDP',
            referenceLine: {
              value: 370,
              label: 'persona floor',
              label_es: 'piso personas',
            },
            annotation:
              'Five named P2-pattern vendors, top by contract value. Rows 1–2 are foreign-domiciled incorporated entities; rows 3–5 are physical persons — not companies — each holding ≈370M-peso federal contracts and then disappearing from the procurement record entirely.',
            annotation_es:
              'Cinco proveedores P2 nombrados, principales por valor de contrato. Las filas 1–2 son entidades incorporadas con domicilio extranjero; las filas 3–5 son personas físicas — no empresas — cada una con contratos federales por ≈370 MDP, y luego desaparecen completamente del registro de contratación.',
          },
        },
        pullquote: {
          quote:
            "One person — not a company — winning federal contracts worth 370 million pesos, then disappearing from the record entirely.",
          quote_es:
            "Una sola persona — no una empresa — ganando contratos federales por 370 millones de pesos, y luego desapareciendo del registro por completo.",
          stat: '370M',
          statLabel: "won by one individual, two contracts, then gone",
          statLabel_es: "ganados por un individuo, dos contratos, y después nada",
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
        title: "Pull Back the Camera",
        title_es: "Abre el Plano",
        subtitle: "From one anomaly to a population of 6,118",
        subtitle_es: "De una anomalía a una población de 6,118",
        prose: [
          "Official enforcement has confirmed 42 of the 6,118 vendors that match the pattern — a detection rate of 0.7 percent, one in 145. Across the full 3,051,294 federal contracts from 2002 through 2025, RUBLI's P2 algorithm flagged those 6,118 vendors, representing 39.6 billion pesos in contract value; cross-checking them against Mexico's definitive ghost-company registry returns exactly 42 matches. The other 144 in every 145 are still under contract. That single ratio, not Carranza, is the scandal.",
          "The benchmark behind it is Mexico's gold standard. The Servicio de Administración Tributaria (SAT) maintains the definitive list of confirmed ghost companies under Article 69-B of the Código Fiscal de la Federación — the EFOS registry. As of April 2026 it holds 13,960 entities and reaches back to 2014. The list took a decade to assemble, each case proven individually with simulated invoices and sworn testimony. Against RUBLI's live P2 field, that decade of work produces 42 matches.",
          "The split is stark: 42 confirmed, 6,076 not. That is not proof every flagged vendor is a ghost — P2 classifies behavior, and some will prove legitimate, specialized or foreign suppliers, since foreign domicile is routine in Mexican contracting and never the signal. But fraud research holds that 20 to 40 percent of P2-type signatures correspond to actual fraud; applied to the 6,076, that implies 1,200 to 2,400 unrecognized ghost companies — roughly 1,200 as the structural floor — operating inside federal procurement right now. SAT has confirmed 42.",
        ],
        prose_es: [
          "La autoridad fiscal ha confirmado a 42 de los 6,118 proveedores que coinciden con el patrón — una tasa de detección de 0.7 por ciento, uno de cada 145. Sobre el total de 3,051,294 contratos federales de 2002 a 2025, el algoritmo P2 de RUBLI marcó a esos 6,118 proveedores, que representan 39,600 millones de pesos en valor contratado; al cruzarlos contra el registro definitivo de empresas fantasma de México arroja exactamente 42 coincidencias. Los otros 144 de cada 145 siguen contratando. Ese solo cociente, no Carranza, es el escándalo.",
          "El referente detrás es el estándar de oro de México. El Servicio de Administración Tributaria (SAT) mantiene la lista definitiva de empresas fantasma confirmadas bajo el Artículo 69-B del Código Fiscal de la Federación — el registro EFOS. A abril de 2026 reúne 13,960 entidades y se remonta a 2014. La lista tomó una década en armarse, cada caso probado uno por uno con facturas simuladas y testimonios bajo protesta. Frente al campo vivo de P2 de RUBLI, esa década de trabajo produce 42 coincidencias.",
          "La división es contundente: 42 confirmados, 6,076 no. Eso no prueba que cada proveedor marcado sea una fantasma — P2 clasifica conducta, y algunos resultarán legítimos, proveedores especializados o extranjeros, porque el domicilio extranjero es rutina en la contratación mexicana y nunca es la señal. Pero la investigación sobre fraude sostiene que del 20 al 40 por ciento de las firmas tipo P2 corresponden a fraude real; aplicado a los 6,076, implica de 1,200 a 2,400 empresas fantasma no reconocidas — alrededor de 1,200 como piso estructural — operando dentro de la contratación federal ahora mismo. El SAT ha confirmado 42.",
        ],
        pullquote: {
          quote:
            "One in 145 vendors the algorithm flags on the ghost pattern has been officially confirmed by SAT. The other 144 keep contracting with the government.",
          quote_es:
            "Uno de cada 145 proveedores que el algoritmo marca con el patrón fantasma ha sido confirmado oficialmente por el SAT. Los otros 144 siguen contratando con el gobierno.",
          stat: '0.7%',
          statLabel: "official detection rate against the P2 population",
          statLabel_es: "tasa de detección oficial frente a la población P2",
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
        title: "Why the Official List Is Always Late",
        title_es: "Por Qué la Lista Oficial Siempre Llega Tarde",
        subtitle: "Tax enforcement is retrospective; procurement fraud is prospective",
        subtitle_es: "La fiscalización mira al pasado; el fraude en contrataciones mira al futuro",
        prose: [
          "SAT's fastest definitive listing takes six months; its worst case runs past three years. RUBLI's P2 runs in about two weeks. A vendor like Carranza can extract 370 million pesos and dissolve long before any official list reaches him — and he keeps contracting the entire time, because the definitive listing is the only trigger for procurement exclusion.",
          "The procedure dictates the delay. Article 69-B requires SAT to prove, with simulated invoices and operational records, that an entity issued fiscal receipts without underlying economic activity — proof built from bank records, third-party testimony, and on-site visits. A provisional listing then publishes in the Diario Oficial de la Federación with a 30-day rebuttal period, and only after it expires does the definitive listing go live. The timeline below follows from that sequence: RUBLI's 0.5 months, SAT's best case at 6, the typical 12-to-18-month run charted at 15, and a worst case of 36 months or more when vendors litigate.",
          "The OECD's 2023 Public Procurement Performance Report identified this same gap worldwide and recommended that procurement systems build independent behavioral red-flag detection in parallel — because tax enforcement is retrospective while procurement fraud is prospective. World Bank research on Eastern European procurement reached the identical conclusion in 2019. P2 is that recommendation operationalized: pattern-based, procurement-native, fast. It does not replace SAT; it adds the one thing tax enforcement cannot deliver at scale — speed.",
        ],
        prose_es: [
          "El listado definitivo más rápido del SAT tarda seis meses; en el peor caso rebasa los tres años. El P2 de RUBLI corre en unas dos semanas. Un proveedor como Carranza puede extraer 370 millones de pesos y disolverse mucho antes de que cualquier lista oficial lo alcance — y sigue contratando todo ese tiempo, porque el listado definitivo es el único disparador de la exclusión en contrataciones.",
          "El procedimiento dicta la demora. El Artículo 69-B obliga al SAT a probar, con facturas simuladas y registros operativos, que una entidad emitió comprobantes fiscales sin actividad económica real — prueba construida con estados de cuenta, testimonios de terceros y visitas en sitio. Luego se publica un listado provisional en el Diario Oficial de la Federación con un plazo de 30 días para desvirtuar, y solo cuando vence entra el listado definitivo. La línea de tiempo se desprende de esa secuencia: los 0.5 meses de RUBLI, el mejor caso del SAT en 6, el plazo típico de 12 a 18 meses graficado en 15, y un peor caso de 36 meses o más cuando los proveedores litigan.",
          "El Reporte de Desempeño en Contrataciones Públicas 2023 de la OCDE identificó esta misma brecha en todo el mundo y recomendó que los sistemas de compra construyan en paralelo su propia detección de señales de alerta por conducta — porque la fiscalización mira al pasado mientras el fraude en contrataciones mira al futuro. La investigación del Banco Mundial sobre contrataciones en Europa del Este llegó a la misma conclusión en 2019. P2 es esa recomendación hecha operación: basada en patrones, nativa de la contratación, rápida. No reemplaza al SAT; aporta lo único que la fiscalización no puede entregar a escala — velocidad.",
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'Time to Definitive Listing — SAT vs RUBLI',
          title_es: 'Tiempo hasta listado definitivo — SAT vs RUBLI',
          chartId: 'sat-rubli-latency',
          data: {
            points: [
              {
                label: 'SAT · worst case',
                label_es: 'SAT · peor caso',
                value: 36,
                value2: 0.5,
                color: '#dc2626',
                annotation: '36+ months (legal challenges)',
                annotation_es: '36+ meses (impugnaciones)',
              },
              {
                label: 'SAT · typical',
                label_es: 'SAT · típico',
                value: 15,
                value2: 0.5,
                color: '#a06820',
                annotation: '12–18 months range',
                annotation_es: 'rango 12–18 meses',
              },
              {
                label: 'SAT · best case',
                label_es: 'SAT · óptimo',
                value: 6,
                value2: 0.5,
                color: '#71717a',
                annotation: 'fastest definitive listing',
                annotation_es: 'listado definitivo más rápido',
              },
            ],
            unit: 'months',
            annotation:
              "Filled dot = SAT's Art. 69-B benchmark; open dot = RUBLI's own P2 pipeline run, a constant 0.5 months across all three rows. Even SAT's fastest listing (6mo) takes 12× longer than one ARIA run; the worst case (36mo) takes 72× longer. During SAT's window, flagged vendors keep contracting. Source: OECD 2023 Public Procurement Performance Report.",
            annotation_es:
              'Punto lleno = referente del SAT bajo el Art. 69-B; punto abierto = una corrida del pipeline P2 de RUBLI, constante en 0.5 meses en las tres filas. Incluso el listado más rápido del SAT (6 meses) tarda 12 veces más que una corrida de ARIA; el peor caso (36 meses) tarda 72 veces más. Durante la ventana del SAT, los proveedores marcados siguen contratando. Fuente: OCDE, Reporte de Desempeño en Contrataciones Públicas 2023.',
          },
        },
        pullquote: {
          quote:
            "SAT confirms a ghost company in six months at best and three years at worst. RUBLI's P2 flags the same behavior in two weeks.",
          quote_es:
            "El SAT confirma una empresa fantasma en seis meses en el mejor caso y tres años en el peor. El P2 de RUBLI marca la misma conducta en dos semanas.",
          stat: "2 wks",
          statLabel: "one P2 run, against SAT's 6-to-36-month wait",
          statLabel_es: "una corrida de P2, frente a la espera de 6 a 36 meses del SAT",
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
        title_es: "El Nombre Que Tenemos, el Que No",
        subtitle: "The shell is named and excluded; the official who signed is anonymous",
        subtitle_es: "A la fachada se le nombra y se le excluye; el funcionario que firmó queda en el anonimato",
        prose: [
          "The shell has a name in the record — Emilio Carranza Obersohn. The official who signed his two contracts does not. A ghost company is a two-sided transaction: someone creates the shell, and someone inside the government signs the approval. The record names only the first half. Across the full 23-year dataset, the SFP sanctions database shows 1,954 vendor-level sanctions — a tiny fraction even of the 6,118 P2-flagged vendors — and names almost none of the approving officials. The chart's zero bar is that absence itself: 1,954 vendors sanctioned, almost none of the officials who approved them named or sanctioned.",
          "RUBLI is silent on the signer by necessity: COMPRANET does not reliably link approving officials to specific contracts. That linkage lives in internal procurement-unit records and is not systematically published. The Secretaría de la Función Pública (SFP) holds the authority to audit those approvals and sanction officials; the 1,954 figure is what it has used. Even among the 42 confirmed EFOS vendors in the procurement records, public records show criminal prosecution for only a fraction; most receive fiscal sanctions and procurement exclusion, nothing more — and that asymmetry guarantees the next ghost faces no deterrent.",
          "The unconfirmed 6,076 are ranked by ARIA's Integrated Priority Score, and the top 100 are the highest-yield targets; three checks completable in days — RUPC registration, a real physical address, and whether one procurement unit awarded multiple P2 vendors at once — can move a case to the UIF, which can subpoena bank records but lacks a pre-investigated pipeline. RUBLI cannot prosecute or sanction. It forces the question it cannot answer: of 6,118 vendors whose conduct mirrors documented ghost companies, which officials signed their contracts, and why were those officials never investigated?",
        ],
        prose_es: [
          "La fachada tiene nombre en el registro — Emilio Carranza Obersohn. El funcionario que firmó sus dos contratos, no. Una empresa fantasma es una transacción de dos partes: alguien crea la fachada y alguien dentro del gobierno firma la autorización. El registro nombra solo a la primera mitad. Sobre el total de 23 años de datos, la base de sanciones de la SFP muestra 1,954 sanciones a nivel de proveedor — una fracción mínima incluso de los 6,118 proveedores marcados por P2 — y casi no nombra a ninguno de los funcionarios que autorizaron. La barra en cero de la gráfica es esa ausencia misma: 1,954 proveedores sancionados, y casi ninguno de los funcionarios que los aprobaron nombrado o sancionado.",
          "RUBLI calla sobre el firmante por necesidad: COMPRANET no liga de forma confiable a los funcionarios que autorizan con contratos específicos. Ese vínculo vive en registros internos de las unidades compradoras y no se publica de manera sistemática. La Secretaría de la Función Pública (SFP) tiene la facultad de auditar esas autorizaciones y sancionar funcionarios; la cifra de 1,954 es la que ha ejercido. Incluso entre los 42 proveedores EFOS confirmados que aparecen en los registros de contratación, los registros públicos muestran proceso penal solo para una fracción; la mayoría recibe sanciones fiscales y exclusión y nada más — y esa asimetría garantiza que el siguiente fantasma no enfrente disuasión alguna.",
          "Los 6,076 sin confirmar están jerarquizados por el Índice de Prioridad Integrada de ARIA, y los primeros 100 son los blancos de mayor rendimiento; tres verificaciones realizables en días — registro en el RUPC, un domicilio físico real, y si una misma unidad compradora adjudicó a varios proveedores P2 a la vez — pueden llevar un caso a la UIF, que puede citar estados de cuenta pero carece de una línea de casos ya investigados. RUBLI no puede procesar ni sancionar. Obliga a la pregunta que no puede responder: de 6,118 proveedores cuya conducta refleja la de empresas fantasma documentadas, ¿qué funcionarios firmaron sus contratos, y por qué nunca se investigó a esos funcionarios?",
        ],
        pullquote: {
          quote:
            "A ghost company is a two-sided transaction. Mexico names the shell. Mexico does not name the official who signed.",
          quote_es:
            "Una empresa fantasma es una transacción de dos partes. México nombra a la fachada. México no nombra al funcionario que firmó.",
          stat: '1,954',
          statLabel: "SFP vendor sanctions (2002-2025)",
          statLabel_es: "sanciones a proveedores de la SFP (2002-2025)",
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
    headline: "The Contracts No One Is Watching Are the Biggest Ones",
    headline_es: "Los contratos que nadie vigila son los más grandes",
    subheadline:
      "Mexico audits its smallest contracts hardest and its largest least — the exact inverse of where the corruption risk sits. RUBLI's risk model, which never sees a contract's size, scores risk that climbs almost step by step with value: 0.25 at the bottom, 0.94 at the top. All 40 contracts above 10 billion pesos, worth 819 billion combined, are high-risk. Just 33 vendors hold them. The mega-contract universe is a directory of recurring names, audited least where the money is largest.",
    subheadline_es:
      "México audita con más fuerza sus contratos más chicos y con menos sus más grandes — exactamente al revés de donde está el riesgo de corrupción. El modelo de RUBLI, que nunca conoce el tamaño de un contrato, asigna un riesgo que sube casi escalón por escalón con el valor: 0.25 abajo, 0.94 arriba. Los 40 contratos por encima de 10 mil millones de pesos, con valor combinado de 819 mil millones, son todos de alto riesgo. Apenas 33 proveedores los controlan. El universo de mega-contratos es un directorio de nombres recurrentes, auditado menos donde el dinero es mayor.",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: {
      value: '819B MXN',
      label: "40 contracts above 10B MXN — and oversight runs thinnest exactly here",
      label_es:
        "40 contratos por encima de 10 mil millones — y la supervisión es más débil justo aquí",
      sublabel: "Every one high-risk · just 33 vendors behind them",
      sublabel_es: "Todos de alto riesgo · solo 33 proveedores detrás de ellos",
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
        suffix: "average risk, smallest to largest contract bracket",
        suffix_es: "riesgo promedio, del rango más chico al más grande",
        tone: 'data',
      },
      {
        value: '40 / 40',
        suffix: "contracts above 10B MXN that are high-risk",
        suffix_es: "contratos por encima de 10 mil millones de alto riesgo",
        tone: 'critical',
      },
      {
        value: '~5%',
        suffix: "estimated audit coverage where risk is highest",
        suffix_es: "cobertura de auditoría estimada donde el riesgo es mayor",
        tone: 'data',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: "Risk Climbs With the Money",
        title_es: "El riesgo sube con el dinero",
        subtitle: "A model that never sees a contract's size found a ladder anyway",
        subtitle_es: "Un modelo que nunca ve el tamaño de un contrato encontró una escalera de todos modos",
        prose: [
          "Everyone assumes the biggest contracts are the safest. A deal worth tens of billions of pesos should draw the most bidders, the hardest scrutiny from the federal auditor, the most coverage, the steepest political cost if it fails. Size, the intuition runs, buys oversight. RUBLI's risk model found the opposite, and it found it without ever being told how large a single contract was.",
          "The v0.8.5 model scores every federal contract on a 0-to-1 scale, calibrated against 1,427 documented corruption cases, test AUC 0.785. It reads vendor concentration, price volatility, and procurement mechanism — never the peso value. Group the 3,051,294 scored contracts by size afterward and the climb is unmistakable. Contracts under 100,000 pesos average 0.25. From 1 to 10 million, 0.29. From 10 to 50 million, 0.41 — already across the high-risk line. From 50 to 500 million, 0.68. From 500 million to 5 billion, 0.91. Above 5 billion, 0.94.",
          "The relationship is one the model discovered, not one built into it. The 112 contracts in the top bracket — each a single procurement worth more than 5 billion pesos, 1.32 trillion pesos in all — average 0.94, deep inside the critical tier where 0.60 is the line above which an investigation is warranted. The thing intuition says should be safest is, on the evidence, the riskiest in government.",
        ],
        prose_es: [
          "Todos suponen que los contratos más grandes son los más seguros. Un trato por decenas de miles de millones de pesos debería atraer a más oferentes, el escrutinio más duro de la auditoría federal, la mayor cobertura, el costo político más alto si fracasa. El tamaño, dice la intuición, compra supervisión. El modelo de RUBLI encontró lo contrario, y lo encontró sin que jamás le dijeran cuán grande era un contrato.",
          "El modelo v0.8.5 califica cada contrato federal en una escala de 0 a 1, calibrada contra 1,427 casos documentados de corrupción, con AUC de prueba de 0.785. Lee la concentración de proveedores, la volatilidad de precios y el mecanismo de contratación — nunca el valor en pesos. Agrupe después los 3,051,294 contratos calificados por tamaño y la subida es inconfundible. Los contratos por debajo de 100,000 pesos promedian 0.25. De 1 a 10 millones, 0.29. De 10 a 50 millones, 0.41 — ya cruzada la línea de alto riesgo. De 50 a 500 millones, 0.68. De 500 millones a 5 mil millones, 0.91. Por encima de 5 mil millones, 0.94.",
          "La relación es algo que el modelo descubrió, no algo que tenga incorporado. Los 112 contratos del rango más alto — cada uno una sola contratación por más de 5 mil millones de pesos, 1.32 billones de pesos en total — promedian 0.94, muy adentro del nivel crítico, donde 0.60 es la línea a partir de la cual se justifica una investigación. Lo que la intuición dice que debería ser lo más seguro es, según la evidencia, lo más riesgoso del gobierno.",
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
            connectDots: true,
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
            "Los 112 contratos más grandes en la base de datos tienen una calificación de riesgo promedio de 0.94. En el marco de RUBLI, 0.60 es el umbral a partir del cual se justifica una investigación. La intuición dice que estos deberían ser los contratos más seguros del gobierno.",
          stat: '0.94',
          statLabel: "avg risk, contracts above 5B MXN",
          statLabel_es: "riesgo prom., contratos por encima de 5 mil millones MXN",
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
        title: "Why the Curve Runs Backwards",
        title_es: "Por qué la curva corre al revés",
        subtitle: "Big contracts shed their guardrails for three structural reasons",
        subtitle_es:
          "Los contratos grandes pierden sus controles por tres razones estructurales",
        prose: [
          "The climb is not a model artifact. It tracks structural realities of procurement fraud that international research has documented for two decades, through three compounding mechanisms. First: large contracts skip competition. In RUBLI's data, contracts above 10 million pesos are awarded by direct adjudication at rates approaching 90 percent in the salud and energía sectors. Direct award strips out three of OECD's four integrity controls — competitive pricing pressure, public advertising, and systematic bid evaluation with an audit trail. OECD's recommended ceiling for direct award is 25 to 30 percent. The biggest contracts blow past it.",
          "Second: large contracts concentrate enough money to pay for sophisticated fraud. Inventing a ghost company, staging a fake competition, securing an official — each carries fixed costs in time, relationships, and risk. Below a break-even point those costs exceed the return; above it, they turn profitable. The IMSS Ghost Company Network operated mostly in the 100-to-500-million-peso band. The Infrastructure Overpricing Network RUBLI tracks in ARIA runs contracts averaging 645 million pesos each — well past any plausible break-even.",
          "Third: the biggest contracts pool where capture is already entrenched. PEMEX, CFE, IMSS, ISSSTE, and SCT — the five largest procuring entities — generate the majority of contracts above 500 million pesos, and all five carry decades of documented corruption. The more-money-more-scrutiny intuition fails because the money flows precisely to the places where the guardrails are already gone.",
        ],
        prose_es: [
          "La subida no es un artefacto del modelo. Refleja realidades estructurales del fraude en contratación que la investigación internacional ha documentado por dos décadas, mediante tres mecanismos que se combinan. Primero: los contratos grandes se saltan la competencia. En los datos de RUBLI, los contratos por encima de 10 millones de pesos se adjudican por adjudicación directa a tasas que rozan el 90 por ciento en los sectores de salud y energía. La adjudicación directa elimina tres de los cuatro controles de integridad de la OCDE — la presión de precios competitivos, la publicidad pública y la evaluación sistemática de ofertas con historial de auditoría. El techo recomendado por la OCDE para la adjudicación directa es del 25 al 30 por ciento. Los contratos más grandes lo rebasan por mucho.",
          "Segundo: los contratos grandes concentran suficiente dinero para pagar el fraude sofisticado. Inventar una empresa fantasma, simular una competencia falsa, asegurar a un funcionario — cada cosa tiene costos fijos de tiempo, relaciones y riesgo. Por debajo de un punto de equilibrio esos costos superan el beneficio; por encima, se vuelven rentables. La Red de Empresas Fantasma del IMSS operó sobre todo en el rango de 100 a 500 millones de pesos. La Red de Sobreprecio en Infraestructura que RUBLI rastrea en ARIA maneja contratos que promedian 645 millones de pesos cada uno — muy por encima de cualquier punto de equilibrio plausible.",
          "Tercero: los contratos más grandes se acumulan donde la captura ya está arraigada. PEMEX, CFE, IMSS, ISSSTE y SCT — las cinco entidades contratantes más grandes — generan la mayoría de los contratos por encima de 500 millones de pesos, y las cinco cargan décadas de corrupción documentada. La intuición de a-más-dinero-más-escrutinio falla porque el dinero fluye justo hacia los lugares donde los controles ya desaparecieron.",
        ],
        pullquote: {
          quote:
            "Large contracts remove three of OECD's four integrity controls: competitive pricing, public advertising, and systematic evaluation. The recommended ceiling for direct award is 25 to 30 percent.",
          quote_es:
            "Los contratos grandes eliminan tres de los cuatro controles de integridad de la OCDE: precios competitivos, publicidad pública y evaluación sistemática. El techo recomendado para la adjudicación directa es del 25 al 30 por ciento.",
          stat: '~90%',
          statLabel: "direct-award rate for contracts >10M MXN in salud & energía",
          statLabel_es: "tasa de adjudicación directa para contratos >10M MXN en salud y energía",
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
        title: "A Directory, Not a Market",
        title_es: "Un directorio, no un mercado",
        subtitle: "795 contracts above one billion — held by 466 vendors, in four sectors",
        subtitle_es:
          "795 contratos por encima de mil millones — en manos de 466 proveedores, en cuatro sectores",
        prose: [
          "There is no clean mega-contract in the dataset. Above 10 billion pesos sit 40 contracts, held by 33 vendors, every one high-risk, average score 0.962 — and the model has yet to find an exception. Cross the one-billion-peso line and the field thins to 795 contracts out of 3,051,294, worth 2.66 trillion pesos, held by just 466 vendors, about 0.15 percent of the active vendor universe. Above 5 billion: 112 contracts, 93 vendors. The mega-contract tier is not a market. It is a directory.",
          "The cast is not random. It clusters into five recognizable types: pharmaceutical distributors with multi-decade IMSS relationships — Grupo Fármacos, Maypo, PISA, DIMM, the cartel documented in The Invisible Monopoly; Tren Maya contractors awarded after 2019 — Operadora CICSA, ICA Constructora, Alstom Transport; Pemex and CFE infrastructure providers — Dowell Schlumberger, ICA Fluor, Cotemar; military-construction operators — Coconal, Constructora Arhnos; and card-and-voucher welfare operators such as TOKA Internacional.",
          "The extremes name themselves. MANTENIMIENTO EXPRESS MARÍTIMO S.A.P.I. DE C.V. holds one contract worth 69.9 billion pesos at a perfect 1.000 — Pemex marine maintenance, awarded sole-source. URBANISSA S.A. DE C.V. holds a single 58-billion-peso contract at 0.969. CONSTRUCTORA ARHNOS, S.A. DE C.V. holds a single 31.9-billion-peso contract at 1.000. Each is one contract larger than the annual budget of several Mexican states.",
          "These vendors match the pattern RUBLI flags — concentration, sole-source awards, perfect risk scores; the model classifies behavior, not proven crime. The chart below ranks the top 12 by pesos in contracts above one billion, each annotated with its contract count and score, with single-contract and perfect-score outliers marked. Together those 12 capture 618 billion pesos, 23 percent of the mega-contract universe. The four sectors that absorb 92 percent of all mega-pesos are the four with the longest documented corruption histories. OECD's 2023 review named the pattern 'concentrated risk capture' and recommended sector-specific oversight teams on the four highest-risk sectors. The recommendation was not implemented.",
        ],
        prose_es: [
          "No existe un mega-contrato limpio en el conjunto de datos. Por encima de 10 mil millones de pesos hay 40 contratos, en manos de 33 proveedores, todos de alto riesgo, calificación promedio 0.962 — y el modelo aún no encuentra una excepción. Cruce la línea de mil millones de pesos y el campo se reduce a 795 contratos de 3,051,294, con valor de 2.66 billones de pesos, en manos de solo 466 proveedores, alrededor del 0.15 por ciento del universo activo. Por encima de 5 mil millones: 112 contratos, 93 proveedores. El nivel de mega-contratos no es un mercado. Es un directorio.",
          "El reparto no es aleatorio. Se agrupa en cinco tipos reconocibles: distribuidoras farmacéuticas con relaciones de varias décadas con el IMSS — Grupo Fármacos, Maypo, PISA, DIMM, el cártel documentado en El Monopolio Invisible; contratistas del Tren Maya adjudicados después de 2019 — Operadora CICSA, ICA Constructora, Alstom Transport; proveedores de infraestructura de Pemex y CFE — Dowell Schlumberger, ICA Fluor, Cotemar; operadores de construcción militar — Coconal, Constructora Arhnos; y operadores de tarjetas y vales de bienestar como TOKA Internacional.",
          "Los extremos se nombran solos. MANTENIMIENTO EXPRESS MARÍTIMO S.A.P.I. DE C.V. tiene un contrato por 69.9 mil millones de pesos con calificación perfecta de 1.000 — mantenimiento marino de Pemex, adjudicado como proveedor único. URBANISSA S.A. DE C.V. tiene un solo contrato por 58 mil millones con calificación de 0.969. CONSTRUCTORA ARHNOS, S.A. DE C.V. tiene un solo contrato por 31.9 mil millones con calificación de 1.000. Cada uno es un solo contrato mayor que el presupuesto anual de varios estados mexicanos.",
          "Estos proveedores coinciden con el patrón que RUBLI marca — concentración, adjudicaciones a proveedor único, calificaciones de riesgo perfectas; el modelo clasifica comportamiento, no delito probado. La gráfica de abajo ordena los 12 primeros por pesos en contratos por encima de mil millones, cada uno anotado con su número de contratos y su calificación, con los atípicos de un solo contrato y de calificación perfecta marcados. Juntos esos 12 capturan 618 mil millones de pesos, 23 por ciento del universo de mega-contratos. Los cuatro sectores que absorben el 92 por ciento de todos los mega-pesos son los cuatro con las historias de corrupción mejor documentadas. La revisión de la OCDE de 2023 nombró el patrón 'captura de riesgo concentrado' y recomendó equipos de supervisión específicos por sector en los cuatro sectores de mayor riesgo. La recomendación no fue implementada.",
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
            "A single contract for 69.9 billion pesos at a 1.000 risk score. A single contract for 58 billion. A single contract for 31.9 billion. The mega-contract tier in Mexican federal procurement is not a market. It is a directory.",
          quote_es:
            "Un solo contrato por 69.9 mil millones de pesos con calificación de riesgo 1.000. Otro por 58 mil millones. Otro por 31.9 mil millones. El nivel de mega-contratos en la contratación federal mexicana no es un mercado. Es un directorio.",
          stat: '40',
          statLabel: "contracts above 10B MXN — average risk score 0.962, every one critical",
          statLabel_es:
            "contratos por encima de 10 mil millones — riesgo promedio 0.962, todos críticos",
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
        title: "The Sectors Where the Giants Live",
        title_es: "Los sectores donde viven los gigantes",
        subtitle: "92 percent of mega-pesos in the four most-documented sectors",
        subtitle_es: "92 por ciento de los mega-pesos en los cuatro sectores más documentados",
        prose: [
          "The giants live at four addresses. Energía takes 917.3 billion pesos, 34.5 percent across 250 contracts. Salud, 638.6 billion, 24.0 percent across 258. Infraestructura, 552.4 billion, 20.8 percent across 100. Hacienda, 349.6 billion, 13.1 percent across 92. Together they hold 92 percent of every peso awarded above one billion. An equal share for one of ten sectors would be 265.3 billion pesos; the top four each blow past it.",
          "The bottom of the ledger indicts as loudly as the top. Educación, the third-largest line in the federal budget, draws only 2 percent of mega-contract pesos. Medio Ambiente, Gobernación, Defensa — in civilian COMPRANET, with military procurement on separate channels — Agricultura and Trabajo trail far behind. The money pools precisely where institutional capture is best documented. Scrutiny that tracked risk would concentrate here. As the next chapter shows, the audit map points almost everywhere else.",
        ],
        prose_es: [
          "Los gigantes viven en cuatro direcciones. Energía se lleva 917.3 mil millones de pesos, 34.5 por ciento en 250 contratos. Salud, 638.6 mil millones, 24.0 por ciento en 258. Infraestructura, 552.4 mil millones, 20.8 por ciento en 100. Hacienda, 349.6 mil millones, 13.1 por ciento en 92. Juntos concentran el 92 por ciento de cada peso adjudicado por encima de mil millones. Una parte igual para uno de diez sectores sería de 265.3 mil millones de pesos; los cuatro primeros la rebasan por mucho.",
          "El fondo del registro acusa tan fuerte como la cima. Educación, tercera línea más grande del presupuesto federal, capta solo el 2 por ciento de los pesos en mega-contratos. Medio Ambiente, Gobernación, Defensa — en el COMPRANET civil, con la contratación militar por canales separados — Agricultura y Trabajo quedan muy rezagados. El dinero se acumula justo donde la captura institucional está mejor documentada. Un escrutinio que siguiera el riesgo se concentraría aquí. Como muestra el siguiente capítulo, el mapa de auditoría apunta a casi cualquier otra parte.",
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
            "Los sectores que absorben los contratos más grandes de México son los mismos cuatro con las historias de corrupción mejor documentadas. Captura concentrada, por definición.",
          stat: '92%',
          statLabel:
            "mega-contract pesos concentrated in 4 sectors (Energía, Salud, Infra, Hacienda)",
          statLabel_es:
            "pesos en mega-contratos concentrados en 4 sectores (Energía, Salud, Infra, Hacienda)",
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
        title: "The Ladder Runs Backwards",
        title_es: "La escalera corre al revés",
        subtitle: "Mexico scrutinizes its safest contracts hardest and its riskiest least",
        subtitle_es:
          "México escudriña sus contratos más seguros con más fuerza y los más riesgosos con menos",
        prose: [
          "By law, no significant contract should escape. Four institutions split the duty: ASF audits federal accounts after the fact, SFP polices the integrity of the procurement process, COFECE investigates anticompetitive behavior, UIF tracks suspicious financial flows. The law assigns oversight to every rung of the ladder.",
          "At the top, the institutions stop functioning. The 40 contracts above 10 billion pesos — every one high-risk, average score 0.962 — are also the 40 most likely to involve politically connected vendors and presidential-priority institutions. Auditing a 10-billion-peso contract is a political confrontation, and confrontations are rationed. Those 40 are not a workload for ASF; they are a list of conversations the political system has chosen not to have.",
          "At the bottom, the same institutions are visibly busy. SFP and ASF review thousands of small-value contracts a year — cheaper, easier, press-release-generating. Audit intensity ends up inversely correlated with corruption risk: the cleanest contracts get the most scrutiny, the riskiest the least. The risk ladder and the audit ladder are the same ladder, turned upside down.",
          "RUBLI quantifies the gap. 819 billion pesos of contracting in the above-10-billion tier; 33 vendors; risk average 0.962; an estimated 5 percent audit coverage rate, meaning roughly 95 percent of contracts above 5 billion pesos are never audited at all. Closing it needs no new laws and no new technology — only naming the 33 vendors and the 40 contracts and assigning each to a specific investigation, regardless of which ministry signed.",
        ],
        prose_es: [
          "Por ley, ningún contrato significativo debería escapar. Cuatro instituciones se reparten el deber: la ASF audita las cuentas federales a posteriori, la SFP vigila la integridad del proceso de contratación, la COFECE investiga comportamientos anticompetitivos, la UIF rastrea flujos financieros sospechosos. La ley asigna supervisión a cada peldaño de la escalera.",
          "En la cima, las instituciones dejan de funcionar. Los 40 contratos por encima de 10 mil millones de pesos — todos de alto riesgo, calificación promedio 0.962 — son también los 40 con mayor probabilidad de involucrar a proveedores políticamente conectados e instituciones cercanas a las prioridades presidenciales. Auditar un contrato de 10 mil millones de pesos es una confrontación política, y las confrontaciones se racionan. Esos 40 no son una carga de trabajo para la ASF; son una lista de conversaciones que el sistema político ha decidido no tener.",
          "En la parte baja, las mismas instituciones están visiblemente ocupadas. La SFP y la ASF revisan miles de contratos de bajo valor al año — más baratos, más fáciles, generadores de comunicados. La intensidad de auditoría termina inversamente correlacionada con el riesgo de corrupción: los contratos más limpios reciben el mayor escrutinio, los más riesgosos el menor. La escalera de riesgo y la escalera de auditoría son la misma escalera, puesta de cabeza.",
          "RUBLI cuantifica el vacío. 819 mil millones de pesos de contratación en el nivel por encima de 10 mil millones; 33 proveedores; promedio de riesgo 0.962; un estimado del 95 por ciento de los contratos por encima de 5 mil millones nunca auditados, frente a una tasa estimada de cobertura de auditoría del 5 por ciento. Cerrarlo no requiere nuevas leyes ni nueva tecnología — solo nombrar a los 33 proveedores y los 40 contratos y asignar cada uno a una investigación específica, sin importar qué ministerio los firmó.",
        ],
        pullquote: {
          quote:
            "Mexico audits its cleanest contracts the most and its riskiest contracts the least. The accountability gap grows with every peso of contract value.",
          quote_es:
            "México audita sus contratos más limpios con la mayor intensidad y los más riesgosos con la menor. El vacío de rendición de cuentas crece con cada peso de valor de contrato.",
          stat: '95%',
          statLabel: "estimated share of contracts above 5B MXN never audited",
          statLabel_es:
            "porcentaje estimado de contratos por encima de 5 mil millones nunca auditados",
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
    headline: "Anatomy of a Captured Market",
    headline_es: "Anatomía de un mercado capturado",
    subheadline:
      "Grupo Fármacos Especializados collected 133.4 billion pesos from Mexico's federal government — and carries a 0.99 risk score, the top of RUBLI's entire vendor ladder. It is one of four pharmaceutical distributors that took 328.6 billion pesos between 2003 and 2025, funneled it through a single customer, and passed dominance among themselves as the procurement rules changed three times. Four named competitors. One captured market.",
    subheadline_es:
      "Grupo Fármacos Especializados recibió 133,400 millones de pesos del gobierno federal mexicano — y carga una calificación de riesgo de 0.99, la cima de toda la escalera de proveedores de RUBLI. Es una de cuatro distribuidoras farmacéuticas que se llevaron 328,600 millones de pesos entre 2003 y 2025, los canalizaron por un solo cliente y se pasaron el dominio entre ellas mientras las reglas de contratación cambiaban tres veces. Cuatro competidoras con nombre. Un mercado capturado.",
    leadStat: {
      value: '328.6B MXN',
      label: "collected by four vendors in a single pharmaceutical market",
      label_es: "recaudados por cuatro proveedores en un solo mercado farmacéutico",
      sublabel: "Grupo Fármacos · Maypo · PISA · DIMM, 2003-2025",
      sublabel_es: "Grupo Fármacos · Maypo · PISA · DIMM, 2003-2025",
      color: '#dc2626',
    },
    kickerStats: [
      {
        value: '328.6B MXN',
        suffix: "to four vendors, one product line",
        suffix_es: "a cuatro proveedores, una sola línea",
        tone: 'critical',
      },
      {
        value: '10.4%',
        suffix: "of every peso IMSS spent on anyone",
        suffix_es: "de cada peso que el IMSS gastó en cualquiera",
        tone: 'data',
      },
      {
        value: '5,285',
        suffix: "tenders where the four meet",
        suffix_es: "licitaciones donde se encuentran los cuatro",
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
        title: "The Surface",
        title_es: "La superficie",
        subtitle: "Four named competitors, three of them at the top of the risk ladder",
        subtitle_es: "Cuatro competidoras con nombre, tres en la cima de la escalera de riesgo",
        prose: [
          "Grupo Fármacos Especializados carries a 0.99 risk score — the top of RUBLI's entire vendor ladder. It collected 133.4 billion pesos from the Mexican federal government between 2003 and 2025. It is not alone. Farmacéuticos Maypo scores 0.95 and took 88.0 billion. Laboratorios PISA scores 0.75 and took 55.6 billion. DIMM — Distribuidora Internacional de Medicamentos y Equipo Médico — scores 0.54 and took 51.6 billion. Combined: 328.6 billion pesos, and a four-vendor average of 0.81, squarely in RUBLI's critical tier.",
          "Three of these four sit at the very top of the platform's risk ladder. The score is a risk indicator, not a verdict — the model flags behavior consistent with collusive procurement, not proof of it. But four flagged distributors holding 328.6 billion pesos in a single product line is the signal that demands a closer look.",
          "The framework that produced these contracts mutated three times: IMSS-direct procurement under Calderón, INSABI/BIRMEX consolidation under AMLO, IMSS-Bienestar consolidated tendering under Sheinbaum. Three sets of rules. The same four recipients survived all of them. A market with four sellers can still be one captured organism. The next layers cut it open.",
        ],
        prose_es: [
          "Grupo Fármacos Especializados carga una calificación de riesgo de 0.99 — la cima de toda la escalera de proveedores de RUBLI. Recibió 133,400 millones de pesos del gobierno federal mexicano entre 2003 y 2025. No está sola. Farmacéuticos Maypo califica 0.95 y se llevó 88,000 millones. Laboratorios PISA califica 0.75 y se llevó 55,600 millones. DIMM — Distribuidora Internacional de Medicamentos y Equipo Médico — califica 0.54 y se llevó 51,600 millones. En conjunto: 328,600 millones de pesos, y un promedio de los cuatro de 0.81, de lleno en el nivel crítico de RUBLI.",
          "Tres de estas cuatro se ubican en la cima misma de la escalera de riesgo de la plataforma. La calificación es un indicador de riesgo, no un veredicto — el modelo señala conducta consistente con contratación colusiva, no su prueba. Pero cuatro distribuidoras señaladas que concentran 328,600 millones de pesos en una sola línea de producto es la lectura que obliga a mirar de cerca.",
          "El marco que produjo estos contratos mutó tres veces: contratación directa del IMSS bajo Calderón, consolidación vía INSABI/BIRMEX bajo AMLO, licitación consolidada IMSS-Bienestar bajo Sheinbaum. Tres conjuntos de reglas. Las mismas cuatro destinatarias sobrevivieron a todos. Un mercado con cuatro vendedoras puede seguir siendo un solo organismo capturado. Las capas siguientes lo abren.",
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
        title: "The Customer",
        title_es: "El cliente",
        subtitle: "One buyer underwrites up to three-quarters of each vendor",
        subtitle_es: "Un comprador sostiene hasta tres cuartas partes de cada proveedor",
        prose: [
          "One customer underwrites this entire market. The Instituto Mexicano del Seguro Social — Mexico's largest single-payer health institution — supplies 72.2 percent of Laboratorios PISA's lifetime federal revenue, 68.5 percent of DIMM's, 60.1 percent of Grupo Fármacos', and 50.5 percent of Maypo's. Four sellers, one buyer of consequence.",
          "Read it from the customer's side and the concentration sharpens. The four collected 202.9 billion pesos in IMSS contracting alone — 10.4 percent of every peso IMSS spent on any contractor in any sector across 23 years, against a 1,957-billion-peso lifetime baseline. Four pharmaceutical distributors take one peso in every ten. No competitive supplier base produces that shape on its own.",
          "The wall that keeps competitors out is written into law. Article 41 of the Ley de Adquisiciones lets an agency award directly on the basis of an existing supplier relationship — the clause that converts past dependence into present preference. Each contract makes the next one easier to award to the same four hands.",
        ],
        prose_es: [
          "Un solo cliente sostiene todo este mercado. El Instituto Mexicano del Seguro Social — la institución de salud de pagador único más grande de México — aporta el 72.2 por ciento de los ingresos federales de por vida de Laboratorios PISA, el 68.5 por ciento de los de DIMM, el 60.1 por ciento de los de Grupo Fármacos y el 50.5 por ciento de los de Maypo. Cuatro vendedoras, un solo comprador de peso.",
          "Léelo desde la cara del comprador y la concentración se afila. Los cuatro recaudaron 202,900 millones de pesos solo en contratación con el IMSS — el 10.4 por ciento de cada peso que el IMSS gastó en cualquier contratista, de cualquier sector, en 23 años, contra una base de 1,957,000 millones de pesos. Cuatro distribuidoras farmacéuticas se llevan uno de cada diez pesos. Ninguna base de proveedores competitiva produce esa forma por sí sola.",
          "El muro que mantiene fuera a los competidores está escrito en la ley. El Artículo 41 de la Ley de Adquisiciones permite adjudicar directamente con base en una relación de proveedor existente — la cláusula que convierte la dependencia pasada en preferencia presente. Cada contrato vuelve más fácil adjudicar el siguiente a las mismas cuatro manos.",
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
            "Four pharmaceutical vendors. One customer. One in every ten pesos IMSS spent on any contractor across 23 years.",
          quote_es:
            "Cuatro proveedores farmacéuticos. Un solo cliente. Uno de cada diez pesos que el IMSS gastó en cualquier contratista en 23 años.",
          stat: '10.4%',
          statLabel: "Big Four share of all federal IMSS contracting, 2003-2025",
          statLabel_es:
            "participación del Big Four en toda la contratación federal del IMSS, 2003-2025",
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
        title: "The Lattice",
        title_es: "El entramado",
        subtitle: "The four meet in 5,285 of the same procurement procedures",
        subtitle_es: "Los cuatro se encuentran en 5,285 de los mismos procedimientos",
        prose: [
          "Maypo and PISA appear together in 1,436 of the same procurement procedures — distinct tenders where both companies show up as bidders or contract recipients. Grupo Fármacos and Maypo share 1,258. Grupo Fármacos and DIMM, 810. Maypo and DIMM, 478. Grupo Fármacos and PISA, 257. PISA and DIMM, 46. In total: 5,285 shared procurement procedures across 23 years.",
          "Independent competitors chasing distinct contracts do not overlap this way. The shape is the structural signature of cover bidding — a small set of vendors who keep turning up at the same auctions while the winning name rotates and the underlying group holds constant. The OECD's 2012 Recommendation on Fighting Bid Rigging names repeated co-bidding among a small supplier set as one of the most reliable cartel detectors in public procurement.",
          "A second number sharpens it: 69 percent of every peso the four collected came through direct award, against an OECD ceiling of 25 to 30 percent. More than two in three pesos bypassed open competition. None of this proves a cartel on its own — it matches the pattern the OECD describes. If the lattice is the organism's shape, the next layer shows it breathing.",
        ],
        prose_es: [
          "Maypo y PISA aparecen juntas en 1,436 de los mismos procedimientos de contratación — licitaciones distintas donde ambas figuran como licitantes o destinatarias de contratos. Grupo Fármacos y Maypo comparten 1,258. Grupo Fármacos y DIMM, 810. Maypo y DIMM, 478. Grupo Fármacos y PISA, 257. PISA y DIMM, 46. En total: 5,285 procedimientos compartidos en 23 años.",
          "Competidores independientes que persiguen contratos distintos no se solapan así. La forma es la firma estructural de la cobertura cruzada — un grupo pequeño de proveedores que reaparece en las mismas subastas mientras el nombre ganador rota y el grupo de fondo se mantiene constante. La Recomendación de la OCDE de 2012 sobre el Combate a la Manipulación de Licitaciones nombra la co-licitación repetida entre un conjunto pequeño de proveedores como uno de los detectores de cártel más confiables en la contratación pública.",
          "Un segundo dato lo afila: el 69 por ciento de cada peso que recaudaron los cuatro llegó por adjudicación directa, contra un límite OCDE del 25 al 30 por ciento. Más de dos de cada tres pesos eludieron la competencia abierta. Nada de esto prueba un cártel por sí solo — coincide con el patrón que describe la OCDE. Si el entramado es la forma del organismo, la capa siguiente lo muestra respirando.",
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
            "Maypo and PISA appear in 1,436 of the same procurement procedures. The OECD calls repeated co-bidding among a small supplier set one of the most reliable cartel detectors.",
          quote_es:
            "Maypo y PISA aparecen en 1,436 de los mismos procedimientos. La OCDE llama a la co-licitación repetida entre pocos proveedores uno de los detectores de cártel más confiables.",
          stat: '5,285',
          statLabel: "shared bidding procedures among the Big Four (combined)",
          statLabel_es: "procedimientos de licitación compartidos entre el Big Four (combinados)",
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
        title: "The Pulse",
        title_es: "El pulso",
        subtitle: "Dominance passes vendor to vendor as the rules change",
        subtitle_es: "El dominio pasa de proveedor en proveedor mientras cambian las reglas",
        prose: [
          "In 2020, Grupo Fármacos went from 17.64 billion pesos the year before to zero — not reduced, not redirected to other clients, zero — and has stayed there every year since. DIMM collapsed 97 percent in the same year. Maypo was cut in half. The cause is documented: the AMLO administration dissolved IMSS-direct pharmaceutical procurement and consolidated buying through INSABI and BIRMEX, expressly to break what it called \"the cartel of distributors.\"",
          "Plotted across 2003-2025, the four series read as a relay. The early years belonged to PISA, peaking at 2.97 billion in 2009 — three times any rival — then going quiet, never crossing 3.5 billion a year through the 2010s. In its place rose Grupo Fármacos: 1.07 billion in 2007, climbing to a 19.94-billion peak in 2017, a single-year figure larger than the annual budget of several federal ministries. Maypo peaked at 10.05 billion and DIMM at 7.96 billion, both in 2018. Three of the four hit their all-time annual peaks inside a 12-month window.",
          "The spend never vanished after the 2020 cliff — it changed hands. PISA, quiet for a decade, resurged: 6.42 billion in 2020, then 2.56, 3.77, 0.13, 0.67 across the COVID years. Then in 2025, under Sheinbaum's IMSS-Bienestar consolidated tendering, PISA contracted 19.46 billion pesos in a single year — almost exactly Grupo Fármacos' 2017 peak. The architecture changed three times. The dominant vendor changed identity. The dependency did not.",
        ],
        prose_es: [
          "En 2020, Grupo Fármacos pasó de 17,640 millones de pesos el año anterior a cero — no reducido, no redirigido a otros clientes, cero — y ahí ha permanecido cada año desde entonces. DIMM colapsó un 97 por ciento el mismo año. Maypo se redujo a la mitad. La causa está documentada: la administración de AMLO disolvió la contratación farmacéutica directa del IMSS y consolidó las compras vía INSABI y BIRMEX, expresamente para romper lo que llamó \"el cártel de los distribuidores\".",
          "Graficados a lo largo de 2003-2025, los cuatro trazos se leen como un relevo. Los primeros años fueron de PISA, con un pico de 2,970 millones en 2009 — tres veces más que cualquier rival — y luego silencio, sin cruzar los 3,500 millones al año durante la década de 2010. En su lugar se alzó Grupo Fármacos: 1,070 millones en 2007, escalando a un pico de 19,940 millones en 2017, una cifra de un solo año mayor que el presupuesto anual de varios ministerios federales. Maypo alcanzó su pico en 10,050 millones y DIMM en 7,960 millones, ambos en 2018. Tres de los cuatro registraron sus máximos históricos en una ventana de 12 meses.",
          "El gasto nunca desapareció tras el precipicio de 2020 — cambió de manos. PISA, silenciosa una década, resurgió: 6,420 millones en 2020, luego 2,560, 3,770, 130, 670 a lo largo de los años de la COVID. Y en 2025, bajo la licitación consolidada de IMSS-Bienestar de Sheinbaum, PISA contrató 19,460 millones de pesos en un solo año — casi exactamente el pico de 2017 de Grupo Fármacos. La arquitectura cambió tres veces. El proveedor dominante cambió de identidad. La dependencia no.",
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
            eventLines: [
              {
                xIndex: 17,
                label: '2020 · INSABI/BIRMEX',
                label_es: '2020 · INSABI/BIRMEX',
                color: '#64748b',
              },
            ],
          },
        },
        pullquote: {
          quote:
            "From 17.64 billion in 2019 to zero in 2020. Not slowed. Not reduced. Zero. Then PISA — quiet for a decade — resurged to 19.46 billion.",
          quote_es:
            "De 17,640 millones en 2019 a cero en 2020. No frenado. No reducido. Cero. Y entonces PISA — silenciosa una década — resurgió a 19,460 millones.",
          stat: '19.46B MXN',
          statLabel: "PISA 2025 — matches Grupo Fármacos' all-time 2017 peak almost exactly",
          statLabel_es:
            "PISA 2025 — iguala casi exactamente el pico histórico de Grupo Fármacos en 2017",
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
        title: "The Void at the Core",
        title_es: "El vacío en el centro",
        subtitle: "Where oversight should be, the record is empty",
        subtitle_es: "Donde debería estar la fiscalización, el registro está vacío",
        prose: [
          "Grupo Fármacos Especializados took 133 billion pesos over 13 years at a 0.995 risk score and has never been the focus of a published ASF audit. No public investigation has named all four together. DIMM is virtually unknown to the public; Maypo surfaces in periodic procurement features but never a sustained inquiry; PISA, the most-covered of the four, drew no published regulatory response when its 2025 contracting exploded to 19.46 billion pesos.",
          "That 2025 spike demands immediate scrutiny. A distributor that had not crossed 3.5 billion pesos a year in over a decade booked 19.46 billion in one — including a 6.69-billion-peso consolidated medicine contract awarded in February 2025 (PROC-2025-IMSS-CONS-MED) and a 4.82-billion-peso direct-award contract for \"claves del sector salud\" in June 2025 (PROC-2025-IMSS-CLAVES). The direct-award status is a flag; the size is unprecedented; the vendor's prior absence from consolidated tendering is conspicuous.",
          "The instruments to examine all of this already exist. COFECE can open Art. 53 investigations into prácticas monopólicas absolutas under the Ley Federal de Competencia Económica. RUBLI supplies the detection: it classifies the four under its P1 pattern and places them in the ARIA queue at Tier 1, alongside 40 non-pharmaceutical P1 vendors awaiting the same scrutiny. The OECD/COFECE 2021 Competition Assessment of the Mexican Health Sector named pharmaceutical distribution the highest-risk sector for collusive tendering and recommended exactly this monitoring in Recommendations 3 through 5.",
          "What is missing is the will to convert flags into formal investigations. The specimen has been opened. Its structure is visible in the data, traceable in the bidding records, unconcealed in the financials. Until that void fills, the captured market will regenerate around whatever architecture Mexican health procurement adopts next — and no one with the authority to look has looked.",
        ],
        prose_es: [
          "Grupo Fármacos Especializados se llevó 133,000 millones de pesos en 13 años con una calificación de riesgo de 0.995 y nunca ha sido foco de una auditoría publicada de la ASF. Ninguna investigación pública ha nombrado a las cuatro juntas. DIMM es prácticamente desconocida para el público; Maypo aparece en reportajes esporádicos de contratación pero nunca como sujeto de una indagatoria sostenida; PISA, la más cubierta de las cuatro, no provocó respuesta regulatoria publicada cuando su contratación de 2025 explotó a 19,460 millones de pesos.",
          "Ese pico de 2025 exige escrutinio inmediato. Una distribuidora que no había cruzado los 3,500 millones de pesos al año en más de una década registró 19,460 millones en uno — incluyendo un contrato de medicamentos consolidados por 6,690 millones adjudicado en febrero de 2025 (PROC-2025-IMSS-CONS-MED) y un contrato de adjudicación directa por 4,820 millones para \"claves del sector salud\" en junio de 2025 (PROC-2025-IMSS-CLAVES). La adjudicación directa es una bandera; el tamaño es sin precedentes; la ausencia previa del proveedor en la licitación consolidada es llamativa.",
          "Los instrumentos para examinar todo esto ya existen. La COFECE puede abrir investigaciones del Art. 53 sobre prácticas monopólicas absolutas bajo la Ley Federal de Competencia Económica. RUBLI aporta la detección: clasifica a las cuatro bajo su patrón P1 y las coloca en la cola de ARIA en el Nivel 1, junto a 40 proveedores P1 no farmacéuticos a la espera del mismo escrutinio. La Evaluación de Competencia del Sector Salud OCDE/COFECE de 2021 nombró a la distribución farmacéutica el sector de mayor riesgo para licitación colusiva y recomendó exactamente este monitoreo en sus Recomendaciones 3 a 5.",
          "Lo que falta es la voluntad de convertir las señales en investigaciones formales. El espécimen ha sido abierto. Su estructura es visible en los datos, rastreable en los registros de licitación, sin ocultar en las finanzas. Hasta que ese vacío se llene, el mercado capturado se regenerará en torno a cualquier arquitectura que adopte después la contratación de salud mexicana — y nadie con la autoridad para mirar ha mirado.",
        ],
        pullquote: {
          quote:
            "133 billion pesos. A 0.995 risk score. Thirteen years. And not one published ASF audit.",
          quote_es:
            "133,000 millones de pesos. Una calificación de riesgo de 0.995. Trece años. Y ni una sola auditoría publicada de la ASF.",
          stat: '19.46B MXN',
          statLabel: "Laboratorios PISA, 2025 — under Sheinbaum's IMSS-Bienestar architecture",
          statLabel_es:
            "Laboratorios PISA, 2025 — bajo la arquitectura de IMSS-Bienestar de Sheinbaum",
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
    headline: "Now You See Competition",
    headline_es: "Ahora Ve Usted la Competencia",
    subheadline:
      "A competitive tender promises a room full of bidders. For fourteen straight years, more than 45% of Mexico's \"competitive\" federal procedures drew exactly one. The OECD flags any single-bid rate above 15% as a structural red flag; Mexico has run three to four times that since 2010. Here is how it works — and why every step is legal.",
    subheadline_es:
      "Una licitación competitiva promete una sala llena de oferentes. Durante catorce años seguidos, más del 45% de los procedimientos \"competitivos\" federales de México atrajeron exactamente a uno. La OCDE marca como bandera roja estructural cualquier tasa de oferta única superior al 15%; México ha operado entre tres y cuatro veces por encima de ese umbral desde 2010. Así funciona — y por qué cada paso es legal.",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 16,
    status: 'reporteado',
    leadStat: {
      value: '64.4%',
      label: "peak single-bidder rate",
      label_es: "pico de tasa de oferta única",
      sublabel: "2011 — 4.3x the OECD threshold",
      sublabel_es: "2011 — 4.3 veces el umbral OCDE",
      color: '#f59e0b',
    },
    kickerStats: [
      {
        value: '45%+',
        suffix: "single-bid for 14 straight years",
        suffix_es: "oferta única durante 14 años seguidos",
        tone: 'data',
      },
      {
        value: '800,000+',
        suffix: "competitive procedures, one bidder",
        suffix_es: "procedimientos competitivos, un oferente",
        tone: 'critical',
      },
      {
        value: '89.2%',
        suffix: "single-bid in civilian infrastructure",
        suffix_es: "oferta única en infraestructura civil",
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
        title: "One Bidder, 800,000 Times",
        title_es: "Un oferente, 800,000 veces",
        subtitle: "A competitive tender that draws a single bid is the rule, not the exception",
        subtitle_es: "Una licitación competitiva con una sola oferta es la regla, no la excepción",
        prose: [
          "More than 800,000 times over fourteen years, a Mexican federal procedure was run as competitive and drew exactly one bid. Each one met the legal requirement for competitive sourcing on paper. Each was a predetermined award dressed as an open contest.",
          "A competitive procedure is, by law, an open invitation: any qualified vendor may submit a bid. The theory is clean. Competition pushes prices down, lifts quality, and reveals what the government is actually paying for. The whole thing depends on one condition — that more than one bidder shows up.",
          "There is an international line for when too few show up. The OECD treats single-bid rates above 10 to 15 percent as a structural red flag warranting systematic review. The European Commission's ARACHNE risk tool, used across the EU to catch procurement fraud, marks any single-bidder procedure for mandatory individual review.",
          "Mexico has not been near that line since 2010. Across 23 years of federal data, from 2002 to 2024, the annual single-bid rate ran between 46 and 65 percent after 2010 — three to four times the OECD threshold, every year. It peaked at 64.4 percent in 2011 and 65.6 percent in 2014. In 2023, the most recent complete year, it was still 49.4 percent. At that level, the absence of competition is not an anomaly. It is standard practice.",
        ],
        prose_es: [
          "Más de 800,000 veces en catorce años, un procedimiento federal mexicano se corrió como competitivo y atrajo exactamente una oferta. Cada uno cumplió en el papel con el requisito legal de contratación competitiva. Cada uno fue una adjudicación predeterminada disfrazada de concurso abierto.",
          "Un procedimiento competitivo es, por ley, una invitación abierta: cualquier proveedor calificado puede presentar oferta. La teoría es impecable. La competencia baja precios, eleva la calidad y revela cuánto está pagando realmente el gobierno. Todo depende de una condición — que se presente más de un oferente.",
          "Existe una línea internacional para cuando se presentan muy pocos. La OCDE trata las tasas de oferta única por encima del 10 a 15 por ciento como bandera roja estructural que amerita revisión sistemática. La herramienta de riesgo ARACHNE de la Comisión Europea, usada en toda la UE para detectar fraude en contratación, marca cualquier procedimiento con un solo oferente para revisión individual obligatoria.",
          "México no se ha acercado a esa línea desde 2010. A lo largo de 23 años de datos federales, de 2002 a 2024, la tasa anual de oferta única corrió entre 46 y 65 por ciento después de 2010 — de tres a cuatro veces el umbral OCDE, cada año. Alcanzó su pico en 64.4 por ciento en 2011 y 65.6 por ciento en 2014. En 2023, el año completo más reciente, seguía en 49.4 por ciento. A ese nivel, la ausencia de competencia no es una anomalía. Es la práctica estándar.",
        ],
        pullquote: {
          quote:
            "Fourteen years. Every year above 45 percent. When \"competitive\" means a single bidder showed up, the word has lost its meaning.",
          quote_es:
            "Catorce años. Cada año por encima del 45 por ciento. Cuando \"competitivo\" significa que se presentó un solo oferente, la palabra ha perdido su sentido.",
          stat: '64.4%',
          statLabel: "peak single-bid rate (2011)",
          statLabel_es: "pico de tasa de oferta única (2011)",
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
        title: "The Reform That Made It Worse",
        title_es: "La reforma que lo empeoró",
        subtitle: "Electronic bidding promised transparency and locked the pattern in",
        subtitle_es: "La licitación electrónica prometió transparencia y fijó el patrón",
        prose: [
          "Electronic bidding was sold as transparency. It made single-bid worse. In 2010 and 2011, exactly when CompraNet became mandatory, the single-bid rate jumped from the high 30s to between 51 and 64 percent — and it never came back down.",
          "Before CompraNet, the rate ran around 27 to 37 percent in the early 2000s, already above the OECD line, on data that is admittedly less reliable for that period. Digitization should have opened access and lowered the rate. Instead it codified the pattern. From 2011 through 2018 the rate held in the 58 to 66 percent band across four presidential administrations, indifferent to who was in office.",
          "The 2019 drop to 46.5 percent looks like competition returning. It is not. It coincides with the early AMLO reforms and the centralization of pharmaceutical procurement, and it reflects contracts leaving competitive procedures altogether for direct adjudication — where the single-bid question never arises because no bidding happens at all.",
          "The OECD's 15 percent reference line on the chart below sits in territory Mexico has not visited since before CompraNet records began. The curve approaches it once, in 2019, then climbs again.",
        ],
        prose_es: [
          "La licitación electrónica se vendió como transparencia. Empeoró la oferta única. En 2010 y 2011, justo cuando CompraNet se volvió obligatorio, la tasa saltó de los altos 30 a entre 51 y 64 por ciento — y nunca volvió a bajar.",
          "Antes de CompraNet, la tasa corría alrededor de 27 a 37 por ciento a inicios de los 2000, ya por encima de la línea OCDE, con datos que para ese periodo son reconocidamente menos confiables. La digitalización debió abrir el acceso y bajar la tasa. En cambio, codificó el patrón. De 2011 a 2018 la tasa se mantuvo en la banda de 58 a 66 por ciento a través de cuatro administraciones presidenciales, indiferente a quién gobernara.",
          "La caída de 2019 al 46.5 por ciento parece un retorno de la competencia. No lo es. Coincide con las reformas iniciales de AMLO y la centralización de la contratación farmacéutica, y refleja contratos que salieron por completo de los procedimientos competitivos hacia la adjudicación directa — donde la pregunta de oferta única nunca surge porque no se licita.",
          "La línea de referencia OCDE del 15 por ciento en la gráfica de abajo se ubica en un territorio que México no ha visitado desde antes de que comenzaran los registros de CompraNet. La curva se le acerca una vez, en 2019, y vuelve a trepar.",
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
            "Electronic bidding in 2010 should have lowered the single-bid rate. It raised it. The move sold as transparency locked the pattern in.",
          quote_es:
            "La licitación electrónica en 2010 debió bajar la tasa de oferta única. La subió. El movimiento vendido como transparencia fijó el patrón.",
          stat: '2010',
          statLabel: "year CompraNet became mandatory",
          statLabel_es: "año en que CompraNet se volvió obligatorio",
        },
        sources: [
          'DOF. (2012). Reformas a la Ley de Adquisiciones para la obligatoriedad de CompraNet.',
          'RUBLI single_bid analysis by year, 2002-2024. April 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: "The Only Bidder Who Keeps Winning",
        title_es: "El único oferente que sigue ganando",
        subtitle: "Six welfare-voucher operators won 6,851 \"competitive\" tenders as the lone bid",
        subtitle_es: "Seis operadores de vales ganaron 6,851 licitaciones \"competitivas\" como única oferta",
        prose: [
          "Edenred México won 1,679 \"competitive\" federal tenders as the only bidder, worth 23.78 billion pesos. TOKA Internacional — named in The Era of Risk as the dominant AMLO-era food-voucher vendor — won 1,290 as the lone bid, worth 36.99 billion. Efectivale won 2,210 across two corporate identities. Rank every federal vendor by single-bid wins and the top of the list is one coherent cluster: welfare-program voucher operators.",
          "The mechanism is structural. Voucher operators — Edenred, TOKA, Efectivale, Sodexo — run incompatible payment networks. Once a federal program adopts one, switching costs effectively bar competitors from the next tender. The procedure runs as competitive on paper while the incumbent is the only bidder who can make it work.",
          "Adjacent markets show the same shape with different mechanics: industrial gas (PRAXAIR; INFRA, which is a structural false-positive given genuinely limited hospital-gas suppliers), telecommunications (Teléfonos de México, 459 wins), postal logistics (Servicio Postal, Estafeta), and specific medical supply categories (Productos Hospitalarios, 511 wins). The Cleveland chart below pairs each vendor's single-bid wins against its total wins — Efectivale S.A. is captive at 92 percent, while government-owned Liconsa runs a diversified book at 17 percent.",
          "The scale is the point. The combined single-bid universe is 504,903 contracts and 5.4 trillion pesos across 23 years — more than three times the entire AMLO-era federal procurement spend. The average risk score there is 0.28, below the high-risk threshold, because not every single-bid contract is fraudulent. The finding is not that each one is fraud. It is that this is the standard operating mode of Mexican federal procurement. These vendors match the pattern; none is asserted here to be criminal.",
        ],
        prose_es: [
          "Edenred México ganó 1,679 licitaciones federales \"competitivas\" como único oferente, por 23.78 mil millones de pesos. TOKA Internacional — nombrada en El Sexenio del Riesgo como el proveedor dominante de vales de comida del periodo AMLO — ganó 1,290 como única oferta, por 36.99 mil millones. Efectivale ganó 2,210 a través de dos identidades corporativas. Ordene a cada proveedor federal por victorias de oferta única y la parte alta de la lista es un solo bloque coherente: operadores de vales de programas sociales.",
          "El mecanismo es estructural. Los operadores de vales — Edenred, TOKA, Efectivale, Sodexo — manejan redes de pago incompatibles. Una vez que un programa federal adopta a uno, los costos de cambio excluyen efectivamente a los competidores de la siguiente licitación. El procedimiento corre como competitivo en el papel mientras el proveedor existente es el único que puede hacerlo funcionar.",
          "Mercados adyacentes muestran la misma forma con mecánica distinta: gas industrial (PRAXAIR; INFRA, que es un falso positivo estructural dada la oferta genuinamente limitada de gas hospitalario), telecomunicaciones (Teléfonos de México, 459 victorias), logística postal (Servicio Postal, Estafeta) y categorías específicas de insumo médico (Productos Hospitalarios, 511 victorias). La gráfica de abajo enfrenta las victorias de oferta única de cada proveedor contra sus victorias totales — Efectivale S.A. es cautivo al 92 por ciento, mientras la paraestatal Liconsa opera una cartera diversificada al 17 por ciento.",
          "La escala es el punto. El universo combinado de oferta única es de 504,903 contratos y 5.4 billones de pesos en 23 años — más de tres veces el gasto federal completo de la era AMLO. La calificación de riesgo promedio ahí es 0.28, debajo del umbral de alto riesgo, porque no todo contrato de oferta única es fraudulento. El hallazgo no es que cada uno sea fraude. Es que este es el modo de operación estándar de la contratación federal mexicana. Estos proveedores coinciden con el patrón; aquí no se afirma que ninguno sea criminal.",
        ],
        chartConfig: {
          type: 'editorial-cleveland-pair',
          title: 'The Captives: Single-Bid Wins as a Share of Each Vendor\'s Total',
          title_es: 'Los cautivos: victorias de oferta única como porción del total de cada proveedor',
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
            trackLabel: "the vendor's total contract wins",
            trackLabel_es: 'las victorias totales del proveedor',
            annotation:
              'Each bar is filled to the share of a vendor\'s total contract wins that came as the only bidder. Efectivale S.A. is structurally captive at 92%; Liconsa and PRAXAIR run diversified books at 17–21%. The dashed line marks the average across the twelve.',
            annotation_es:
              'Cada barra se llena hasta la porción de las victorias totales del proveedor que llegaron como único oferente. Efectivale S.A. es estructuralmente cautivo al 92%; Liconsa y PRAXAIR operan carteras diversificadas al 17–21%. La línea punteada marca el promedio de los doce.',
          },
        },
        pullquote: {
          quote:
            "Six related vendors. 6,851 \"competitive\" procedures won as the only bidder. 91.7 billion pesos. The welfare-voucher market is structurally non-competitive.",
          quote_es:
            "Seis proveedores relacionados. 6,851 procedimientos \"competitivos\" ganados como único oferente. 91.7 mil millones de pesos. El mercado de vales del bienestar es estructuralmente no competitivo.",
          stat: '6,851',
          statLabel: "single-bid wins by the welfare-voucher cluster",
          statLabel_es: "victorias en oferta única del cluster de vales del bienestar",
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
        title: "Nine of Ten Road Tenders",
        title_es: "Nueve de cada diez licitaciones de obra",
        subtitle: "Civilian infrastructure runs single-bid at 89.2% — six times the OECD line",
        subtitle_es: "La infraestructura civil corre oferta única al 89.2% — seis veces la línea OCDE",
        prose: [
          "In civilian infrastructure, 169,434 of 189,855 competitive tenders drew a single bid — 89.2 percent, six times the OECD red-flag threshold. Roads, water systems, drainage, and urban works are not specialized equipment with one supplier. They are markets with hundreds of qualified Mexican construction firms. At 89.2 percent, this is not market scarcity. It is market allocation.",
          "The national 47-to-49 percent rate hides that spread. Below infrastructure: Medio Ambiente at 82.3 percent (52,559 of 63,885), Trabajo at 74.9 percent (11,818 of 15,784), Otros at 70.7 percent (3,570 of 5,052), Hacienda at 59.0 percent (20,454 of 34,659, pulled up by the voucher cluster), Energía at 56.7 percent (76,028 of 134,052, where Pemex and CFE genuinely face thin supplier markets), Tecnología at 49.1 percent, Gobernación at 48.2 percent, Agricultura at 47.5 percent, Educación at 44.1 percent. At the floor, Defensa at 22.8 percent and Salud at just 19.3 percent (75,867 of 394,009).",
          "Buyer concentration is the tell. Where procurement concentrates in a few large institutional buyers — IMSS, SEDENA — aggregated tenders force competition and the rate stays low. Where it fragments across many small units — state infrastructure, rural water systems, federal districts — each one runs on its own established vendor relationships and the rate climbs.",
          "Infrastructure at 89.2 percent is the most consequential finding, because the COVID-era stimulus, the AMLO national projects, and the post-Sheinbaum decentralized water and roads programs all flow through it. Across more than a decade of stimulus and megaprojects, the vast majority of \"competitively\" awarded contracts had no competition at all.",
        ],
        prose_es: [
          "En infraestructura civil, 169,434 de 189,855 licitaciones competitivas atrajeron una sola oferta — 89.2 por ciento, seis veces el umbral de bandera roja OCDE. Carreteras, sistemas de agua, drenaje y obra urbana no son equipo especializado con un solo suministrador. Son mercados con cientos de constructoras mexicanas calificadas. Al 89.2 por ciento, esto no es escasez de mercado. Es asignación de mercado.",
          "La tasa nacional de 47 a 49 por ciento oculta esa dispersión. Debajo de infraestructura: Medio Ambiente con 82.3 por ciento (52,559 de 63,885), Trabajo con 74.9 por ciento (11,818 de 15,784), Otros con 70.7 por ciento (3,570 de 5,052), Hacienda con 59.0 por ciento (20,454 de 34,659, jalada hacia arriba por el cluster de vales), Energía con 56.7 por ciento (76,028 de 134,052, donde Pemex y CFE enfrentan mercados de suministradores genuinamente delgados), Tecnología con 49.1 por ciento, Gobernación con 48.2 por ciento, Agricultura con 47.5 por ciento, Educación con 44.1 por ciento. En el piso, Defensa con 22.8 por ciento y Salud con apenas 19.3 por ciento (75,867 de 394,009).",
          "La concentración de compradores es la señal. Donde la contratación se concentra en unos pocos grandes compradores institucionales — IMSS, SEDENA — las licitaciones agregadas fuerzan la competencia y la tasa se mantiene baja. Donde se fragmenta entre muchas unidades pequeñas — infraestructura estatal, sistemas de agua rurales, distritos federales — cada una opera con sus propias relaciones de proveedor establecidas y la tasa trepa.",
          "La infraestructura al 89.2 por ciento es el hallazgo más consecuente, porque el estímulo de la era COVID, los proyectos nacionales de AMLO y los programas descentralizados de agua y carreteras pos-Sheinbaum fluyen todos por ahí. A lo largo de más de una década de estímulo y grandes proyectos, la gran mayoría de los contratos adjudicados \"competitivamente\" no tuvieron competencia alguna.",
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
            riser: {
              index: 0,
              multipleLabel: '≈6×',
              multipleLabel_es: '≈6×',
              color: '#dc2626',
            },
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
            "Civilian infrastructure runs at 89 percent single-bid. Out of every ten \"competitive\" tenders for roads, water, drainage, and urban works, nine arrive with only one bidder.",
          quote_es:
            "La infraestructura civil opera al 89 por ciento de oferta única. De cada diez licitaciones \"competitivas\" para carreteras, agua, drenaje y obra urbana, nueve llegan con un solo oferente.",
          stat: '6 of 12',
          statLabel: "sectors above 50% single-bid · all twelve above the OECD 15% threshold",
          statLabel_es:
            "sectores arriba del 50% oferta única · los doce arriba del umbral OCDE 15%",
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
        title: "The Trick Nobody Can Stop",
        title_es: "El truco que nadie puede detener",
        subtitle: "Every step is legal, which is exactly why no institution can touch it",
        subtitle_es: "Cada paso es legal, y por eso justamente ninguna institución puede tocarlo",
        prose: [
          "Nobody breaks a rule when only one bidder shows up. The official ran the tender. The vendor filed a bid. The award followed procedure. Every individual action is defensible. The corruption lives in the pattern across 800,000 procedures, not in any single transaction — and that is exactly what makes it unstoppable.",
          "It also defeats every accountability institution by design. The ASF audits individual contracts; it produces no systemic findings on aggregated bidding patterns. The SFP investigates individual officials, not industry-wide cartels. COFECE pursues anticompetitive conduct but limits its procurement cases to clear-cut cartel documentation, not behavioral pattern evidence. The structural failure RUBLI's data shows has no institution assigned to it.",
          "The single-bid rate is not a secret. Transparencia Mexicana and IMCO have reported it for years. What is missing is follow-through: naming the vendor clusters in the P5 cover-bidding pattern, pulling their financial records, prosecuting documented co-bidding, and imposing consequences on officials who accept single-bid outcomes as normal. That requires either a new institutional capacity for structural procurement patterns or the redirection of COFECE and SFP resources toward the analysis RUBLI already performs. Neither has happened.",
          "Until consequences exist, reform means procedural tweaks, not structural change. The rate will keep sitting three to four times above the OECD threshold, year after year — the same trick, performed for an audience that already knows how it is done.",
        ],
        prose_es: [
          "Nadie rompe una regla cuando solo se presenta un oferente. El funcionario corrió la licitación. El proveedor presentó una oferta. La adjudicación se hizo conforme al procedimiento. Cada acción individual es defendible. La corrupción vive en el patrón a lo largo de 800,000 procedimientos, no en una sola transacción — y eso es justo lo que la vuelve imparable.",
          "También derrota por diseño a cada institución de fiscalización. La ASF audita contratos individuales; no produce hallazgos sistémicos sobre patrones agregados de licitación. La SFP investiga a funcionarios individuales, no cárteles a escala industrial. La COFECE persigue conducta anticompetitiva pero limita sus casos de contratación a documentación clara de cártel, no a evidencia conductual por patrón. La falla estructural que muestran los datos de RUBLI no tiene institución asignada.",
          "La tasa de oferta única no es un secreto. Transparencia Mexicana e IMCO la han reportado durante años. Lo que falta es seguimiento: nombrar los clusters de proveedores en el patrón P5 de oferta de cobertura, solicitar sus registros financieros, procesar la co-licitación documentada e imponer consecuencias a los funcionarios que aceptan los resultados de oferta única como normales. Eso requiere o una nueva capacidad institucional para patrones estructurales de contratación, o la redirección de recursos de la COFECE y la SFP hacia el análisis que RUBLI ya realiza. Ninguna ha ocurrido.",
          "Hasta que existan consecuencias, la reforma significa ajustes procedimentales, no cambio estructural. La tasa seguirá ubicada de tres a cuatro veces por encima del umbral OCDE, año tras año — el mismo truco, representado para un público que ya sabe cómo se hace.",
        ],
        pullquote: {
          quote:
            "Nobody is individually breaking the rules. The corruption lies in the pattern across 800,000 procedures, not in any single transaction.",
          quote_es:
            "Nadie rompe individualmente las reglas. La corrupción reside en el patrón a lo largo de 800,000 procedimientos, no en una sola transacción.",
          stat: '800,000+',
          statLabel: "single-bid competitive procedures 2010-2024",
          statLabel_es: "procedimientos competitivos de oferta única 2010-2024",
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
    headline: "The Building That Capture Built",
    headline_es: "El edificio que construyó la captura",
    subheadline:
      "At one address — IMSS, Mexico's social-security institute — RUBLI's algorithm traces a capture pattern through 401.8 billion pesos and 392,579 contracts. It is the worst single case in the dataset, and only the start. The same pattern flags 15,923 vendors nationwide; at the top seven institutions it runs through 1.06 trillion pesos; beneath them, intermediary chains carry another 526 billion. None of it is illegal. That is the problem.",
    subheadline_es:
      "En una sola dirección — el IMSS — el algoritmo de RUBLI rastrea un patrón de captura a través de 401.8 mil millones de pesos y 392,579 contratos. Es el peor caso individual del dataset, y apenas el comienzo. El mismo patrón marca a 15,923 proveedores en todo el país; en las siete instituciones más grandes corre por 1.06 billones de pesos; debajo de ellas, las cadenas de intermediarios cargan otros 526 mil millones. Nada de esto es ilegal. Ese es el problema.",
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 15,
    status: 'auditado',
    leadStat: {
      value: '15,923',
      label: "P6 capture-pattern vendors",
      label_es: "proveedores con patrón de captura P6",
      sublabel: "526.8B MXN in P3 intermediary chains beneath them",
      sublabel_es: "526.8 mil millones en cadenas de intermediarios P3 debajo",
      color: '#8b5cf6',
    },
    kickerStats: [
      {
        value: '401.8B',
        suffix: "MXN in P6-pattern contracting at IMSS alone",
        suffix_es: "MXN en contratación con patrón P6 solo en el IMSS",
        tone: 'data',
      },
      {
        value: '1.06T',
        suffix: "MXN across the top seven institutions",
        suffix_es: "MXN en las siete principales instituciones",
        tone: 'critical',
      },
      {
        value: '18,897',
        suffix: "P3 + P6 vendors awaiting pattern-based investigation",
        suffix_es: "proveedores P3 + P6 a la espera de investigación por patrón",
        tone: 'critical',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: "The Worst Address",
        title_es: "La peor dirección",
        subtitle: "IMSS: 3,415 flagged vendors, 401.8 billion pesos, one pattern",
        subtitle_es: "IMSS: 3,415 proveedores marcados, 401.8 mil millones de pesos, un patrón",
        prose: [
          "The Instituto Mexicano del Seguro Social is the single worst case in RUBLI's entire dataset. Its procurement carries 3,415 vendors flagged for capture-pattern behavior, 401.8 billion pesos of contracting, and 392,579 individual contracts. No other institution in the country comes close.",
          "Capture is not a one-time bribe. It is a vendor relationship that has become load-bearing — embedded in an institution's procurement so deeply that alternatives stop being considered. Officials award to the \"reliable\" supplier; prices drift up because nothing pressures them down; over years the arrangement hardens into something indistinguishable from policy. Remove it and the institution has to re-engineer how it buys.",
          "RUBLI's Pattern 6 reads that signature. It measures how concentrated a vendor's contracts are at one institution, how that concentration grows over time, and whether the institution has stopped awarding to competitors in the category. P6 is the model's largest pattern — 15,923 vendors, the broadest band of structural procurement risk in the dataset. It is a risk indicator of behavior consistent with capture. It flags a relationship; it does not prove a crime.",
          "The auditors have already stood at this door. The Auditoría Superior de la Federación's 2022 Cuenta Pública review found IMSS pharmaceutical procurement showed \"patterns of concentration inconsistent with market competition\" in 15 specific categories. RUBLI quantifies at scale what the inspector flagged by hand.",
        ],
        prose_es: [
          "El Instituto Mexicano del Seguro Social es el peor caso individual de todo el dataset de RUBLI. Su contratación carga 3,415 proveedores marcados por comportamiento con patrón de captura, 401.8 mil millones de pesos contratados y 392,579 contratos individuales. Ninguna otra institución del país se le acerca.",
          "La captura no es un soborno aislado. Es una relación con un proveedor que se volvió estructural — incrustada en las compras de una institución a tal grado que las alternativas dejan de considerarse. Los funcionarios adjudican al proveedor \"confiable\"; los precios suben porque nada los presiona a la baja; con los años el arreglo se endurece hasta volverse indistinguible de una política. Retírelo y la institución tiene que rediseñar la forma en que compra.",
          "El Patrón 6 de RUBLI lee esa firma. Mide qué tan concentrados están los contratos de un proveedor en una sola institución, cómo crece esa concentración con el tiempo, y si la institución dejó de adjudicar a competidores en la categoría. P6 es el patrón más grande del modelo — 15,923 proveedores, la banda más amplia de riesgo estructural de contratación en el dataset. Es un indicador de riesgo de comportamiento consistente con la captura. Marca una relación; no prueba un delito.",
          "Los auditores ya estuvieron en esta puerta. La revisión de la Cuenta Pública 2022 de la Auditoría Superior de la Federación encontró que la contratación farmacéutica del IMSS mostraba \"patrones de concentración inconsistentes con la competencia de mercado\" en 15 categorías específicas. RUBLI cuantifica a escala lo que el auditor marcó a mano.",
        ],
        pullquote: {
          quote:
            "Capture is not a one-time bribe. It is a relationship that has become load-bearing — embedded so deeply that alternatives stop being considered. At IMSS it runs through 401.8 billion pesos.",
          quote_es:
            "La captura no es un soborno aislado. Es una relación que se volvió estructural — incrustada tan profundo que las alternativas dejan de considerarse. En el IMSS corre por 401.8 mil millones de pesos.",
          stat: '401.8B MXN',
          statLabel: "P6 capture-pattern contracting at IMSS alone",
          statLabel_es: "contratación con patrón de captura P6 solo en el IMSS",
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
        title: "1.06 Trillion Pesos",
        title_es: "1.06 billones de pesos",
        subtitle: "IMSS is one of seven institutions running the same pattern",
        subtitle_es: "El IMSS es una de siete instituciones que corren el mismo patrón",
        prose: [
          "Seven institutions concentrate the capture pattern, and together they move 1.06 trillion pesos through it — roughly twelve percent of an entire annual federal budget. IMSS leads at 401.8 billion across 3,415 vendors and 392,579 contracts. CFE follows with 240.7 billion across 2,600 vendors and 112,000 contracts. PEMEX moves 199.8 billion through just 284 vendors and 7,169 contracts — the smallest cohort in the set but the largest average ticket. Then SCT/SICT (71.6 billion, 412 vendors), DICONSA (70.0 billion, 495 vendors), ISSSTE (50.1 billion, 841 vendors), and CONAGUA (28.2 billion, 281 vendors).",
          "Capture is rarely there at the start, which is why audits keep missing it. A P6 vendor typically begins as a legitimate competitive winner. Year one looks normal. By year three, direct-award frequency is climbing. By year five, the vendor takes 70 to 90 percent of the relevant category through direct adjudication at the same institution.",
          "Every contract in that arc is individually defensible — the vendor has a track record, the official can cite past performance, the cost of running a fresh competitive process is real. The distortion lives nowhere in a single award. It lives in the pattern across hundreds of contracts over years. Health alone — IMSS plus ISSSTE — accounts for 451.9 billion pesos; energy — CFE plus PEMEX — for 440.5 billion.",
        ],
        prose_es: [
          "Siete instituciones concentran el patrón de captura, y juntas mueven 1.06 billones de pesos por él — cerca del doce por ciento de un presupuesto federal anual completo. El IMSS encabeza con 401.8 mil millones en 3,415 proveedores y 392,579 contratos. La CFE sigue con 240.7 mil millones en 2,600 proveedores y 112,000 contratos. PEMEX mueve 199.8 mil millones por apenas 284 proveedores y 7,169 contratos — la cohorte más pequeña del grupo pero con el ticket promedio más alto. Luego SCT/SICT (71.6 mil millones, 412 proveedores), DICONSA (70.0 mil millones, 495 proveedores), el ISSSTE (50.1 mil millones, 841 proveedores) y la CONAGUA (28.2 mil millones, 281 proveedores).",
          "La captura rara vez está ahí desde el inicio, y por eso las auditorías la siguen pasando por alto. Un proveedor P6 suele empezar como ganador competitivo legítimo. El año uno se ve normal. Para el año tres, la frecuencia de adjudicación directa va al alza. Para el año cinco, el proveedor se lleva entre 70 y 90 por ciento de la categoría relevante por adjudicación directa en la misma institución.",
          "Cada contrato de ese arco es defendible por separado — el proveedor tiene historial, el funcionario invoca el desempeño pasado, el costo de correr un nuevo proceso competitivo es real. La distorsión no vive en ninguna adjudicación individual. Vive en el patrón a lo largo de cientos de contratos durante años. Solo salud — IMSS más ISSSTE — suma 451.9 mil millones de pesos; energía — CFE más PEMEX — suma 440.5 mil millones.",
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
                annotation: '2.6× the avg buyer · 3,415 vendors',
                annotation_es: '2.6× el comprador promedio · 3,415 prov.',
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
            referenceLine: {
              value: 151.7,
              label: 'avg of the 7 · 151.7B',
              label_es: 'prom. de las 7 · 151.7B',
              color: '#64748b',
            },
            unit: 'B MXN',
            annotation:
              "Each bar shows the total value of P6-pattern contracting where the listed institution is the vendor's primary buyer. Dashed line = the seven-institution average (151.7B); IMSS runs 2.6× it. Health institutions (IMSS, ISSSTE — red highlight) account for 451.9B MXN; energy (CFE, PEMEX) accounts for 440.5B MXN. The seven institutions sum to 1.06 trillion pesos.",
            annotation_es:
              'Cada barra muestra el valor total de contratación con patrón P6 donde la institución listada es el comprador principal del proveedor. La línea punteada = el promedio de las siete instituciones (151.7 mil M); el IMSS corre 2.6× eso. Las instituciones de salud (IMSS, ISSSTE — resaltadas en rojo) suman 451.9 mil millones; energía (CFE, PEMEX) suma 440.5 mil millones. Las siete instituciones suman 1.06 billones de pesos.',
          },
        },
        pullquote: {
          quote:
            "Each individual contract appears defensible. The distortion lives in the pattern — across hundreds of contracts, across years, across entire institutions.",
          quote_es:
            "Cada contrato individual parece defendible. La distorsión vive en el patrón — a lo largo de cientos de contratos, de años, de instituciones enteras.",
          stat: '1.06T MXN',
          statLabel: "P6 contracting at the top seven Mexican federal institutions",
          statLabel_es:
            "contratación P6 en las siete principales instituciones federales mexicanas",
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
        title: "The Toll Booths",
        title_es: "Las casetas de cobro",
        subtitle: "Infrastructure routes 19.6% of its at-risk spend through intermediaries",
        subtitle_es: "Infraestructura canaliza 19.6% de su gasto en riesgo por intermediarios",
        prose: [
          "Beneath the capture pattern sits a second one, and it has a sharper edge. RUBLI's Pattern 3 flags intermediaries — vendors that win a contract and subcontract the actual work, taking a fee at each tier. The model identifies 2,974 P3 vendors, concentrated in infrastructure (179.5 billion pesos, 1,128 vendors), energy (130.6 billion, 463 vendors), and health (104.2 billion, 476 vendors).",
          "These are the sectors with the largest contracts, the thinnest oversight, and the most technical cover. Real specialized complexity hides fraudulent layering. In infrastructure the intermediary subcontracts civil works to actual builders and keeps 15 to 30 percent overhead — a highway uses dozens of trades, so the markup reads as routine. In energy it marks up imported equipment across the chain; in health it collects margins distributing medicine from a handful of real manufacturers. Hacienda (40.9 billion), education (19.1 billion), agriculture (18.8 billion), gobernación (17.8 billion), and defense (15.9 billion) fill out the rest.",
          "Raw value understates the damage. Measured as a share of each sector's high-risk spend, infrastructure routes 19.6 percent of its at-risk footprint through P3 intermediaries — roughly three times the share in health (6.0 percent) or Hacienda (6.5 percent). The chart sorts on that ratio, so the most distorted sector reads at the top.",
        ],
        prose_es: [
          "Debajo del patrón de captura hay un segundo patrón, y tiene un filo más afilado. El Patrón 3 de RUBLI marca a los intermediarios — proveedores que ganan un contrato y subcontratan el trabajo real, cobrando una comisión en cada nivel. El modelo identifica 2,974 proveedores P3, concentrados en infraestructura (179.5 mil millones de pesos, 1,128 proveedores), energía (130.6 mil millones, 463 proveedores) y salud (104.2 mil millones, 476 proveedores).",
          "Son los sectores con los contratos más grandes, la fiscalización más delgada y la mayor cobertura técnica. La complejidad especializada real esconde la estratificación fraudulenta. En infraestructura el intermediario subcontrata la obra civil a constructoras reales y se queda con 15 a 30 por ciento de sobrecarga — una carretera usa decenas de oficios, así que el margen parece rutina. En energía marca el equipo importado a lo largo de la cadena; en salud cobra márgenes distribuyendo medicina de un puñado de fabricantes reales. Hacienda (40.9 mil millones), educación (19.1 mil millones), agricultura (18.8 mil millones), gobernación (17.8 mil millones) y defensa (15.9 mil millones) completan el resto.",
          "El valor bruto subestima el daño. Medido como porción del gasto de alto riesgo de cada sector, infraestructura canaliza 19.6 por ciento de su huella en riesgo por intermediarios P3 — cerca del triple de la porción de salud (6.0 por ciento) o Hacienda (6.5 por ciento). El gráfico se ordena por esa razón, de modo que el sector más distorsionado se lee arriba.",
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
            sortBy: 'ratio',
            trackLabel: "sector's high/critical-risk spend",
            trackLabel_es: 'gasto en riesgo alto/crítico del sector',
            annotation:
              "Each bar is filled to the share of that sector's high/critical-risk spend that runs through P3 intermediary structures. Infrastructure fills to 19.6% — roughly three times the share in Health (6.0%) or Hacienda (6.5%). The dashed line marks the eight-sector average.",
            annotation_es:
              'Cada barra se llena hasta la porción del gasto en riesgo alto/crítico del sector que corre por estructuras de intermediación P3. Infraestructura se llena al 19.6% — cerca del triple de la porción en Salud (6.0%) o Hacienda (6.5%). La línea punteada marca el promedio de los ocho sectores.',
          },
        },
        pullquote: {
          quote:
            "Infrastructure alone moves 179 billion pesos through intermediary structures. The overhead — if OECD research holds — runs 27 to 54 billion pesos.",
          quote_es:
            "Solo infraestructura mueve 179 mil millones de pesos por estructuras de intermediación. El sobrecosto — si la investigación de la OCDE aplica — corre entre 27 y 54 mil millones de pesos.",
          stat: '179.5B MXN',
          statLabel: "P3 intermediary contracts in infraestructura",
          statLabel_es: "contratos intermediarios P3 en infraestructura",
        },
        sources: [
          'RUBLI P3 sector analysis, April 2026.',
          'OECD. (2023). Public Procurement Performance Report. Chapter 6: subcontracting and price markups.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: "Mexico Already Prosecuted This",
        title_es: "México ya procesó esto",
        subtitle: "La Estafa Maestra was the blueprint. The successors are still contracting.",
        subtitle_es: "La Estafa Maestra fue el plano. Los sucesores siguen contratando.",
        prose: [
          "La Estafa Maestra moved 7.67 billion pesos through an intermediary structure in two years — and Mexico convicted on it. Between 2013 and 2014, federal agencies contracted public universities, which subcontracted phantom companies, which returned money to officials at the originating agencies. The 2017 parliamentary investigation and the MCCI/Animal Político reporting that year documented the scheme in detail.",
          "The exploit was structural. Procurement law carried a carve-out exempting contracts with public universities from competitive bidding, on the fiction that universities are trusted public institutions. The universities became the intermediary layer between the law and a shadow market. Below them sat phantom companies whose RFCs matched nothing in the Registro Federal de Contribuyentes — paper entities built to receive money and pass it on.",
          "RUBLI's ground truth includes La Estafa Maestra; its linked vendors carry risk scores averaging 0.55 to 0.65 — elevated but not at the ceiling, because the thin contract counts of phantom firms limit what the behavioral model can see. The mechanism, though, is unmistakable. The 2,974 P3 vendors in today's queue are the structural successors of that architecture: different entities, different institutions, the same paid pass-through between budget and delivery.",
          "And the design carries a price. The OECD's 2023 review finds intermediary chains add 15 to 30 percent overhead without adding delivery value. Applied to RUBLI's 526.8 billion pesos of P3 contracting, the implied overhead is 79 to 158 billion pesos — at the low end, roughly the annual budget of the federal health-infrastructure program. La Estafa Maestra ran 7.67 billion over two years. Its successors are running 526 billion now.",
        ],
        prose_es: [
          "La Estafa Maestra movió 7.67 mil millones de pesos por una estructura de intermediación en dos años — y México llegó a sentencias por ella. Entre 2013 y 2014, dependencias federales contrataron con universidades públicas, que subcontrataban empresas fantasma, que devolvían el dinero a funcionarios de las dependencias originales. La investigación parlamentaria de 2017 y el reportaje de MCCI/Animal Político de ese año documentaron el esquema a detalle.",
          "El exploit era estructural. La ley de adquisiciones tenía una excepción que eximía de licitación competitiva los contratos con universidades públicas, bajo la ficción de que las universidades son instituciones públicas confiables. Las universidades se volvieron la capa intermediaria entre la ley y un mercado en la sombra. Debajo estaban las empresas fantasma cuyos RFC no coincidían con nada en el Registro Federal de Contribuyentes — entidades de papel hechas para recibir dinero y pasarlo.",
          "La verdad-base de RUBLI incluye La Estafa Maestra; sus proveedores vinculados promedian calificaciones de riesgo de 0.55 a 0.65 — elevadas pero no en el techo, porque las cuentas raquíticas de contratos de las empresas fantasma limitan lo que el modelo conductual alcanza a ver. El mecanismo, sin embargo, es inconfundible. Los 2,974 proveedores P3 de la cola de hoy son los sucesores estructurales de esa arquitectura: distintas entidades, distintas instituciones, el mismo paso pagado entre el presupuesto y la entrega.",
          "Y el diseño tiene un precio. La revisión 2023 de la OCDE encuentra que las cadenas de intermediación añaden de 15 a 30 por ciento de sobrecarga sin aportar valor de entrega. Aplicado a los 526.8 mil millones de pesos de contratación P3 de RUBLI, el sobrecosto implícito es de 79 a 158 mil millones de pesos — en el extremo bajo, casi el presupuesto anual del programa federal de infraestructura del sector salud. La Estafa Maestra corrió 7.67 mil millones en dos años. Sus sucesores corren 526 mil millones ahora.",
        ],
        pullquote: {
          quote:
            "La Estafa Maestra moved 7.67 billion pesos through an intermediary structure in two years. RUBLI's current P3 population is running 526 billion.",
          quote_es:
            "La Estafa Maestra movió 7.67 mil millones de pesos por una estructura de intermediación en dos años. La población P3 actual de RUBLI corre con 526 mil millones.",
          stat: '79-158B MXN',
          statLabel: "estimated annual overhead cost of P3 intermediation",
          statLabel_es: "costo anual estimado de sobrecarga de la intermediación P3",
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
        title: "The Keys Hang Unused",
        title_es: "Las llaves cuelgan sin usar",
        subtitle: "18,897 flagged vendors, and no legal vehicle to investigate the pattern",
        subtitle_es: "18,897 proveedores marcados, y ningún vehículo legal para investigar el patrón",
        prose: [
          "Both patterns resist prosecution for one reason: each rests on legal procurement actions whose aggregate effect is harmful. Subcontracting is legal. Recurring vendor relationships are legal. Direct adjudication of specialized procurement is legal. A prosecutor cannot easily build a case against a single contract, and Mexican procurement law offers no vehicle to charge a pattern.",
          "The keys exist. The 15,923 P6 and 2,974 P3 vendors — 18,897 in all — are a ready starting point. SFP can audit procurement-unit performance and, in theory, sanction officials whose award patterns indicate favoritism; in practice its sanctions docket focuses on documented individual misconduct. UIF could subpoena bank records on the top-value P3 intermediaries to test whether the spread between government payment and subcontract payment is systematic. COFECE could investigate P6 vendor-institution relationships as prácticas monopólicas relativas. ASF could audit the highest-concentration P6 procurement units.",
          "None of this is happening systematically. The accountability gap is not legal — Mexico has the statutes, the oversight bodies, and, with RUBLI, the analytical capacity. What is missing is the decision to open rooms that have stayed locked for two decades.",
        ],
        prose_es: [
          "Ambos patrones resisten el proceso penal por una razón: cada uno se apoya en acciones legales de contratación cuyo efecto agregado es dañino. Subcontratar es legal. Las relaciones recurrentes con proveedores son legales. La adjudicación directa de contratación especializada es legal. Un fiscal no puede construir fácilmente un caso contra un contrato individual, y la ley mexicana de adquisiciones no ofrece vehículo para imputar un patrón.",
          "Las llaves existen. Los 15,923 proveedores P6 y 2,974 proveedores P3 — 18,897 en total — son un punto de partida listo. La SFP puede auditar el desempeño de las unidades compradoras y, en teoría, sancionar a funcionarios cuyos patrones de adjudicación indiquen favoritismo; en la práctica su agenda de sanciones se enfoca en mal comportamiento individual documentado. La UIF podría solicitar registros bancarios de los intermediarios P3 de mayor valor para probar si la diferencia entre el pago del gobierno y el del subcontrato es sistemática. La COFECE podría investigar las relaciones proveedor-institución P6 como prácticas monopólicas relativas. La ASF podría auditar las unidades compradoras P6 de mayor concentración.",
          "Nada de esto está pasando sistemáticamente. El vacío de fiscalización no es legal — México tiene los estatutos, los órganos de fiscalización y, con RUBLI, la capacidad analítica. Lo que falta es la decisión de abrir salas que han permanecido cerradas durante dos décadas.",
        ],
        pullquote: {
          quote:
            "Mexico has the statutes, the oversight bodies, and the analytical capacity. What is missing is the decision to open rooms that have stayed locked for two decades.",
          quote_es:
            "México tiene las leyes, los órganos de fiscalización y la capacidad analítica. Lo que falta es la decisión de abrir salas que han permanecido cerradas durante dos décadas.",
          stat: '18,897',
          statLabel: "total P3 + P6 vendors awaiting pattern-based investigation",
          statLabel_es:
            "total de proveedores P3 + P6 a la espera de investigación basada en patrones",
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
    headline: "The 82 Percent Rule",
    headline_es: "La regla del 82 por ciento",
    subheadline:
      "Mexico's federal government now awards 82 of every 100 contracts without competition. That share climbed for fourteen straight years — across four administrations, three parties, one pandemic — and never once fell below 60 percent. The OECD calls 30 percent the ceiling for a functioning system. Mexico runs at double to triple that ceiling every year RUBLI can measure. Non-competition is not the exception in Mexican procurement. It is the rule, four to one.",
    subheadline_es:
      "El gobierno federal mexicano adjudica hoy 82 de cada 100 contratos sin competencia. Esa proporción subió catorce años seguidos — cuatro administraciones, tres partidos, una pandemia — y nunca bajó del 60 por ciento. La OCDE fija en 30 por ciento el techo de un sistema que funciona. México opera al doble o al triple de ese techo cada año que RUBLI puede medir. La no-competencia no es la excepción en la contratación mexicana. Es la regla, con razón de cuatro a uno.",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 15,
    status: 'reporteado',
    leadStat: {
      value: '82.2%',
      label: "the share of all federal contracts awarded without competition in 2023 — the high-water mark, across four administrations",
      label_es: "la proporción de contratos federales adjudicados sin competencia en 2023 — la marea alta, en cuatro administraciones",
      sublabel: "14 consecutive years above 60% — the OECD ceiling is 30%",
      sublabel_es: "14 años consecutivos arriba del 60% — el techo OCDE es 30%",
      color: '#ea580c',
    },
    kickerStats: [
      {
        value: '82.2%',
        suffix: "of all contracts, the 2023 high-water mark",
        suffix_es: "de todos los contratos, la marea alta de 2023",
        tone: 'critical',
      },
      {
        value: '~30%',
        suffix: "the OECD ceiling Mexico has never met",
        suffix_es: "el techo OCDE que México nunca ha cumplido",
        tone: 'muted',
      },
      {
        value: '14 yrs',
        suffix: "never once below 60%",
        suffix_es: "ni una sola vez bajo el 60%",
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
        title: "Every Government Promised Competition. Every Government Used Less of It.",
        title_es: "Cada gobierno prometió competencia. Cada gobierno usó menos.",
        subtitle: "Four administrations, one rising average",
        subtitle_es: "Cuatro administraciones, un promedio en ascenso",
        prose: [
          "Every Mexican government since 2010 promised procurement transparency. Every one awarded more contracts without competition than the last. The numbers do not bend to who governed. Calderón (2007-2012) ran an average direct-award rate of 42.3 percent across 481,450 contracts worth 191.6 billion pesos. Peña Nieto (2013-2018) jumped to 73.1 percent across 1.23 million contracts worth 852.5 billion pesos. AMLO (2019-2024) reached 79.4 percent across 1.05 million contracts worth 1.06 trillion pesos. Three parties, one direction.",
          "Set those averages against the standard. The OECD's 2023 review of Mexican procurement puts the ceiling for direct-award usage in a well-functioning system at roughly 25 to 30 percent. That ceiling covers the legitimate cases: real emergencies, genuine sole-source contracts, small-value buys where running a tender costs more than it saves. Above 30 percent, the OECD treats direct adjudication as a structural indicator of procurement dysfunction.",
          "Mexico does not approach that ceiling — it clears it by a factor of two or three, every administration, every year on record. What the OECD calls a sign of breakdown, Mexico treats as a floor. Sheinbaum's first months read 68.3 percent on 92,631 contracts, but that is a partial-year preview, not a reversal. (The Fox period is excluded: COMPRANET's Structure A coverage of the direct-award flag before 2010 is unreliable.) The rule in Mexican federal contracting is non-competition, by a ratio of roughly four to one.",
        ],
        prose_es: [
          "Todo gobierno mexicano desde 2010 prometió transparencia en la contratación. Todos adjudicaron más contratos sin competencia que el anterior. Los números no se doblan ante quién gobierna. Calderón (2007-2012) corrió una tasa promedio de adjudicación directa de 42.3 por ciento en 481,450 contratos por 191.6 mil millones de pesos. Peña Nieto (2013-2018) saltó a 73.1 por ciento en 1.23 millones de contratos por 852.5 mil millones de pesos. AMLO (2019-2024) alcanzó 79.4 por ciento en 1.05 millones de contratos por 1.06 billones de pesos. Tres partidos, una sola dirección.",
          "Pon esos promedios frente al estándar. La revisión de la OCDE de 2023 sobre la contratación mexicana ubica el techo del uso de adjudicación directa en un sistema que funciona bien en torno al 25 o 30 por ciento. Ese techo cubre los casos legítimos: emergencias reales, contratos genuinos de única fuente, compras de bajo valor donde licitar cuesta más de lo que ahorra. Por encima del 30 por ciento, la OCDE trata la adjudicación directa como un indicador estructural de disfunción.",
          "México no se acerca a ese techo — lo rebasa por un factor de dos o tres, en cada administración, en cada año del registro. Lo que la OCDE llama señal de colapso, México lo trata como piso. Los primeros meses de Sheinbaum marcan 68.3 por ciento sobre 92,631 contratos, pero es una lectura parcial, no una reversión. (El periodo Fox queda excluido: la cobertura del indicador de adjudicación directa en la estructura A de CompraNet, antes de 2010, no es confiable.) La regla en la contratación federal mexicana es la no-competencia, con razón de aproximadamente cuatro a uno.",
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
                delta: '+37.1pp vs Calderón',
                delta_es: '+37.1pp vs Calderón',
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
            connectDots: true,
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
            "En la contratación federal mexicana, la licitación competitiva es la excepción. La adjudicación directa es la regla, con razón de cuatro a uno.",
          stat: '82.2%',
          statLabel: "high-water mark, direct-award rate, 2023",
          statLabel_es: "marea alta, tasa de adjudicación directa, 2023",
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
        title: "Fourteen Years, One Direction",
        title_es: "Catorce años, una sola dirección",
        subtitle: "The year-by-year ascent, 2010-2024",
        subtitle_es: "El ascenso año por año, 2010-2024",
        prose: [
          "The line starts in 2010 at 62.7 percent — already more than twice the OECD ceiling, and the earliest reliable mark in the COMPRANET archive. It barely stops climbing for the next thirteen years. After a slight dip to 60.0 percent in 2011, it resumes: 68.4 percent in 2013, 73.0 in 2015, 74.8 in 2016, 77.1 in 2017. Then 77.8 in 2019, 78.1 in 2020, 80.0 in 2021. A small recede to 79.1 in 2022 precedes the 82.2 percent peak of 2023, before settling at 79.3 in 2024.",
          "This is a ratchet, not a policy. No single administration drove it; no single reform reversed it. The rate rose through every partisan transition in the record — the trend ignores who holds power. Mexico has stayed above 60 percent for the entire data period and above 75 percent since 2017, exceeding the OECD ceiling by two to three times every year in the dataset.",
          "The gap between the 30 percent OECD line and the 60-plus percent Mexican floor is where competitive procurement used to live. The next chapters fill that gap: first the peak — which arrives not during the emergency everyone expects, but after it — then the vendors left standing where competition disappeared.",
        ],
        prose_es: [
          "La línea arranca en 2010 en 62.7 por ciento — ya más del doble del techo OCDE, y la marca confiable más temprana del archivo CompraNet. Casi no deja de subir durante los siguientes trece años. Tras una leve baja a 60.0 por ciento en 2011, se reanuda: 68.4 por ciento en 2013, 73.0 en 2015, 74.8 en 2016, 77.1 en 2017. Luego 77.8 en 2019, 78.1 en 2020, 80.0 en 2021. Una pequeña baja a 79.1 en 2022 antecede al pico de 82.2 por ciento de 2023, antes de asentarse en 79.3 en 2024.",
          "Esto es un trinquete, no una política. Ninguna administración por sí sola lo impulsó; ninguna reforma por sí sola lo revirtió. La tasa subió a través de cada transición partidista del registro — la tendencia ignora quién tiene el poder. México se mantuvo por encima del 60 por ciento durante todo el periodo de datos y por encima del 75 por ciento desde 2017, excediendo el techo OCDE entre dos y tres veces cada año del conjunto.",
          "La distancia entre la línea OCDE del 30 por ciento y el piso mexicano de más del 60 es donde solía vivir la contratación competitiva. Los capítulos siguientes llenan esa distancia: primero el pico — que llega no durante la emergencia que todos esperan, sino después de ella — y luego los proveedores que quedaron en pie donde la competencia desapareció.",
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
            "El techo OCDE es del 30 por ciento. El piso mexicano es del 60. La distancia entre ambos es donde solía vivir la contratación competitiva.",
          stat: '14 years',
          statLabel: "consecutive years above a 60% direct-award rate",
          statLabel_es: "años consecutivos con tasa de adjudicación directa por encima del 60%",
        },
        sources: [
          'RUBLI year-over-year direct award analysis, 2018-2022, April 2026.',
          'OECD. (2023). Public Procurement Performance Report: Mexico. Recommendation 3.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: "The Peak Came After the Emergency, Not During It",
        title_es: "El pico llegó después de la emergencia, no durante ella",
        subtitle: "COVID barely moved the rate. The years that followed crested it.",
        subtitle_es: "La COVID apenas movió la tasa. Los años siguientes la coronaron.",
        prose: [
          "Everyone expects 2020 — the COVID year — to be the surge, the moment emergency procurement broke the dam. It isn't. The pandemic moved the rate by 0.3 percentage points: 77.8 percent in 2019, before COVID, to 78.1 percent in 2020. The real swell came after the emergency ended. The three post-pandemic years added 4.1 points, cresting at 82.2 percent in 2023 — the highest rate in the 23 years RUBLI can analyze.",
          "The pandemic did not create Mexico's direct-award culture. It was an accelerant on a condition that already existed. The Ley de Adquisiciones, Art. 41, lists the legitimate grounds for skipping competition — emergencies, sole source, continuity with an existing contractor — with small-value contracts allowed under Art. 42 and open bidding the default under Art. 26. But when 82 percent of contracts invoke an exception, the statute's architecture is inverted. The exception is now the rule.",
          "The 2023 peak is not an inheritance. It arrived after the AMLO administration centralized pharmaceutical buying under BIRMEX and INSABI — a reform framed explicitly as anti-corruption, meant to strip discretion from institutional buyers with vendor ties. Yet the centralized system that replaced them ran near-100 percent direct-award rates in 2020-2021, awarding enormous single-source contracts without competition. Centralization did not cure the dependency. It concentrated it: a thousand small direct awards became one national-scale one, justified on a single basis. The shape changed. The dependency did not.",
        ],
        prose_es: [
          "Todos esperan que 2020 — el año de la COVID — sea la marejada, el momento en que la contratación de emergencia rompió el dique. No lo es. La pandemia movió la tasa 0.3 puntos porcentuales: 77.8 por ciento en 2019, antes de la COVID, a 78.1 por ciento en 2020. La verdadera crecida llegó después de que terminó la emergencia. Los tres años pospandemia sumaron 4.1 puntos, culminando en 82.2 por ciento en 2023 — la tasa más alta en los 23 años que RUBLI puede analizar.",
          "La pandemia no creó la cultura de adjudicación directa en México. Fue un acelerante sobre una condición que ya existía. La Ley de Adquisiciones, Art. 41, enumera los fundamentos legítimos para saltarse la competencia — emergencias, única fuente, continuidad con un contratista existente — con los contratos de bajo valor permitidos bajo el Art. 42 y la licitación abierta como regla bajo el Art. 26. Pero cuando el 82 por ciento de los contratos invoca una excepción, la arquitectura del estatuto se invierte. La excepción es ahora la regla.",
          "El pico de 2023 no es una herencia. Llegó después de que la administración de AMLO centralizó la compra farmacéutica bajo BIRMEX e INSABI — una reforma planteada explícitamente como anticorrupción, pensada para quitar discreción a compradores institucionales con vínculos con proveedores. Sin embargo, el sistema centralizado que los reemplazó operó con tasas de adjudicación directa cercanas al 100 por ciento en 2020-2021, adjudicando enormes contratos de única fuente sin competencia. La centralización no curó la dependencia. La concentró: mil adjudicaciones directas pequeñas se volvieron una de escala nacional, justificada sobre una sola base. La forma cambió. La dependencia no.",
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
            "La pandemia no creó la cultura de adjudicación directa en México. Fue un acelerante aplicado a una condición estructural preexistente.",
          stat: '78.1%',
          statLabel: "direct-award rate in 2020, the pandemic year — up just +0.3pp from 2019",
          statLabel_es: "tasa de adjudicación directa en 2020, el año pandémico — apenas +0.3pp sobre 2019",
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
        title: "The Vendors Who No Longer Have to Compete",
        title_es: "Los proveedores que ya no tienen que competir",
        subtitle:
          "Captive suppliers in the drowned zone — and a ~108B MXN annual cost",
        subtitle_es:
          "Proveedores cautivos en la zona inundada — y un costo de ~108 mil MDP al año",
        prose: [
          "Non-competition has a price, and the OECD has measured it. A 2019 meta-analysis spanning 40 countries found that eliminating competition raises contract prices by 15 to 30 percent on average — 25 to 40 percent for infrastructure and specialized technical work. Apply the low end to Mexico: 2023 direct-award contracts totaled roughly 720 billion pesos in face value; a 15 percent premium puts the competitive distortion at about 108 billion pesos a year. That is roughly 40 percent of the federal education budget for that year, or 60 percent of the health-infrastructure budget. Summed across 23 years at OECD-typical premiums, the aggregate runs into the low trillions of pesos — an order-of-magnitude estimate, not a precise figure. RUBLI's own risk model corroborates the direction: direct-award contracts score significantly higher than competitive ones in the same sector-year.",
          "Now name who occupies that ground. Among vendors with at least 50 contracts between 2010 and 2024 and a direct-award rate above 95 percent, three clusters emerge. The first is tech licensing — Microsoft Corporation at 10.87 billion pesos and 97.3 percent, Oracle México at 8.27 billion and 98.4 percent, IBM México at 8.02 billion and 95.4 percent, plus Microsoft Licensing GP at 6.66 billion (97.7 percent) and Microsoft México at 6.61 billion (99.6 percent). This cluster is largely defensible: proprietary software is genuinely sole-source.",
          "The second cluster is harder to defend. Televisa at 7.07 billion and 99.7 percent, Estudios Azteca at 5.82 billion and 99.8 percent — 12.9 billion pesos in government media buys routed to the two dominant broadcasters without competition. The third is the welfare-staples apparatus behind DICONSA-LICONSA: Molinos Azteca at 7.62 billion (flour), Marcas Nestlé at 4.35 billion (dairy), Molinera de México at 2.87 billion (flour), and Fábrica de Jabón La Corona at 2.68 billion (hygiene) — 17.5 billion pesos across four staple producers, with Industrial Patrona at 3.87 billion (bulk) alongside, all at 99.7 percent or higher. Two outliers round it out: Aeroméxico at 5.31 billion (government travel) and CENEVAL at 3.66 billion (a government-owned exam body). A high direct-award rate is not proof of wrongdoing — some of these contracts are legitimately sole-source. But these are the names that no longer have to compete.",
        ],
        prose_es: [
          "La no-competencia tiene un precio, y la OCDE lo ha medido. Un meta-análisis de 2019 en 40 países encontró que eliminar la competencia incrementa los precios de contrato en promedio entre 15 y 30 por ciento — entre 25 y 40 por ciento en infraestructura y trabajo técnico especializado. Aplica el extremo bajo a México: los contratos por adjudicación directa de 2023 totalizaron unos 720 mil millones de pesos en valor nominal; una prima del 15 por ciento sitúa la distorsión competitiva en unos 108 mil millones de pesos al año. Eso es cerca del 40 por ciento del presupuesto federal de educación de ese año, o el 60 por ciento del presupuesto de infraestructura de salud. Sumado a lo largo de 23 años con primas típicas OCDE, el agregado se ubica en el bajo orden de los billones de pesos — una estimación de orden de magnitud, no una cifra precisa. El propio modelo de riesgo de RUBLI corrobora la dirección: los contratos por adjudicación directa califican significativamente más alto que los competitivos en el mismo sector-año.",
          "Ahora, nombremos quién ocupa ese terreno. Entre los proveedores con al menos 50 contratos entre 2010 y 2024 y una tasa de adjudicación directa por encima del 95 por ciento, emergen tres bloques. El primero es de licencias tecnológicas — Microsoft Corporation con 10.87 mil millones de pesos y 97.3 por ciento, Oracle México con 8.27 mil millones y 98.4 por ciento, IBM México con 8.02 mil millones y 95.4 por ciento, más Microsoft Licensing GP con 6.66 mil millones (97.7 por ciento) y Microsoft México con 6.61 mil millones (99.6 por ciento). Este bloque es en buena medida defendible: el software propietario es genuinamente de única fuente.",
          "El segundo bloque es más difícil de defender. Televisa con 7.07 mil millones y 99.7 por ciento, Estudios Azteca con 5.82 mil millones y 99.8 por ciento — 12.9 mil millones de pesos en gasto oficial en medios canalizados a las dos radiodifusoras dominantes sin competencia. El tercero es el aparato de bienes básicos detrás de DICONSA-LICONSA: Molinos Azteca con 7.62 mil millones (harina), Marcas Nestlé con 4.35 mil millones (lácteos), Molinera de México con 2.87 mil millones (harina) y Fábrica de Jabón La Corona con 2.68 mil millones (higiene) — 17.5 mil millones de pesos entre cuatro productores de canasta, con Industrial Patrona con 3.87 mil millones (insumos) al lado, todos en 99.7 por ciento o más. Dos casos atípicos lo completan: Aeroméxico con 5.31 mil millones (viajes oficiales) y CENEVAL con 3.66 mil millones (paraestatal de evaluación). Una tasa alta de adjudicación directa no es prueba de irregularidad — algunos de estos contratos son legítimamente de única fuente. Pero estos son los nombres que ya no tienen que competir.",
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
            "A 15 percent competitive premium on 720 billion pesos in direct awards equals roughly 108 billion pesos a year — the cost of the competition that never happened.",
          quote_es:
            "Una prima competitiva del 15 por ciento sobre 720 mil millones de pesos en adjudicaciones directas equivale a unos 108 mil millones de pesos al año — el costo de la competencia que no hubo.",
          stat: '~108B MXN',
          statLabel: "estimated annual cost of the non-competitive procurement premium",
          statLabel_es: "costo anual estimado de la prima por contratación no competitiva",
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
        title: "The Oversight That Exists in Law and Nowhere Else",
        title_es: "La fiscalización que existe en la ley y en ningún otro lado",
        subtitle: "The architecture to constrain direct awards was written, then never operated",
        subtitle_es: "La arquitectura para limitar las adjudicaciones directas se escribió, y nunca se operó",
        prose: [
          "On paper, the controls exist. Every direct award under Art. 41 requires a written justification naming the specific legal basis — emergency, sole source, continuity — the vendor chosen, and the rationale. Those justifications are public under transparency law. The SFP is empowered to audit the pattern of justifications at each procurement unit. The ASF is empowered to review individual high-value direct awards under Art. 41 and Art. 42 during Cuenta Pública audits. Three layers of oversight, fully authorized.",
          "In practice, none of it operates at scale. Justification documents are published inconsistently. The SFP's pattern-audit function runs at a small fraction of its legal capacity. ASF reviews reach only a tiny share of high-value direct awards. The 82 percent rate is not what happens when a system tries to constrain direct awards and fails. It is what happens when a system accepts them as normal and builds no real constraint at all.",
          "Three fixes are technically feasible today, and RUBLI's data makes each possible: publish Art. 41 justifications in machine-readable form; have the SFP run pattern-based audits of procurement units whose direct-award rates exceed sector norms; and monitor risk in real time, so a suspect award can be challenged before it executes, not after. CompraNet has the data architecture. RUBLI has the methodology. What is missing is the institutional will to run oversight against fourteen years of dependency. Until that changes, the cost — hundreds of billions of pesos a year — keeps being paid by the Mexican public.",
        ],
        prose_es: [
          "En el papel, los controles existen. Cada adjudicación directa bajo el Art. 41 requiere una justificación escrita que nombre la base legal específica — emergencia, única fuente, continuidad — el proveedor elegido y la motivación. Esas justificaciones son públicas bajo la ley de transparencia. La SFP está facultada para auditar el patrón de justificaciones en cada unidad compradora. La ASF está facultada para revisar adjudicaciones directas individuales de alto valor bajo el Art. 41 y el Art. 42 durante las auditorías de la Cuenta Pública. Tres capas de fiscalización, plenamente autorizadas.",
          "En la práctica, ninguna opera a escala. Los documentos de justificación se publican de manera inconsistente. La función de auditoría por patrones de la SFP corre a una pequeña fracción de su capacidad legal. Las revisiones de la ASF alcanzan apenas una porción minúscula de las adjudicaciones directas de alto valor. La tasa de 82 por ciento no es lo que ocurre cuando un sistema intenta limitar las adjudicaciones directas y falla. Es lo que ocurre cuando un sistema las acepta como normales y no construye límite real alguno.",
          "Tres remedios son técnicamente factibles hoy, y los datos de RUBLI hacen posible cada uno: publicar las justificaciones del Art. 41 en formato legible por máquina; que la SFP corra auditorías basadas en patrones a las unidades compradoras cuyas tasas de adjudicación directa excedan las normas sectoriales; y monitorear el riesgo en tiempo real, para que una adjudicación sospechosa pueda impugnarse antes de ejecutarse, no después. CompraNet tiene la arquitectura de datos. RUBLI tiene la metodología. Lo que falta es la voluntad institucional de operar la fiscalización contra catorce años de dependencia. Hasta que eso cambie, el costo — cientos de miles de millones de pesos al año — lo seguirá pagando el público mexicano.",
        ],
        pullquote: {
          quote:
            "Mexico built an oversight architecture in law and never built it in practice. The 82% direct-award rate is the visible shape of that absence.",
          quote_es:
            "México construyó una arquitectura de fiscalización en la ley y nunca la construyó en la práctica. La tasa de adjudicación directa del 82% es la forma visible de esa ausencia.",
          stat: '~720B MXN',
          statLabel: "2023 direct-award contracts by face value — 82% of all federal procurement",
          statLabel_es: "contratos de adjudicación directa 2023 por valor nominal — 82% de toda la contratación federal",
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
    headline: "The Ledger of Five Administrations",
    headline_es: "El Libro Mayor de Cinco Sexenios",
    subheadline:
      "Every Mexican administration since Fox scored riskier than the one before it. RUBLI's politically blind v0.8.5 model — test AUC 0.785, trained on 1,427 documented corruption cases — flags 7.5 percent of Fox-era contracts, 8.2 percent of Calderón's, 11.2 percent of Peña Nieto's, and 12.6 percent of AMLO's: the highest line in 23 years of data, 5.1 points above where the trend began. The books were not cut under AMLO. They were reorganized — defense up 186 percent, civilian infrastructure down 65 percent, pharmaceutical and welfare logistics squeezed into a handful of vendors. Sheinbaum's account, still open, already posts 12.9 percent.",
    subheadline_es:
      "Cada administración mexicana desde Fox calificó más riesgosa que la anterior. El modelo v0.8.5 de RUBLI —políticamente ciego, AUC de prueba 0.785, entrenado con 1,427 casos documentados de corrupción— marca el 7.5 por ciento de los contratos de la era Fox, el 8.2 de los de Calderón, el 11.2 de los de Peña Nieto y el 12.6 de los de AMLO: la línea más alta en 23 años de datos, 5.1 puntos por encima de donde arrancó la tendencia. Con AMLO no se recortaron los libros. Se reorganizaron: la defensa subió 186 por ciento, la infraestructura civil cayó 65, y la logística farmacéutica y del bienestar se apretó en un puñado de proveedores. La cuenta de Sheinbaum, aún abierta, ya registra 12.9 por ciento.",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 17,
    status: 'reporteado',
    leadStat: {
      value: '12.6%',
      label: "high-risk rate, AMLO account (2019-2024) · v0.8.5 — highest line in the book",
      label_es:
        "tasa de alto riesgo, cuenta AMLO (2019-2024) · v0.8.5 — la línea más alta del libro",
      sublabel: "vs 7.5% Fox · 8.2% Calderón · 11.2% Peña Nieto · 12.9% Sheinbaum (partial)",
      sublabel_es: "vs 7.5% Fox · 8.2% Calderón · 11.2% Peña Nieto · 12.9% Sheinbaum (parcial)",
      color: '#dc2626',
    },
    kickerStats: [
      {
        value: '7.5% → 12.6%',
        suffix: "high-risk rate, Fox to AMLO — every term riskier than the last.",
        suffix_es:
          "tasa de alto riesgo, de Fox a AMLO — cada sexenio más riesgoso que el anterior.",
        tone: 'data',
      },
      {
        value: '+5.1pp',
        suffix: "upward drift across 23 years of data.",
        suffix_es: "de deriva ascendente en 23 años de datos.",
        tone: 'data',
      },
      {
        value: '79.4%',
        suffix: "AMLO direct-award rate — the liability carried into the open account.",
        suffix_es: "tasa de adjudicación directa de AMLO — el pasivo heredado a la cuenta abierta.",
        tone: 'critical',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: "Opening the Books",
        title_es: "Abrir los libros",
        subtitle: "Five administrations, one ascending column",
        subtitle_es: "Cinco sexenios, una columna ascendente",
        prose: [
          "AMLO's federal contracts carry a 12.6 percent high-risk rate — the highest reading in 23 years of Mexican procurement. It did not arrive alone. Post the five terms low to high and the ledger reads itself. Fox: 7.50 percent of contracts flagged, 15,479 of 206,333. Calderón: 8.15 percent, 39,238 of 481,450. Peña Nieto: 11.18 percent, 137,358 of 1,228,625. AMLO: 12.62 percent, 131,640 of 1,043,097. Rounded: 7.5, 8.2, 11.2, 12.6. The column climbs in one direction only.",
          "The instrument is politically blind. RUBLI's v0.8.5 model (test AUC 0.785) was not tuned to any administration. It trained on 1,427 documented corruption cases spanning multiple presidencies and scores each contract by structural resemblance to known-bad patterns — vendor concentration, price volatility, co-bidding concentration, network membership, procurement mechanism. It carries no party. It sees only patterns, and the patterns trend upward.",
          "Read each term against its own audit note. Fox governed under Structure A coverage, so 7.5 percent is a floor — the dataset under-reports the period and the true rate is likely higher. Calderón's 8.2 percent sits inside the OECD's 2-15 percent benchmark. Peña Nieto's 11.2 crosses into concerning. AMLO's 12.6 breaks the record and stands 5.1 points above where the line began.",
          "One number resists the lazy reading. AMLO flagged fewer raw contracts than Peña Nieto — 131,640 against 137,358 — on lower total volume. The rate climbs, not the count: risk concentrated as procurement growth slowed. Slice it any way and the verdict holds. Every administration since Fox scored riskier than its predecessor.",
        ],
        prose_es: [
          "Los contratos federales de AMLO cargan una tasa de alto riesgo del 12.6 por ciento — la lectura más alta en 23 años de contratación mexicana. No llegó sola. Asienta los cinco sexenios de menor a mayor y el libro mayor se lee solo. Fox: 7.50 por ciento de contratos marcados, 15,479 de 206,333. Calderón: 8.15 por ciento, 39,238 de 481,450. Peña Nieto: 11.18 por ciento, 137,358 de 1,228,625. AMLO: 12.62 por ciento, 131,640 de 1,043,097. Redondeado: 7.5, 8.2, 11.2, 12.6. La columna sube en una sola dirección.",
          "El instrumento es políticamente ciego. El modelo v0.8.5 de RUBLI (AUC de prueba 0.785) no se calibró para ninguna administración. Se entrenó con 1,427 casos documentados de corrupción de varias presidencias y evalúa cada contrato por su parecido estructural con patrones conocidos de corrupción: concentración de proveedores, volatilidad de precios, concentración entre coparticipantes, membresía en redes, mecanismo de contratación. No tiene partido. Solo ve patrones, y los patrones apuntan hacia arriba.",
          "Lee cada sexenio contra su propia nota de auditoría. Fox gobernó con cobertura de Estructura A, así que el 7.5 por ciento es un piso: el conjunto de datos sub-reporta el período y la tasa real es probablemente mayor. El 8.2 de Calderón cabe dentro del parámetro 2-15 por ciento de la OCDE. El 11.2 de Peña Nieto cruza a territorio preocupante. El 12.6 de AMLO rompe el récord y se ubica 5.1 puntos por encima de donde empezó la línea.",
          "Un número se resiste a la lectura perezosa. AMLO marcó menos contratos en bruto que Peña Nieto —131,640 contra 137,358— sobre un volumen total menor. Sube la tasa, no el conteo: el riesgo se concentró cuando el crecimiento de la contratación se frenó. Córtalo como quieras y el veredicto se sostiene. Cada administración desde Fox calificó más riesgosa que la anterior.",
        ],
        pullquote: {
          quote:
            "Every Mexican administration since Fox scored riskier than its predecessor. Fox 7.5% → Calderón 8.2% → Peña Nieto 11.2% → AMLO 12.6%. The column climbs in one direction only.",
          quote_es:
            "Cada administración mexicana desde Fox calificó más riesgosa que la anterior. Fox 7.5% → Calderón 8.2% → Peña Nieto 11.2% → AMLO 12.6%. La columna sube en una sola dirección.",
          stat: '12.6%',
          statLabel: "AMLO-account high-risk rate (v0.8.5) — highest in 23 years",
          statLabel_es: "tasa de alto riesgo, cuenta AMLO (v0.8.5) — la más alta en 23 años",
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
        title_es: "La partida mayor: los libros de AMLO, reorganizados",
        subtitle: "Where every peso moved between sectors",
        subtitle_es: "A dónde se movió cada peso entre sectores",
        prose: [
          "The books were not cut. They were reorganized. Against 2.76 trillion pesos in federal procurement, AMLO did not spend less than his predecessors — he spent differently. Set the sector ledger beside Peña Nieto's as debits and credits and a shape emerges that no campaign rhetoric prepared the public for: three lines expanded sharply, three collapsed, one grew by half while concentrating in fewer hands.",
          "Count the credits that fell. Energía dropped 88 percent, from 435.2 billion to 50.1, as Pemex and CFE pulled work in-house. Infraestructura fell 65 percent, from 937.1 billion to 326.4. Medio Ambiente fell 31 percent, Educación 26. The pesos civilian agencies stopped spending on roads, water, energy, schools, and the environment did not vanish. They reappeared as Defensa (+186%), Gobernación (+100%, 95.2B to 190.4B), Hacienda (+70%, 231.1B to 392.9B), and Agricultura (+36%, 122.2B to 166.2B).",
          "Salud closes the entry, up 47 percent — 816 billion to 1,201.4. The growth was not clinics, equipment, or staff; it was pharmaceutical centralization through INSABI, BIRMEX, and ultimately IMSS-Bienestar. The single largest spend category is \"Medicamentos y Farmacéuticos\" at 327.6 billion pesos, flagged at 22.4 percent. The second, \"Construcción de Edificios\" at 269.4 billion, holds the military-construction surge. Both lines hand straight to the next chapter, where the hottest readings live. (The nine sectors charted here sum to 2.70 trillion; the remaining ~60 billion sits in Tecnología, Trabajo, and Otros.)",
        ],
        prose_es: [
          "Los libros no se recortaron. Se reorganizaron. Frente a 2.76 billones de pesos en contratación federal, AMLO no gastó menos que sus predecesores: gastó distinto. Pon el libro sectorial junto al de Peña Nieto como cargos y abonos y aparece una forma que ninguna retórica de campaña preparó al público para esperar: tres líneas se expandieron de golpe, tres colapsaron, y una creció a la mitad mientras se concentraba en menos manos.",
          "Cuenta los abonos que cayeron. Energía se desplomó 88 por ciento, de 435.2 mil millones a 50.1, cuando Pemex y CFE internalizaron el trabajo. Infraestructura cayó 65 por ciento, de 937.1 mil millones a 326.4. Medio Ambiente bajó 31 por ciento, Educación 26. Los pesos que las dependencias civiles dejaron de gastar en carreteras, agua, energía, escuelas y medio ambiente no desaparecieron. Reaparecieron como Defensa (+186%), Gobernación (+100%, de 95.2 a 190.4 mil millones), Hacienda (+70%, de 231.1 a 392.9 mil millones) y Agricultura (+36%, de 122.2 a 166.2 mil millones).",
          "Salud cierra la partida, con un alza del 47 por ciento — de 816 mil millones a 1,201.4. El crecimiento no fue clínicas, equipo ni personal; fue centralización farmacéutica vía INSABI, BIRMEX y, al final, IMSS-Bienestar. La categoría de mayor gasto individual es \"Medicamentos y Farmacéuticos\" con 327.6 mil millones de pesos, marcada al 22.4 por ciento. La segunda, \"Construcción de Edificios\" con 269.4 mil millones, guarda el auge de la construcción militar. Ambas líneas conectan directo con el siguiente capítulo, donde viven las lecturas más calientes. (Los nueve sectores graficados aquí suman 2.70 billones; los ~60 mil millones restantes están en Tecnología, Trabajo y Otros.)",
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
            "AMLO did not spend less. He spent differently. Defense grew 186 percent. Civilian infrastructure collapsed by 65 percent. The pesos did not vanish; they reorganized — and the army absorbed the civilian ledger.",
          quote_es:
            "AMLO no gastó menos. Gastó distinto. La defensa creció 186 por ciento. La infraestructura civil se desplomó 65 por ciento. Los pesos no desaparecieron; se reorganizaron — y el ejército absorbió el libro civil.",
          stat: '+186%',
          statLabel: "Defensa procurement growth, AMLO vs Peña",
          statLabel_es: "Crecimiento de contratación en Defensa, AMLO vs Peña",
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
        title_es: "El ascenso monótono del ejército",
        subtitle: "How national-security cover moved civilian works to SEDENA",
        subtitle_es: "Cómo la cobertura de seguridad nacional trasladó la obra civil a la SEDENA",
        prose: [
          "In 2018, SEDENA took 2.2 percent of all federal spending; by 2024, 5.4 percent — 2.5 times its pre-AMLO floor and five times its 2015 share. The peso figures move in step: 9.94 billion in 2018, 22.43 billion in 2024. Federal contracting routed through the army grew 186 percent, from 59.2 billion under Peña Nieto to 168.9 under AMLO, and it climbed monotonically, not in spikes. Not one AMLO year fell below the 2018 level.",
          "This was not weapons modernization. It was mission expansion. The same six years saw SEDENA take operational control of the AIFA civilian airport, the Tren Maya tourist railway, customs administration, social-program logistics, and public works previously contracted through SCT and CONAGUA — a civilian portfolio absorbed by the army.",
          "The mechanism was legal and applied harder than ever. Presidential decrees beginning in 2019 reclassified ever-broader public works as national security, moving contracting authority from civilian agencies to SEDENA. Articles 41 and 42 of the Ley de Adquisiciones, with Article 32 of the Ley de Obras Públicas, permit the executive to declare national-security exceptions to competitive bidding. AMLO invoked that exception more aggressively than any prior term in the dataset.",
          "Reclassification cost visibility. The 465 contracts whose titles name \"Tren Maya\" total 125.3 billion pesos, yet ASF findings put the real budget past 500 billion — most of it run through SEDENA-controlled trust funds (FONATUR/Tren Maya/SEDENA-Bienestar) that publish less than civilian COMPRANET. In 2023 Animal Político, MCCI, and Aristegui Noticias reported that Tren Maya and AIFA contractors were required to route a percentage of contract value through designated intermediary firms — a pattern that fits RUBLI's P3 intermediary-capture signature. RUBLI cannot verify those allegations from procurement data alone, but the structural conditions match: concentrated awards, intermediary vendors, classified procurement, limited visibility.",
        ],
        prose_es: [
          "En 2018 la SEDENA se llevó el 2.2 por ciento de todo el gasto federal; para 2024, el 5.4 por ciento — 2.5 veces su piso previo a AMLO y cinco veces su participación de 2015. Las cifras en pesos avanzan al mismo paso: 9.94 mil millones en 2018, 22.43 mil millones en 2024. La contratación federal canalizada por el ejército creció 186 por ciento, de 59.2 mil millones bajo Peña Nieto a 168.9 bajo AMLO, y subió de forma monótona, no a saltos. Ni un solo año de AMLO cayó por debajo del nivel de 2018.",
          "No fue modernización armamentista. Fue expansión de misión. Esos mismos seis años vieron a la SEDENA tomar control operativo del aeropuerto civil AIFA, el ferrocarril turístico Tren Maya, la administración aduanera, la logística de programas sociales y obras públicas que antes se contrataban por la SCT y la CONAGUA — una cartera civil absorbida por el ejército.",
          "El mecanismo fue legal y se aplicó con más fuerza que nunca. Decretos presidenciales a partir de 2019 reclasificaron obras públicas cada vez más amplias como seguridad nacional, trasladando la autoridad de contratación de las dependencias civiles a la SEDENA. Los Artículos 41 y 42 de la Ley de Adquisiciones, con el Artículo 32 de la Ley de Obras Públicas, permiten al ejecutivo declarar excepciones de seguridad nacional a la licitación competitiva. AMLO invocó esa excepción con más agresividad que cualquier sexenio anterior del conjunto de datos.",
          "La reclasificación costó visibilidad. Los 465 contratos cuyos títulos nombran \"Tren Maya\" suman 125.3 mil millones de pesos, pero los hallazgos de la ASF colocan el presupuesto real por encima de los 500 mil millones — la mayoría ejecutado por fideicomisos controlados por la SEDENA (FONATUR/Tren Maya/SEDENA-Bienestar) que publican menos que el COMPRANET civil. En 2023 Animal Político, MCCI y Aristegui Noticias reportaron que a los contratistas del Tren Maya y el AIFA se les exigía canalizar un porcentaje del valor del contrato por empresas intermediarias designadas — un patrón que encaja con la firma P3 de captura de intermediario de RUBLI. RUBLI no puede verificar esas alegaciones solo con datos de contratación, pero las condiciones estructurales coinciden: adjudicaciones concentradas, proveedores intermediarios, contratación clasificada, visibilidad limitada.",
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
            "SEDENA grew from 2.2 percent of all federal spending in 2018 to 5.4 percent in 2024 — from a roughly 1-2 percent share in 2015. Every year of the AMLO sexenio expanded the army's procurement footprint.",
          quote_es:
            "La SEDENA pasó del 2.2 por ciento de todo el gasto federal en 2018 al 5.4 por ciento en 2024 — desde una participación de apenas 1-2 por ciento en 2015. Cada año del sexenio de AMLO expandió la huella de contratación del ejército.",
          stat: '5.4%',
          statLabel: "SEDENA share of all federal procurement, 2024",
          statLabel_es: "Participación de SEDENA en toda la contratación federal, 2024",
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
        title: "Reading the Hot Lines",
        title_es: "Leer las partidas calientes",
        subtitle:
          "The category entries where the risk indicator runs hottest — and who occupies them",
        subtitle_es:
          "Las partidas donde el indicador de riesgo corre más caliente — y quién las ocupa",
        prose: [
          "Food procurement under AMLO ran at a 32.4 percent high-risk rate across 224.9 billion pesos — 17.4 points above the OECD ceiling and the hottest of any major AMLO category. The 12.6 percent term average concealed it. Drill from the column into the line items and three of eight measured categories breach the OECD 15 percent ceiling; the rest run below. The hot lines map onto the administration's signature policy choices.",
          "Alimentos y Víveres holds the Segalmex network: 1,258 contracts at a 1.000 risk score, already documented as the largest financial-corruption case in MORENA-government history — and only a fraction of the at-risk pesos on the line. Below it sit two health lines. Medicamentos y Farmacéuticos at 22.4 percent (+7.4) reflects the IMSS pharmaceutical-cartel pattern from The Invisible Monopoly. Servicios Hospitalarios at 19.4 percent (+4.4) is the same architecture extended to outsourced clinical services. The cooler lines — Servicios Generales 14.3, Carreteras 12.2, Material de Curación 12.1, Mantenimiento 9.4, Construcción de Edificios 8.5 — sit under the ceiling. Construcción reads low only because the highest-risk military construction bypasses civilian COMPRANET; the 8.5 is biased downward, not clean.",
          "One vendor anchors the welfare line. TOKA Internacional — a single voucher company — collected 40.6 billion pesos under AMLO at a 0.78 risk score, 897 contracts, 25 billion of it at 0.916. It is the largest individual AMLO-era vendor after the pharmaceutical and Tren Maya clusters. TOKA, Edenred, Sodexo, and the payment-card operators that captured Mexican welfare logistics occupy a position structurally identical to the IMSS pharmaceutical cartel: a small vendor set, critical-tier risk indicators, dominant institutional shares, and direct-adjudication authority built into the program design. The line is hot because the program was built that way. These vendors match the pattern; RUBLI scores structure, not proven guilt.",
        ],
        prose_es: [
          "Las compras de alimentos bajo AMLO operaron con una tasa de alto riesgo del 32.4 por ciento en 224.9 mil millones de pesos — 17.4 puntos por encima del techo de la OCDE y la más caliente de cualquier categoría AMLO importante. El promedio sexenal del 12.6 por ciento la ocultaba. Baja de la columna a las partidas y tres de ocho categorías medidas rebasan el techo del 15 por ciento de la OCDE; las demás quedan debajo. Las partidas calientes apuntan a las decisiones de política distintivas de la administración.",
          "Alimentos y Víveres contiene la red de Segalmex: 1,258 contratos con puntuación de riesgo 1.000, ya documentada como el mayor caso de corrupción financiera en la historia del gobierno de MORENA — y solo una fracción de los pesos en riesgo de la línea. Debajo se ubican dos líneas de salud. Medicamentos y Farmacéuticos con 22.4 por ciento (+7.4) refleja el patrón del cártel farmacéutico del IMSS de El Monopolio Invisible. Servicios Hospitalarios con 19.4 por ciento (+4.4) es la misma arquitectura extendida a servicios clínicos externalizados. Las líneas más frías —Servicios Generales 14.3, Carreteras 12.2, Material de Curación 12.1, Mantenimiento 9.4, Construcción de Edificios 8.5— quedan bajo el techo. Construcción se lee baja solo porque la construcción militar de mayor riesgo elude el COMPRANET civil; el 8.5 está sesgado a la baja, no limpio.",
          "Un proveedor ancla la línea del bienestar. TOKA Internacional —una sola empresa de vales— recaudó 40.6 mil millones de pesos bajo AMLO con puntuación de riesgo 0.78, 897 contratos, 25 mil millones de ellos en 0.916. Es el proveedor individual más grande de la era AMLO después de los clusters farmacéuticos y del Tren Maya. TOKA, Edenred, Sodexo y los operadores de tarjetas de pago que capturaron la logística del bienestar mexicano ocupan una posición estructuralmente idéntica al cártel farmacéutico del IMSS: un conjunto pequeño de proveedores, indicadores de riesgo de nivel crítico, cuotas institucionales dominantes y autoridad de adjudicación directa integrada en el diseño del programa. La línea está caliente porque el programa se construyó así. Estos proveedores coinciden con el patrón; RUBLI evalúa la estructura, no culpa probada.",
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
            "Food procurement under AMLO ran at a 32.4 percent high-risk rate. Pharmaceuticals at 22.4. Hospital services at 19.4. The lines with the loudest political claims around them are the lines the model reads hottest.",
          quote_es:
            "Las compras de alimentos bajo AMLO operaron con tasa de alto riesgo de 32.4 por ciento. Farmacéuticos 22.4. Servicios hospitalarios 19.4. Las líneas con los reclamos políticos más fuertes son las que el modelo lee con mayor intensidad.",
          stat: '32.4%',
          statLabel: "high-risk rate, \"Alimentos y Víveres\" — highest of any major AMLO category",
          statLabel_es:
            "tasa de alto riesgo, \"Alimentos y Víveres\" — la más alta de cualquier categoría AMLO",
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
        title: "The Account Still Open",
        title_es: "La cuenta aún abierta",
        subtitle: "Sheinbaum's partial books — and the liabilities carried forward",
        subtitle_es: "Los libros parciales de Sheinbaum — y los pasivos heredados",
        prose: [
          "AMLO awarded 1,063 of 2,758 billion pesos without competition — a 79.4 percent direct-award rate over six years. That is the hardest line on the inherited balance sheet, and it does not bend easily. The officials who learned to work that way did not retire on October 1, 2024. The vendors who built businesses around AMLO-era programs did not find new customers. Articles 41 and 42 remain on the books, ready to be invoked.",
          "Sheinbaum took office in October 2024. RUBLI holds 92,631 of her contracts to date at roughly 12.9 percent high-risk — below the AMLO peak, above the Calderón baseline. Too early for a firm trajectory. But the architecture she is consolidating is inherited, and four liabilities carry forward like unamortized obligations: pharmaceutical procurement under IMSS-Bienestar, where the 2025 consolidated medicine tender awarded 19.46 billion pesos to PISA in a single year; welfare logistics through voucher operators, TOKA's 0.78-risk billion-peso contracts among them; civilian infrastructure absorbed by SEDENA under national-security cover; and food procurement running at 32.4 percent against the OECD 15 ceiling.",
          "Beneath all five columns runs one institutional argument. The OECD's 2023 Mexico Procurement Review, Recommendation 7, urged building real-time analytical capacity into oversight. RUBLI is a working version of it: ASF audits the previous fiscal year each spring; RUBLI's pipeline updates monthly. That gap — between real-time visibility and formal accountability — is what a tool like RUBLI is built to narrow. Whether the fifth term operationalizes that visibility, or becomes the fifth administration to promise transparency while direct-award dependency climbs, is a verdict the open account will return one quarter at a time.",
        ],
        prose_es: [
          "AMLO adjudicó 1,063 de 2,758 mil millones de pesos sin competencia — una tasa de adjudicación directa del 79.4 por ciento en seis años. Esa es la línea más dura de la hoja de balance heredada, y no se dobla fácil. Los funcionarios que aprendieron a trabajar así no se jubilaron el 1 de octubre de 2024. Los proveedores que armaron negocios alrededor de los programas de la era AMLO no encontraron nuevos clientes. Los Artículos 41 y 42 siguen en los libros, listos para invocarse.",
          "Sheinbaum tomó posesión en octubre de 2024. RUBLI tiene 92,631 de sus contratos hasta la fecha con alto riesgo de alrededor del 12.9 por ciento — por debajo del pico de AMLO, por encima de la línea base de Calderón. Demasiado pronto para una trayectoria firme. Pero la arquitectura que consolida es heredada, y cuatro pasivos se arrastran como obligaciones no amortizadas: la contratación farmacéutica bajo IMSS-Bienestar, donde la licitación consolidada de medicamentos de 2025 adjudicó 19.46 mil millones de pesos a PISA en un solo año; la logística del bienestar vía operadores de vales, entre ellos los contratos de TOKA de riesgo 0.78 a escala de miles de millones; la infraestructura civil absorbida por la SEDENA bajo cobertura de seguridad nacional; y la contratación de alimentos al 32.4 por ciento frente al techo de 15 de la OCDE.",
          "Por debajo de las cinco columnas corre un solo argumento institucional. La Revisión de Adquisiciones de México de la OCDE de 2023, en su Recomendación 7, urgió construir capacidad analítica en tiempo real en la supervisión. RUBLI es una versión funcional de eso: la ASF audita el año fiscal anterior cada primavera; el pipeline de RUBLI se actualiza cada mes. Esa brecha —entre la visibilidad en tiempo real y la rendición de cuentas formal— es la que una herramienta como RUBLI busca estrechar. Si el quinto sexenio operacionaliza esa visibilidad, o se vuelve la quinta administración en prometer transparencia mientras la dependencia de la adjudicación directa sigue subiendo, es un veredicto que la cuenta abierta devolverá trimestre a trimestre.",
        ],
        pullquote: {
          quote:
            "AMLO awarded 1,063 of 2,758 billion pesos without competition — a 79.4 percent direct-award rate. The officials, the vendors, and the legal exceptions all carried over October 1, 2024. The hardest line on the inherited balance sheet does not bend easily.",
          quote_es:
            "AMLO adjudicó 1,063 de 2,758 mil millones de pesos sin competencia — una tasa de adjudicación directa del 79.4 por ciento. Los funcionarios, los proveedores y las excepciones legales se heredaron todos el 1 de octubre de 2024. La línea más dura de la hoja de balance heredada no se dobla fácilmente.",
          stat: '79.4%',
          statLabel: "AMLO direct-award rate — the liability carried into the open account",
          statLabel_es:
            "tasa de adjudicación directa de AMLO — el pasivo heredado a la cuenta abierta",
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
    headline: "Follow the Middleman",
    headline_es: "Sigan al Intermediario",
    subheadline:
      "CONSTRUCTORA ARHNOS won 32 billion pesos across six contracts — an average ticket of 5.3 billion, where legitimate infrastructure firms work in single-digit millions. It is one of 2,974 vendors RUBLI's P3 algorithm flags as matching the pass-through signature: money in, money out, a firm in the middle that builds nothing. Together they route 526.8 billion pesos through eight sectors — 179.5 billion in infrastructure alone. COFECE, the one body with jurisdiction over procurement collusion, has brought essentially no such case in five years.",
    subheadline_es:
      "CONSTRUCTORA ARHNOS ganó 32 mil millones de pesos en seis contratos — un ticket promedio de 5.3 mil millones, donde las firmas legítimas de infraestructura facturan montos de millones de un solo dígito. Es uno de 2,974 proveedores que el algoritmo P3 de RUBLI marca por coincidir con la firma de paso: entra dinero, sale dinero, y una firma en medio que no construye nada. Juntos canalizan 526.8 mil millones de pesos por ocho sectores — 179.5 mil millones solo en infraestructura. La COFECE, el único organismo con jurisdicción sobre la colusión en compras, no ha presentado prácticamente ningún caso así en cinco años.",
    byline: 'RUBLI Investigative Data Unit',
    estimatedMinutes: 14,
    status: 'solo_datos',
    leadStat: {
      value: '2,974',
      label: "vendors matching the P3 pass-through signature",
      label_es: "proveedores que coinciden con la firma de paso P3",
      sublabel: "526.8B MXN routed across 8 key sectors",
      sublabel_es: "526.8 mil millones canalizados en 8 sectores clave",
      color: '#8b5cf6',
    },
    kickerStats: [
      {
        value: '2,974',
        suffix: "pass-through-pattern vendors",
        suffix_es: "proveedores con patrón de paso",
        tone: 'data',
      },
      {
        value: '526.8B',
        suffix: "MXN routed through brokers, 8 sectors",
        suffix_es: "MXN canalizados por intermediarios, 8 sectores",
        tone: 'critical',
      },
      {
        value: '0',
        suffix: "COFECE procurement cartel cases, 5 yrs",
        suffix_es: "casos COFECE de cártel de compras, 5 años",
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
        title: "The Peso and the Broker",
        title_es: "El peso y el intermediario",
        subtitle: "Three signals describe a firm built to do nothing",
        subtitle_es: "Tres señales describen una firma hecha para no hacer nada",
        prose: [
          "A peso leaves the federal treasury as a contract payment and lands in a company's account. The company subcontracts the actual work — the road, the hospital wing, the oilfield service — to another firm for less. The difference stays behind. That spread is the entire business. The company built nothing, shipped nothing, and produced only a contract.",
          "Not every middleman is a problem. A distributor with real supply chains can deliver goods cheaper than the factory; a general contractor coordinating dozens of trades earns its fee. The fraud variant is narrower: the intermediary adds no value beyond the act of contracting, yet the government pays more than it would have paid the firm that does the work. The mechanism survives a single-contract audit and runs at scale for decades.",
          "RUBLI's Pattern 3 catches the broker mid-flow. It reads three signals: an industry-code mismatch between a firm's declared economic activity and what its contracts demand; rapid growth from a thin history to a massive portfolio; and the pass-through financial signature — huge contract values carried on minimal fixed assets. None proves fraud. Together they describe a shape.",
          "The shape repeats 2,974 times, and it clusters where the spread is worth taking. Infrastructure leads: 1,128 P3 vendors, 179.5 billion pesos. Energy follows: 463 vendors across PEMEX and CFE, 130.6 billion. Health is third: 476 vendors, 104.2 billion in drugs and medical equipment. Three sectors, 414 billion pesos — and that is before the rest of the map.",
        ],
        prose_es: [
          "Un peso sale de la Tesorería federal como pago de un contrato y aterriza en la cuenta de una empresa. La empresa subcontrata el trabajo real — el camino, el ala del hospital, el servicio petrolero — con otra firma a un precio menor. La diferencia se queda atrás. Esa diferencia es todo el negocio. La empresa no construyó nada, no entregó nada y solo produjo un contrato.",
          "No todo intermediario es un problema. Un distribuidor con cadenas de suministro reales entrega bienes más baratos que la fábrica; un contratista general que coordina decenas de oficios se gana su comisión. La variante de fraude es más estrecha: el intermediario no agrega valor más allá del acto de contratar, y aun así el gobierno paga más de lo que habría pagado a la firma que ejecuta. El mecanismo sobrevive a una auditoría contrato por contrato y opera a escala durante décadas.",
          "El Patrón 3 de RUBLI atrapa al intermediario en pleno flujo. Lee tres señales: un desajuste entre el código de industria de la actividad declarada de la firma y lo que sus contratos exigen; crecimiento rápido de un historial delgado a un portafolio masivo; y la firma financiera de paso — valores de contrato enormes sostenidos sobre activos fijos mínimos. Ninguna prueba fraude. Juntas describen una forma.",
          "La forma se repite 2,974 veces, y se agrupa donde la diferencia vale la pena tomarse. Infraestructura encabeza: 1,128 proveedores P3, 179.5 mil millones de pesos. Energía sigue: 463 proveedores en PEMEX y CFE, 130.6 mil millones. Salud es tercero: 476 proveedores, 104.2 mil millones en medicamentos y equipo médico. Tres sectores, 414 mil millones de pesos — y eso antes del resto del mapa.",
        ],
        pullquote: {
          quote:
            "A peso enters, a peso leaves, and a firm in between produces only a contract. Repeat the shape 2,974 times and, in three sectors alone, the spread is worth 414 billion pesos.",
          quote_es:
            "Entra un peso, sale un peso, y una firma en medio solo produce un contrato. Repitan la forma 2,974 veces y, solo en tres sectores, la diferencia vale 414 mil millones de pesos.",
          stat: '414B MXN',
          statLabel: "P3 contracts in infrastructure + energy + health",
          statLabel_es: "contratos P3 en infraestructura + energía + salud",
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
        title: "The Channels the Money Runs Through",
        title_es: "Los canales por donde corre el dinero",
        subtitle: "Where the broker layer is thickest",
        subtitle_es: "Dónde es más espesa la capa de intermediación",
        prose: [
          "The broker layer pools where three currents meet: high contract value, technical complexity, and thin oversight. The chart below ranks all eight channels by the pesos the pattern moves — 526.8 billion in total. Infrastructure is the widest gate at 179.5 billion. SCT/SICT and CONAGUA are the largest buyers, regional infrastructure funds feed the states and municipalities, and Pemex's own civil works — offshore platforms, refinery upgrades, pipeline construction — add a second layer on top.",
          "Energy's 130.6 billion run through PEMEX Exploración y Producción and CFE. Here the real suppliers are often international — Schlumberger, Siemens, GE — reached through local intermediary partners. The markup is either legitimate localization or pure rent extraction, and only contract-level analysis tells the two apart.",
          "Health's 104.2 billion move through the Maypo-Grupo Fármacos-PISA-DIMM distribution cluster, medical-equipment resellers, and lab-service providers. This channel is the easiest to test: the real manufacturers are globally known, and their direct-to-government prices are public elsewhere — a ready benchmark for what the spread costs.",
          "Below health the volumes drop sharply: Hacienda 40.9 billion, Educación 19.1, Agricultura 18.8, Gobernación 17.8, Defensa 15.9. Subcontracting itself is legal — Art. 5 of the Ley de Obras Públicas permits it. The pattern simply follows the value.",
        ],
        prose_es: [
          "La capa de intermediación se acumula donde se encuentran tres corrientes: alto valor del contrato, complejidad técnica y fiscalización delgada. La gráfica de abajo ordena los ocho canales por los pesos que el patrón mueve — 526.8 mil millones en total. Infraestructura es la compuerta más ancha, con 179.5 mil millones. SCT/SICT y CONAGUA son las compradoras más grandes, los fondos regionales de infraestructura alimentan a estados y municipios, y la obra civil de Pemex — plataformas costa afuera, modernización de refinerías, construcción de ductos — agrega una segunda capa encima.",
          "Los 130.6 mil millones de energía corren por PEMEX Exploración y Producción y la CFE. Aquí los suministradores reales suelen ser internacionales — Schlumberger, Siemens, GE — alcanzados a través de socios locales de intermediación. El sobreprecio es localización legítima o pura extracción de renta, y solo el análisis a nivel contrato distingue una de otra.",
          "Los 104.2 mil millones de salud se mueven por el cúmulo de distribución Maypo-Grupo Fármacos-PISA-DIMM, revendedores de equipo médico y proveedores de laboratorio. Este canal es el más fácil de probar: los fabricantes reales son conocidos en todo el mundo y sus precios de venta directa a gobiernos son públicos en otros países — un referente listo para saber cuánto cuesta la diferencia.",
          "Por debajo de salud los volúmenes caen abruptamente: Hacienda 40.9 mil millones, Educación 19.1, Agricultura 18.8, Gobernación 17.8, Defensa 15.9. Subcontratar es legal en sí mismo — el Art. 5 de la Ley de Obras Públicas lo permite. El patrón simplemente sigue al valor.",
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
            "1,128 intermediary-pattern vendors in infrastructure alone. The pass-through industry in this one sector is larger than Mexico's annual federal education budget.",
          quote_es:
            "1,128 proveedores con patrón de intermediario solo en infraestructura. La industria del paso en este único sector es más grande que el presupuesto federal anual de educación de México.",
          stat: '1,128',
          statLabel: "P3 vendors in infraestructura",
          statLabel_es: "proveedores P3 en infraestructura",
        },
        sources: [
          'RUBLI P3 sector analysis, April 2026.',
          'Ley de Obras Públicas y Servicios Relacionados con las Mismas (LOPSRM), Art. 5 — subcontracting provisions.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: "Where the Margin Is Skimmed",
        title_es: "Donde se descrema el margen",
        subtitle: "Named brokers, the ticket signature, and the prototype",
        subtitle_es: "Intermediarios con nombre, la firma del ticket y el prototipo",
        prose: [
          "The flow becomes a number: the ticket. CONSTRUCTORA ARHNOS won 32.0 billion pesos across six contracts with state public-works secretariats — a 5.3-billion average ticket, where a normal infrastructure contract runs one to ten million. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA collected 21.1 billion across three IMSS contracts, 7.0 billion each. CAABSA CONSTRUCTORA took 9.2 billion across three CDMX contracts at risk 0.72. The signature is the same every time: a handful of contracts, each carrying a value legitimate firms reach only across a working lifetime.",
          "This flow has a documented prototype. La Estafa Maestra ran federal agencies through public universities, which subcontracted to phantom companies, which returned the money to the originating officials. The 2017 parliamentary inquiry and the MCCI/Animal Político investigation found 7.67 billion pesos moved through the structure in 2013–2014 alone. It worked because Art. 1, último párrafo of the Ley de Adquisiciones exempts university contracts from competitive bidding. RUBLI's ground-truth database carries the case; the directly-linked vendors score 0.55 to 0.65.",
          "The structure outlived its legal vehicle. The universities were one route; the same flow runs through any statute that permits subcontracting — Art. 5 of the Ley de Obras Públicas, Art. 41 of the Ley de Adquisiciones for recurring-vendor direct awards. The 2,974 P3 vendors are the structural successors: different shells, same role. Each is an investigative thread — who owns it, who does the real work, and what the spread is.",
          "At the top end the model and the editorial read diverge. Three foreign oilfield-services contractors sit among the top-value names — TÉCNICAS REUNIDAS (7.2B / 2 PEMEX contracts, risk 0.89), a Petrobras-led JV (5.9B / 2, risk 0.90), and PRIDE INTERNATIONAL (5.5B / 6 PEMEX offshore, risk 0.95). All three are on RUBLI's structural-FP exclusion list precisely because the model otherwise flags them: a narrow supplier market produces the same statistical signature as pass-through fraud. All ten top-value P3 vendors land in the high-or-critical band. The work is no longer separating two populations — it is telling apart real fraud from a model artifact of legitimately concentrated markets.",
        ],
        prose_es: [
          "El flujo se vuelve un número: el ticket. CONSTRUCTORA ARHNOS ganó 32.0 mil millones de pesos en seis contratos con secretarías estatales de obras públicas — un ticket promedio de 5.3 mil millones, donde un contrato normal de infraestructura va de uno a diez millones. PROMOTORA Y DESARROLLADORA MEXICANA DE INFRAESTRUCTURA cobró 21.1 mil millones en tres contratos del IMSS, 7.0 mil millones cada uno. CAABSA CONSTRUCTORA tomó 9.2 mil millones en tres contratos de la CDMX con riesgo 0.72. La firma es la misma siempre: un puñado de contratos, cada uno con un valor que las firmas legítimas alcanzan apenas a lo largo de toda una vida de trabajo.",
          "Este flujo tiene un prototipo documentado. La Estafa Maestra pasó dependencias federales por universidades públicas, que subcontrataban con empresas fantasma, que devolvían el dinero a los funcionarios que lo originaron. La investigación parlamentaria de 2017 y la de MCCI/Animal Político encontraron 7.67 mil millones de pesos movidos por la estructura solo en 2013–2014. Funcionó porque el Art. 1, último párrafo de la Ley de Adquisiciones exime de licitación competitiva a los contratos con universidades. La base de casos comprobados de RUBLI registra el caso; los proveedores directamente vinculados puntúan de 0.55 a 0.65.",
          "La estructura sobrevivió a su vehículo legal. Las universidades fueron una ruta; el mismo flujo corre por cualquier estatuto que permita subcontratar — el Art. 5 de la Ley de Obras Públicas, el Art. 41 de la Ley de Adquisiciones para adjudicaciones directas a proveedores recurrentes. Los 2,974 proveedores P3 son los sucesores estructurales: distintas fachadas, mismo papel. Cada uno es un hilo investigativo — quién lo posee, quién hace el trabajo real y cuál es la diferencia.",
          "En la cima, el modelo y la lectura editorial divergen. Tres contratistas extranjeros de servicios petroleros figuran entre los nombres de mayor valor — TÉCNICAS REUNIDAS (7.2 mil millones / 2 contratos PEMEX, riesgo 0.89), un consorcio liderado por Petrobras (5.9 mil millones / 2, riesgo 0.90) y PRIDE INTERNATIONAL (5.5 mil millones / 6 costa afuera en PEMEX, riesgo 0.95). Los tres están en la lista de exclusión de FP estructurales de RUBLI precisamente porque el modelo de otra forma los marca: un mercado de proveedores reducido produce la misma firma estadística que el fraude de paso. Los diez proveedores P3 de mayor valor caen en la banda alta-o-crítica. El trabajo ya no es separar dos poblaciones — es distinguir el fraude real de un artefacto del modelo en mercados legítimamente concentrados.",
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
            "CONSTRUCTORA ARHNOS won 32 billion pesos across six contracts. The average ticket is 5.3 billion. Legitimate infrastructure firms operate at one-thousandth of that scale.",
          quote_es:
            "CONSTRUCTORA ARHNOS ganó 32 mil millones de pesos en seis contratos. El ticket promedio es 5.3 mil millones. Las firmas legítimas de infraestructura operan a una milésima de esa escala.",
          stat: '5.3B MXN',
          statLabel: "average ticket per contract — Constructora ARHNOS, six contracts",
          statLabel_es: "ticket promedio por contrato — Constructora ARHNOS, seis contratos",
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
        title: "Where It Lands",
        title_es: "Dónde aterriza",
        subtitle: "The flow dead-ends in an enforcement void",
        subtitle_es: "El flujo termina en un vacío de fiscalización",
        prose: [
          "Follow the peso to its destination and it dead-ends. Subcontracting is legal; the crime, if there is one, lives in the spread, and the spread lives in bank records no one has subpoenaed. Proving inflation, laundering, or rigged competition means tracing money through multiple corporate structures — forensic work Mexican agencies rarely complete at scale.",
          "The tools exist but sit idle. The UIF has jurisdiction over money-laundering flows but does not monitor procurement payment chains, and it already drowns under roughly 20,000 suspicious-activity reports a year across the whole economy. Mexico ratified the UN Convention Against Corruption in 2004, committing to criminalize 'abuse of functions' — broad enough to cover systematic overpriced intermediation — yet that provision has never been applied to procurement at scale.",
          "The void has a precise shape. UIF traces flows, not payment chains. SFP audits procurement units and officials. ASF audits individual contracts, not aggregate sectoral density. The one body with jurisdiction over anticompetitive procurement is COFECE — and it has brought essentially no procurement-cartel case in five years, despite repeated OECD recommendations. Its docket is telecom, banking, retail. Even if it acted, the law may not fit: Art. 53 requires proof of coordination between competing bidders, and a pure pass-through bidding against no one may fall outside it.",
          "That is the mismatch the data exposes. Mexico's architecture targets one contract, one bribe, one official; the pattern runs at the scale of 2,974 vendors and 526 billion pesos. The P3 list is the pre-filter that could change the math — naming the vendors and posing three questions for each: who is the underlying subcontractor, what is the price spread, and is that spread legitimate coordination or rent. Until the law catches up to the pattern, enforcement keeps chasing single trees while the forest grows.",
        ],
        prose_es: [
          "Sigan el peso hasta su destino y se topará con un muro. Subcontratar es legal; el delito, si lo hay, vive en la diferencia, y la diferencia vive en registros bancarios que nadie ha solicitado. Probar inflación, lavado o competencia amañada significa rastrear el dinero por múltiples estructuras corporativas — trabajo forense que las agencias mexicanas rara vez completan a escala.",
          "Las herramientas existen pero permanecen ociosas. La UIF tiene jurisdicción sobre flujos de lavado pero no monitorea las cadenas de pago de la contratación, y ya se ahoga bajo unos 20,000 reportes de actividad sospechosa al año en toda la economía. México ratificó la Convención de las Naciones Unidas contra la Corrupción en 2004, comprometiéndose a tipificar el 'abuso de funciones' — categoría amplia para cubrir la intermediación sistemática con sobreprecio — y aun así esa disposición nunca se ha aplicado a la contratación a escala.",
          "El vacío tiene una forma precisa. La UIF rastrea flujos, no cadenas de pago. La SFP audita unidades compradoras y funcionarios. La ASF audita contratos individuales, no la densidad sectorial agregada. El único organismo con jurisdicción sobre la contratación anticompetitiva es la COFECE — y no ha presentado prácticamente ningún caso de cártel de compras en cinco años, a pesar de las recomendaciones repetidas de la OCDE. Su agenda es telecom, banca y comercio. Aun si actuara, la ley puede no encajar: el Art. 53 exige prueba de coordinación entre licitantes competidores, y una estructura pura de paso que no licita contra nadie puede quedar fuera.",
          "Ese es el desajuste que los datos exponen. La arquitectura mexicana ataca un contrato, un soborno, un funcionario; el patrón corre a escala de 2,974 proveedores y 526 mil millones de pesos. La lista P3 es el pre-filtro que podría cambiar la cuenta — nombrando a los proveedores y planteando tres preguntas para cada uno: quién es el subcontratista subyacente, cuál es la diferencia de precio, y si esa diferencia es coordinación legítima o renta. Hasta que la ley alcance al patrón, la fiscalización seguirá persiguiendo árboles sueltos mientras crece el bosque.",
        ],
        pullquote: {
          quote:
            "Mexico's architecture targets one contract, one bribe, one official. The broker industry runs at pattern scale — and COFECE, the one body with jurisdiction, has brought essentially no procurement-cartel case in five years.",
          quote_es:
            "La arquitectura mexicana ataca un contrato, un soborno, un funcionario. La industria del intermediario corre a escala de patrón — y la COFECE, el único organismo con jurisdicción, no ha presentado prácticamente ningún caso de cártel de compras en cinco años.",
          stat: '0',
          statLabel: "major COFECE procurement cartel cases, last 5 years",
          statLabel_es: "casos COFECE de cártel de contratación, últimos 5 años",
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
    headline: "A Line in the Law, and the Crowd Beneath It",
    headline_es: "Una línea en la ley, y la multitud debajo de ella",
    subheadline:
      "28,264 federal contracts were written for exactly 210,000 pesos — 76 percent more than the bucket just below it. Two more crowds pile at 250,000 and 300,000 pesos, each a value where Mexican law lets a buyer switch off competition. Across 3.05 million contracts the spikes line up with the rules, not with prices. Honest pricing cannot produce them. Contract-splitting can — and Art. 17 of the procurement law bans exactly that.",
    subheadline_es:
      "28,264 contratos federales se escribieron en exactamente 210,000 pesos — 76 por ciento más que el cubo justo debajo. Otras dos multitudes se apilan en 250,000 y 300,000 pesos, cada uno un valor donde la ley mexicana permite apagar la competencia. A lo largo de 3.05 millones de contratos, los picos se alinean con las reglas, no con los precios. Una fijación honesta de precios no los produce. El fraccionamiento sí — y el Art. 17 de la ley de adquisiciones prohíbe exactamente eso.",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 14,
    status: 'solo_datos',
    leadStat: {
      value: '28,264',
      label: "contracts piled at exactly 210K MXN",
      label_es: "contratos amontonados exactamente en 210 mil pesos",
      sublabel: "76% above the baseline just below it",
      sublabel_es: "76% sobre la línea base justo debajo",
      color: '#f59e0b',
    },
    kickerStats: [
      {
        value: '28,264',
        suffix: "contracts at exactly 210K MXN",
        suffix_es: "contratos exactamente en 210 mil pesos",
        tone: 'critical',
      },
      {
        value: '76%',
        suffix: "above the baseline at the line",
        suffix_es: "sobre la línea base en el umbral",
        tone: 'data',
      },
      {
        value: 'Art. 17',
        suffix: "bans the splitting; the data ignores it",
        suffix_es: "prohíbe el fraccionamiento; los datos lo ignoran",
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
        title: "Stand at the Line",
        title_es: "Párate en la línea",
        subtitle: "Contract volume from 200K to 400K pesos, in 10K buckets",
        subtitle_es: "Volumen de contratos de 200K a 400K pesos, en cubos de 10K",
        prose: [
          "At exactly 210,000 pesos, 28,264 federal contracts pile up. The bucket just below — 200,000 pesos — holds 16,075. The crowd at the line runs 76 percent higher than the crowd one step beneath it. 210,000 pesos is not a price. It is a value in Mexican procurement law where the rules quietly change and competition can be switched off.",
          "Two more crowds form on the same logic: 24,966 contracts at 250,000 pesos, 22,064 at 300,000. Plot all 3.05 million federal contracts awarded from 2002 to 2025 in the 200K-to-400K band, in 10,000-peso buckets, and a clean downward slope appears underneath — about 16,000 contracts at 200K easing to roughly 12,000 at 400K, exactly as larger contracts thin out. Three buckets jut straight up through that slope.",
          "Walk the silhouette. The 250K bucket (24,966) sits above its neighbors at 240K (23,331) and 260K (24,841). The 300K bucket (22,064) rises over 290K (18,925) and 310K (16,024). A secondary plateau holds across 220K-260K — 27,773 at 220K, 24,820 at 230K — staying high where the rest of the curve has begun to fall. Past 300K the descent resumes: 15,914 at 320K, 14,304 at 350K, 12,599 at 380K, 12,045 at 400K.",
          "A vendor delivering 300,000 pesos of goods is no likelier to invoice exactly 300,000 than 297,000 or 303,000. Real prices spread out, peaking only where the world genuinely clusters — UMA multiples, catalog round numbers, fixed regulatory fees. These spikes do the opposite. They are not a pricing pattern. They are a statistical signature: a crowd that forms because the line is worth crowding beneath.",
        ],
        prose_es: [
          "En exactamente 210,000 pesos se apilan 28,264 contratos federales. El cubo justo debajo — 200,000 pesos — guarda 16,075. La multitud en la línea corre 76 por ciento por encima de la que está un escalón abajo. 210,000 pesos no es un precio. Es un valor en la ley mexicana de adquisiciones donde las reglas cambian discretamente y la competencia puede apagarse.",
          "Otras dos multitudes se forman con la misma lógica: 24,966 contratos en 250,000 pesos, 22,064 en 300,000. Grafica los 3.05 millones de contratos federales adjudicados de 2002 a 2025 en la banda de 200K a 400K, en cubos de 10,000 pesos, y debajo aparece una pendiente limpia y descendente — unos 16,000 contratos en 200K que bajan a cerca de 12,000 en 400K, justo como se adelgazan los contratos grandes. Tres cubos brincan derecho hacia arriba a través de esa pendiente.",
          "Recorre la silueta. El cubo de 250K (24,966) se sienta sobre sus vecinos en 240K (23,331) y 260K (24,841). El cubo de 300K (22,064) se eleva sobre 290K (18,925) y 310K (16,024). Una meseta secundaria se sostiene a lo largo de 220K-260K — 27,773 en 220K, 24,820 en 230K — y se mantiene alta donde el resto de la curva ya empezó a caer. Pasando 300K el descenso retoma: 15,914 en 320K, 14,304 en 350K, 12,599 en 380K, 12,045 en 400K.",
          "Un proveedor que entrega 300,000 pesos en bienes no tiene más probabilidad de facturar exactamente 300,000 que 297,000 o 303,000. Los precios reales se reparten y solo pican donde el mundo genuinamente se agrupa — múltiplos de UMA, números redondos de catálogo, tarifas regulatorias fijas. Estos picos hacen lo contrario. No son un patrón de precio. Son una firma estadística: una multitud que se forma porque la línea vale la pena aglomerarse debajo.",
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
                annotation: '+76% vs floor',
                annotation_es: '+76% vs base',
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
                annotation: '300K legal line',
                annotation_es: 'línea legal 300K',
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
            referenceLine: {
              value: 16075,
              label: 'baseline floor · 16K',
              label_es: 'línea base · 16K',
              color: 'var(--color-text-secondary)',
            },
            annotation:
              'Anomalous spikes at 210K, 250K, and 300K suggest artificial contract splitting.',
            annotation_es:
              'Picos anómalos en 210K, 250K y 300K sugieren división artificial de contratos.',
          },
        },
        pullquote: {
          quote:
            "28,264 contracts at exactly 210,000 pesos. The bucket immediately below holds 16,075. This is not a pricing pattern. It is a procedural escape.",
          quote_es:
            "28,264 contratos exactamente en 210,000 pesos. El cubo inmediatamente debajo guarda 16,075. No es un patrón de precio. Es un escape procedimental.",
          stat: '28,264',
          statLabel: "contracts at exactly 210K MXN",
          statLabel_es: "contratos exactamente en 210 mil pesos",
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
        title: "Why the Crowd Forms",
        title_es: "Por qué se forma la multitud",
        subtitle: "The legal magnet, the splitting engine, and the roster that works the line",
        subtitle_es: "El imán legal, el motor de fragmentación y el padrón que trabaja la línea",
        prose: [
          "DICONSA awarded 985 suspicious clusters — three or more contracts to the same vendor, on the same day, each in the 195K-305K threshold band — 3,395 split contracts worth 829.6 million pesos. Count those clusters across every federal institution and the histogram gets names. Its renamed successor, Alimentación para el Bienestar, adds 230 clusters and 869 contracts (214.2M MXN). Both move bulk staples against a thin oversight surface — large recurrent buying, a mechanism distinct from day-of splitting.",
          "The pull is written in law. Below certain values a buyer may use \"invitación a cuando menos tres personas\" — a simplified three-vendor invitation under Art. 42 of the Ley de Adquisiciones — instead of full competitive bidding; below others, direct adjudication with no procedure at all. The 300,000-peso value has historically sat near the invitación-a-tres threshold; 210,000 and 250,000 map to subdivision and small-value limits. The exact figures drift each year as UMA values update, but the structure of Art. 43, and the bunching just beneath it, hold constant. To hand a predetermined vendor a contract without competition, sizing it just under the line is the reliable legal route.",
          "Art. 17 of the same law forbids the trick: the procurement of one good or service may not be fragmented to evade required procedures. The data ignores the ban. RUBLI's z-score analysis of same-day awards — same vendor, same day, same institution — finds thousands of cases split into multiple sub-threshold contracts. In extreme cases a single unit fires 10 to 20 contracts in one day to one vendor for what is plainly one need. A 2019 World Bank study found threshold splitting added 8 to 12 percent to unit prices by killing volume discounts; across tens of thousands of Mexican contracts at threshold values, the aggregate distortion plausibly runs into the billions of pesos a year.",
          "The editorial finding is healthcare. IMSS ranks second by cluster count — 588 clusters, 2,109 split contracts, 519.5M MXN — followed by ISSSTE (77 clusters, 302 contracts, 75.1M), the INCMNSZ-Salvador Zubirán (69 clusters, 268 contracts, 65.7M), and the federal Secretaría de Salud (15 clusters, 132 contracts, 30.1M). The rest fills out the curve: CFE (47 clusters, 162 contracts, 40.1M), CONALITEG (36 clusters, 132 contracts, 31.7M), Puebla's Comité Educativo (27 clusters, 186 contracts, 46.2M), SEMAR (19 clusters, 61 contracts, 15.2M), PROFECO (18 clusters, 89 contracts, 20.8M), IPN (14 clusters, 53 contracts, 13.0M). Medical-supply procurement rarely needs day-of fragmentation, which is exactly why the pattern reads loudest there. Sum the excess across the spike buckets and roughly 30,000 to 40,000 contracts were structured at threshold values instead of at natural prices — each one a purchase that could have gone to competition and was sized to avoid it.",
        ],
        prose_es: [
          "DICONSA adjudicó 985 cúmulos sospechosos — tres o más contratos al mismo proveedor, el mismo día, cada uno en la banda umbral de 195K-305K — 3,395 contratos divididos por 829.6 millones de pesos. Cuenta esos cúmulos en cada institución federal y el histograma cobra nombres. Su entidad sucesora renombrada, Alimentación para el Bienestar, suma 230 cúmulos y 869 contratos (214.2 M MXN). Ambas mueven productos básicos a granel contra una superficie de fiscalización delgada — compra grande y recurrente, un mecanismo distinto del fraccionamiento del mismo día.",
          "El imán está escrito en la ley. Por debajo de ciertos valores una unidad compradora puede usar la \"invitación a cuando menos tres personas\" — procedimiento simplificado de tres proveedores bajo el Art. 42 de la Ley de Adquisiciones — en vez de licitación competitiva plena; por debajo de otros, adjudicación directa sin procedimiento alguno. El valor de 300,000 pesos ha estado históricamente cerca del umbral de invitación a tres; 210,000 y 250,000 corresponden a límites de subdivisión y de bajo valor. Los números exactos se desplazan año con año conforme se actualiza la UMA, pero la estructura del Art. 43, y el agrupamiento justo debajo, se mantienen constantes. Para entregar a un proveedor predeterminado un contrato sin competencia, dimensionarlo justo por debajo de la línea es la ruta legal confiable.",
          "El Art. 17 de la misma ley prohíbe el truco: la contratación de un bien o servicio no podrá fragmentarse para evadir los procedimientos exigidos. Los datos ignoran la prohibición. El análisis z-score de RUBLI sobre adjudicaciones del mismo día — mismo proveedor, mismo día, misma institución — encuentra miles de casos divididos en varios contratos por debajo del umbral. En casos extremos una sola unidad adjudica de 10 a 20 contratos en un día a un proveedor para lo que claramente es una sola necesidad. Un estudio del Banco Mundial de 2019 halló que la fragmentación por umbral añadía entre 8 y 12 por ciento a los precios unitarios al matar los descuentos por volumen; a través de decenas de miles de contratos mexicanos en valores umbral, la distorsión agregada plausiblemente alcanza miles de millones de pesos al año.",
          "El hallazgo editorial es el sector salud. El IMSS se ubica segundo por número de cúmulos — 588 cúmulos, 2,109 contratos divididos, 519.5 M MXN — seguido por ISSSTE (77 cúmulos, 302 contratos, 75.1 M), el INCMNSZ-Salvador Zubirán (69 cúmulos, 268 contratos, 65.7 M) y la Secretaría de Salud federal (15 cúmulos, 132 contratos, 30.1 M). El resto completa la curva: CFE (47 cúmulos, 162 contratos, 40.1 M), CONALITEG (36 cúmulos, 132 contratos, 31.7 M), el Comité Educativo de Puebla (27 cúmulos, 186 contratos, 46.2 M), SEMAR (19 cúmulos, 61 contratos, 15.2 M), PROFECO (18 cúmulos, 89 contratos, 20.8 M), IPN (14 cúmulos, 53 contratos, 13.0 M). La contratación de insumos médicos rara vez necesita fragmentarse en un mismo día, y por eso ahí el patrón suena más fuerte. Suma el exceso en los cubos pico y aproximadamente 30,000 a 40,000 contratos fueron estructurados en valores umbral en vez de en precios naturales — cada uno una compra que pudo ir a competencia y fue dimensionada para evitarla.",
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
                color: '#dc2626',
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
                color: '#dc2626',
                annotation: 'SALUD · MEDICAL SUPPLY · 302 CONTRACTS · 75.1M MXN',
                annotation_es: 'SALUD · INSUMOS MÉDICOS · 302 CONTRATOS · 75.1 M MXN',
              },
              {
                label: 'INCMNSZ Salvador Zubirán',
                label_es: 'INCMNSZ Salvador Zubirán',
                value: 69,
                highlight: true,
                color: '#dc2626',
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
            "Three statistical spikes in a 200K range, each aligned with a regulatory line. Sum the excess and roughly 40,000 contracts were structured to escape competition.",
          quote_es:
            "Tres picos estadísticos en un rango de 200K, cada uno alineado con una línea regulatoria. Suma el exceso y unos 40,000 contratos fueron estructurados para escapar de la competencia.",
          stat: '~40,000',
          statLabel: "excess contracts at threshold values",
          statLabel_es: "contratos en exceso en valores umbral",
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
        title: "Visible to Everyone, Enforced by No One",
        title_es: "Visible para todos, fiscalizado por nadie",
        subtitle: "Easy to detect, hard to prosecute, audited at neither end",
        subtitle_es: "Fácil de detectar, difícil de imputar, sin auditoría en ningún extremo",
        prose: [
          "After 14 years, threshold-clustering has produced 0 systemic enforcement cases. The pattern is one of the easiest procurement frauds to detect — counting contracts at fixed values against a baseline runs in seconds on the full CompraNet dataset — and one of the hardest to prosecute. Each contract is a legitimate, documented, defensible purchase. The fraud lives in the aggregate decision to fragment, which is the only place it can be proven.",
          "Among threshold-cluster contracts, 75 percent are direct awards — no competition, no public tender — against an OECD ceiling of 30 percent for non-competitive procedures. The escape the line was built to enable has become the default.",
          "The enforcement geography explains the silence. Small sub-threshold contracts fall outside the federal audit net: the ASF spends its limited capacity on large contracts, and SFP pattern audits, when they happen, hit high-profile units rather than the diffuse municipal and decentralized bodies where splitting concentrates. It mirrors the failure at the top. Five-billion-peso contracts escape audit because they are politically dangerous to touch; 210,000-peso contracts escape because they are individually too small to be worth investigating. Opposite ends of the value spectrum, the same result — procurement without meaningful oversight.",
          "What is missing is will, not capability. RUBLI's clustering detection already hands investigators a target list: units firing 20 contracts of exactly 300,000 pesos in a week, vendors that live only in threshold-adjacent awards. The remedies are well-established — automatic threshold-adjacency flagging at data entry, mandatory explanation when same-vendor same-day awards aggregate above the line, algorithmically prioritized SFP audits, and aggregation rules that treat a series of related contracts as one procurement. The EU's Directive 2014/24/EU already requires that aggregation in Art. 5; Mexican law has not fully adopted it, even though Art. 17 already supplies the prohibition. CompraNet holds every byte needed. The spikes at 210K, 250K and 300K are printed in public data for anyone able to read them. The question is no longer whether this happens at scale — it does — but when Mexican institutions will act on a number they can already see.",
        ],
        prose_es: [
          "Tras 14 años, el agrupamiento en umbrales ha producido 0 casos sistémicos de fiscalización. El patrón es de los fraudes en contratación más fáciles de detectar — contar contratos en valores fijos contra una línea base corre en segundos sobre todo el dataset de CompraNet — y de los más difíciles de imputar. Cada contrato es una compra legítima, documentada y defendible. El fraude vive en la decisión agregada de fragmentar, el único lugar donde puede probarse.",
          "Entre los contratos en cúmulo de umbral, el 75 por ciento son adjudicaciones directas — sin competencia, sin licitación pública — contra un techo de la OCDE de 30 por ciento para procedimientos no competitivos. El escape que la línea fue construida para habilitar se volvió la regla por defecto.",
          "La geografía de la fiscalización explica el silencio. Los contratos chicos por debajo del umbral caen fuera de la red de auditoría federal: la ASF gasta su capacidad limitada en contratos grandes, y las auditorías de patrón de la SFP, cuando ocurren, golpean unidades de alto perfil en vez de los cuerpos municipales y descentralizados donde se concentra la fragmentación. Es el espejo de la falla en el extremo alto. Los contratos de cinco mil millones de pesos escapan a la auditoría porque son políticamente peligrosos de tocar; los de 210,000 pesos escapan porque son individualmente demasiado chicos para investigarlos. Extremos opuestos del espectro de valor, el mismo resultado — contratación sin fiscalización significativa.",
          "Lo que falta es voluntad, no capacidad. La detección de cúmulos de RUBLI ya entrega a los investigadores una lista de blancos: unidades que adjudican 20 contratos de exactamente 300,000 pesos en una semana, proveedores que viven solo en adjudicaciones colindantes al umbral. Los remedios están bien establecidos — marcado automático de colindancia con umbral al registro, explicación obligatoria cuando las adjudicaciones del mismo día al mismo proveedor agregan por encima de la línea, auditorías de la SFP priorizadas algorítmicamente, y reglas de agregación que tratan una serie de contratos relacionados como una sola contratación. La Directiva 2014/24/UE de la UE ya exige esa agregación en su Art. 5; la ley mexicana no la ha adoptado plenamente, aunque el Art. 17 ya provee la prohibición. CompraNet guarda cada byte necesario. Los picos en 210K, 250K y 300K están impresos en datos públicos para cualquiera capaz de leerlos. La pregunta ya no es si esto ocurre a escala — sí ocurre — sino cuándo las instituciones mexicanas actuarán sobre un número que ya pueden ver.",
        ],
        pullquote: {
          quote:
            "The line is printed, statistically, in public data for anyone able to read it. In 14 years it has produced zero systemic enforcement cases.",
          quote_es:
            "La línea está impresa, estadísticamente, en datos públicos para cualquiera capaz de leerla. En 14 años ha producido cero casos sistémicos de fiscalización.",
          stat: '0',
          statLabel: "systemic enforcement cases against threshold-clustering in 14 years",
          statLabel_es:
            "casos sistémicos de fiscalización contra el agrupamiento en umbrales en 14 años",
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
    headline: "The Smoking Gun Is a Number",
    headline_es: "La pistola humeante es un número",
    subheadline:
      "A pharmaceutical distributor billed the IMSS nine times its own price for the same goods. Then an algorithm, handed eighteen ways to detect fraud, chose to watch exactly that.",
    subheadline_es:
      "Un distribuidor farmacéutico le facturó al IMSS nueve veces su propio precio por los mismos bienes. Después un algoritmo, con dieciocho formas de detectar el fraude, eligió vigilar precisamente eso.",
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 12,
    status: 'solo_datos',
    leadStat: {
      value: '+0.558',
      label: "price_volatility coefficient — v0.8.5",
      label_es: "coeficiente price_volatility — v0.8.5",
      sublabel: "the model's strongest signal · 43% ahead of the next feature",
      sublabel_es: "la señal más fuerte del modelo · 43% por encima de la siguiente",
      color: '#dc2626',
    },
    kickerStats: [
      {
          suffix_es: "su propio precio.",
          prefix_es: "Un distribuidor facturó",
        prefix: "One distributor billed",
        value: '9×',
        suffix: "its own price.",
        tone: 'critical',
      },
      {
          prefix_es: "Con 18 formas de detectar el fraude, el modelo eligió",
        prefix: "Given 18 ways to detect fraud, the model chose",
        value: 'price_volatility',
        suffix: "",
        tone: 'data',
      },
      {
          suffix_es: ".",
          prefix_es: "Superó a todas las demás señales por",
        prefix: "It outranked every other signal by",
        value: '43%',
        suffix: ".",
        tone: 'muted',
      },
    ],
    chapters: [
      {
        id: 'ch1',
        number: 1,
        title: "MX$3 Million in February. MX$27 Million in June.",
        title_es: "MX$3 millones en febrero. MX$27 millones en junio.",
        subtitle: "One distributor, one IMSS category, the same goods — and a price that rose ninefold in four months",
        subtitle_es: "Un distribuidor, una categoría del IMSS, los mismos bienes — y un precio que se multiplicó por nueve en cuatro meses",
        prose: [
          "In February 2020, a pharmaceutical distributor billed the IMSS MX$3 million for a delivery. In June, in the same acquisition category, with the same institution, for structurally comparable goods, it billed MX$27 million. The price rose ninefold in four months. The contract was a direct award. The official's signature is on it. The public record shows no change of specifications and no scope justification.",
          "A price set by competition moves inside a narrow band; stable costs make stable prices. This one did not move — it jumped. The MX$27 million figure did not come from the market. It came from a number an approving official was willing to sign.",
          "This single invoice is not proof of a crime. It is proof that the price was negotiated, not competed. The question that drives everything below is whether it is one bad contract or the visible edge of a pattern. The chart is the exhibit: this distributor's own IMSS contract history, 2019 through 2022.",
        ],
        prose_es: [
          "En febrero de 2020, un distribuidor farmacéutico le facturó al IMSS MX$3 millones por una entrega. En junio, en la misma categoría de adquisición, con la misma institución, por bienes estructuralmente comparables, le facturó MX$27 millones. El precio se multiplicó por nueve en cuatro meses. El contrato fue adjudicación directa. La firma del funcionario está ahí. El registro público no muestra cambio de especificaciones ni justificación de alcance.",
          "Un precio fijado por la competencia se mueve dentro de un rango estrecho; los costos estables producen precios estables. Este no se movió — saltó. Los MX$27 millones no salieron del mercado. Salieron de un número que un funcionario estuvo dispuesto a firmar.",
          "Esta sola factura no prueba un delito. Prueba que el precio se negoció, no se compitió. La pregunta que mueve todo lo de abajo es si se trata de un contrato malo o del borde visible de un patrón. La gráfica es la prueba: el historial de contratos de este distribuidor con el IMSS, de 2019 a 2022.",
        ],
        chartConfig: {
          type: 'vendor-price-trajectory',
          title: 'The exhibit: pharmaceutical distributor, IMSS contract history 2019–2022',
          title_es: 'La prueba: distribuidor farmacéutico, historial de contratos IMSS 2019–2022',
        },
        pullquote: {
          quote:
            "MX$3M in February. MX$27M in June. Same category, direct award, no spec change. That is the trace of a negotiated price.",
          quote_es:
            "MX$3M en febrero. MX$27M en junio. Misma categoría, adjudicación directa, sin cambio de especificaciones. Esa es la huella de un precio negociado.",
          stat: '9×',
          statLabel: "price swing within one vendor, one category, one year",
          statLabel_es: "variación de precio en un mismo proveedor, misma categoría, mismo año",
        },
        sources: [
          'Análisis SHAP RUBLI, contribuciones de price_volatility para proveedores P1, mayo 2026.',
          'OECD. (2022). OECD Principles for Integrity in Public Procurement.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: "The Algorithm Reached the Same Scene",
        title_es: "El algoritmo llegó a la misma escena",
        subtitle: "Handed eighteen candidate features, RUBLI's model made price_volatility its strongest signal — 43% ahead of anything else",
        subtitle_es: "Con dieciocho variables candidatas, el modelo de RUBLI hizo de price_volatility su señal más fuerte — 43% por encima de cualquier otra",
        prose: [
          "Out of eighteen candidate features, RUBLI's v0.8.5 model chose price_volatility as its single strongest predictor of corruption — +0.558, and 43% ahead of the next feature, price_ratio at +0.358. Nobody told it to. The model never saw the June invoice as anything special.",
          "It learned from the record. v0.8.5 trained on 1,554 documented vendors across 1,427 confirmed corruption cases — IMSS ghost-company networks, the Segalmex fraud, COVID irregularities, the university Estafa Maestra — using ElasticNet logistic regression tuned over 200 Optuna Bayesian trials. The contest was fair: eighteen features, equal footing, free to weight by the data. Six of the eighteen were regularized to exactly zero, discarded because they added nothing the price signals had not already captured.",
          "This is corroboration. An algorithm arrived at the same scene by a different road — aggregate statistics over millions of contracts, not one June delivery — and pointed at the same evidence. The +0.558 coefficient is a compressed judgment about what 1,427 corruption cases share: inconsistent prices for comparable work. The roster below is the structure the model built.",
        ],
        prose_es: [
          "De dieciocho variables candidatas, el modelo v0.8.5 de RUBLI eligió price_volatility como su predictor de corrupción más fuerte — +0.558, y un 43% por encima de la siguiente, price_ratio con +0.358. Nadie se lo pidió. El modelo nunca vio la factura de junio como algo especial.",
          "Aprendió del registro. v0.8.5 se entrenó con 1,554 proveedores documentados en 1,427 casos de corrupción confirmada — redes de empresas fantasma del IMSS, el fraude de Segalmex, irregularidades del COVID, La Estafa Maestra universitaria — con regresión logística ElasticNet afinada en 200 ensayos bayesianos de Optuna. El concurso fue justo: dieciocho variables, en igualdad de condiciones, libres de ponderarse según los datos. Seis de las dieciocho quedaron regularizadas a exactamente cero, descartadas porque no aportaban nada que las señales de precio no hubieran capturado ya.",
          "Esto es corroboración. Un algoritmo llegó a la misma escena por otro camino — estadística agregada sobre millones de contratos, no una entrega de junio — y apuntó a la misma evidencia. El coeficiente de +0.558 es un juicio comprimido sobre lo que comparten 1,427 casos de corrupción: precios inconsistentes para trabajo comparable. El roster de abajo es la estructura que el modelo construyó.",
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
            "De dieciocho variables candidatas el algoritmo eligió price_volatility sin que nadie se lo pidiera. Esa elección es el juicio del modelo sobre lo que comparten 1,427 casos de corrupción documentada.",
          stat: '+0.558',
          statLabel: "price_volatility · v0.8.5 · AUC test 0.785",
          statLabel_es: "price_volatility · v0.8.5 · AUC prueba 0.785",
        },
        sources: [
          'RUBLI v0.8.5 model. Run ID CAL-v8-202605020212. AUC test: 0.785. HR=11.0%.',
          'RUBLI docs/RISK_METHODOLOGY_v6.md — tabla de coeficientes, mayo 2026.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: "The Architecture of Suspicion",
        title_es: "La arquitectura de la sospecha",
        subtitle: "Seven risk signals on one side, one protective signal on the other — and six features the model threw away",
        subtitle_es: "Siete señales de riesgo de un lado, una protectora del otro — y seis variables que el modelo descartó",
        prose: [
          "One signal protects a vendor: institution_diversity, at -0.388. A distributor that serves many distinct institutions is structurally less suspect, because broad reach is the signature of a real market participant. It is the only protective coefficient that survived regularization. Everything else on the right of the ladder is an alarm — price volatility on top, then concentration in few contracts, then co-bidding networks.",
          "The six discarded features carry their own verdict: single-bid, year-end timing, industry mismatch, pub_delay_z, win_rate, sector_spread. Earlier versions — v3.3, v4.0 — treated some as primary indicators. v0.8.5 found that once price_volatility and price_ratio are in the model, they add no predictive power; direct_award itself survives only at -0.081. Single-bid is not irrelevant to corruption — it is already captured by the dominant price signals.",
          "The empirical finding is plain. Corruption in Mexican procurement shows up first in the price, not in the award mechanism or the timing. And the inconsistency of that price — billing 9× for comparable work — is the trace that most reliably separates the vendors in the 1,427 documented cases from those outside them. The June invoice is exactly what the top of this ladder is built to see.",
        ],
        prose_es: [
          "Una sola señal protege a un proveedor: institution_diversity, en -0.388. Un distribuidor que sirve a muchas instituciones distintas es estructuralmente menos sospechoso, porque el alcance amplio es la firma de un participante real del mercado. Es el único coeficiente protector que sobrevivió a la regularización. Todo lo demás a la derecha de la escalera es una alarma — la volatilidad de precios arriba, luego la concentración en pocos contratos, luego las redes de co-licitación.",
          "Las seis variables descartadas traen su propio veredicto: oferta única, momento de fin de año, desajuste de industria, pub_delay_z, win_rate, sector_spread. Versiones anteriores — v3.3, v4.0 — trataban algunas como indicadores principales. v0.8.5 encontró que, una vez que price_volatility y price_ratio están en el modelo, no aportan poder predictivo; el propio direct_award sobrevive apenas en -0.081. La oferta única no es irrelevante para la corrupción — ya está capturada por las señales dominantes de precio.",
          "El hallazgo empírico es claro. La corrupción en la contratación mexicana se manifiesta primero en el precio, no en el mecanismo de adjudicación ni en el timing. Y la inconsistencia de ese precio — facturar 9× por trabajo comparable — es la huella que más consistentemente distingue a los proveedores de los 1,427 casos documentados de los que están fuera. La factura de junio es exactamente lo que la cima de esta escalera está construida para ver.",
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
                annotation: '+43% vs next',
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
                annotation: 'only protective',
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
            "One protective signal survived regularization: institution_diversity. A vendor that serves many institutions is structurally less suspect — broad reach is the signature of legitimacy.",
          quote_es:
            "Una señal protectora sobrevivió a la regularización: institution_diversity. Un proveedor que sirve a muchas instituciones es estructuralmente menos sospechoso — el alcance amplio es la firma de la legitimidad.",
          stat: '-0.388',
          statLabel: "institution_diversity — protective coefficient (v0.8.5)",
          statLabel_es: "institution_diversity — coeficiente protector (v0.8.5)",
        },
        sources: [
          'Zou, H., & Hastie, T. (2005). Regularization and variable selection via the elastic net.',
          'RUBLI v0.8.5 model coefficient table, docs/RISK_METHODOLOGY_v6.md, mayo 2026.',
        ],
      },
      {
        id: 'ch4',
        number: 4,
        title: "Two Algorithms, the Same 4,200 Contracts",
        title_es: "Dos algoritmos, los mismos 4,200 contratos",
        subtitle: "A model trained on corruption and a model that never saw a single case both flag the same population",
        subtitle_es:
          "Un modelo entrenado en corrupción y un modelo que nunca vio un solo caso marcan la misma población",
        prose: [
          "Two independent algorithms, sharing no labels and no mathematics, flag the same 4,200 contracts. The first is the supervised v0.8.5 model, trained on 1,427 documented corruption cases. The second is a PyOD isolation forest that uses no corruption labels at all — it flags only the contracts that are statistically unusual within the universe of 3.1 million.",
          "This is the second witness who never spoke to the first. Build a case on a single instrument and a defense attacks the instrument. When two instruments with nothing in common point at the same contracts, the signal is real, not a training artifact.",
          "The simplest explanation is that price_volatility is visible from both vantage points. A contract billed 9× above its own baseline is anomalous in pure statistics, so the isolation forest sees it — and it resembles the documented corruption cases, so the supervised model sees it too. Same signal, same trace. The Venn below shows the overlap.",
        ],
        prose_es: [
          "Dos algoritmos independientes, sin etiquetas compartidas y sin matemáticas en común, marcan los mismos 4,200 contratos. El primero es el modelo supervisado v0.8.5, entrenado con 1,427 casos de corrupción documentada. El segundo es un isolation forest de PyOD que no usa etiqueta de corrupción alguna — solo marca los contratos estadísticamente inusuales dentro del universo de 3.1 millones.",
          "Este es el segundo testigo que nunca habló con el primero. Construye un caso sobre un solo instrumento y la defensa ataca el instrumento. Cuando dos instrumentos sin nada en común apuntan a los mismos contratos, la señal es real, no un artefacto del entrenamiento.",
          "La explicación más simple es que price_volatility se ve desde ambos puntos de vista. Un contrato facturado 9× por encima de su propia línea base es anómalo en estadística pura, y por eso lo ve el isolation forest — y se parece a los casos de corrupción documentada, y por eso lo ve también el modelo supervisado. La misma señal, la misma huella. El diagrama de Venn de abajo muestra el traslape.",
        ],
        chartConfig: {
          type: 'venn-convergence',
          title: 'The second witness: two algorithms, the same 4,200 contracts',
          title_es: 'El segundo testigo: dos algoritmos, los mismos 4,200 contratos',
        },
        pullquote: {
          quote:
            "Two independent analytic approaches — supervised scoring and unsupervised anomaly detection — converge on the same 4,200 high-volatility contracts.",
          quote_es:
            "Dos enfoques analíticos independientes — calificación de riesgo supervisada y detección de anomalías no supervisada — convergen en los mismos 4,200 contratos de alta volatilidad de precios.",
          stat: '4,200',
          statLabel: "contracts flagged by both algorithms independently",
          statLabel_es: "contratos marcados por ambos algoritmos de forma independiente",
        },
        sources: [
          'Elkan, C., & Noto, K. (2008). Learning classifiers from only positive and unlabeled data. ACM SIGKDD.',
          'RUBLI validación cruzada de modelos, v0.8.5 vs PyOD IForest, abril 2026.',
        ],
      },
      {
        id: 'ch5',
        number: 5,
        title: "Three Fingerprints on One Axis",
        title_es: "Tres huellas en un mismo eje",
        subtitle: "The shape of the volatility tells the reporter which case they are looking at — overpricing or capture",
        subtitle_es: "La forma de la volatilidad le dice al periodista qué caso tiene enfrente — sobreprecio o captura",
        prose: [
          "Volatility is not one number — it is a fingerprint, and its shape names the case. The ghost vendor (P2) leaves the sharpest mark: few contracts, extreme variance, prices that jump 5 to 10 times with no market logic. The capture vendor (P6) leaves a different one: many contracts with a single institution, moderate but persistent variance — it never competes, it always negotiates. The legitimate vendor leaves almost none: many contracts across many institutions, narrow variance, prices that track market cost.",
          "v0.8.5 separates these without ever labeling them. price_volatility, institution_diversity and vendor_concentration combine into a distinct coefficient vector for each pattern. The ghost scores high on volatility; the capture vendor high on concentration; the legitimate vendor low on all three. The three SHAP fingerprints below are illustrative — their proportions reflect RUBLI's analysis patterns, not a single audited contract.",
          "For a reporter the shape is a route. A high-risk vendor dominated by price_volatility is a pricing-manipulation case — compare invoices against market prices. One dominated by vendor_concentration is an institutional-capture case — trace the relationship between the vendor and the signing official. The coefficient signature dictates the investigation.",
        ],
        prose_es: [
          "La volatilidad no es un número — es una huella, y su forma nombra el caso. El proveedor fantasma (P2) deja la marca más nítida: pocos contratos, varianza extrema, precios que saltan de 5 a 10 veces sin lógica de mercado. El proveedor de captura (P6) deja otra: muchos contratos con una sola institución, varianza moderada pero persistente — nunca compite, siempre negocia. El proveedor legítimo casi no deja ninguna: muchos contratos con muchas instituciones, varianza estrecha, precios que reflejan el costo de mercado.",
          "v0.8.5 los separa sin etiquetarlos nunca. price_volatility, institution_diversity y vendor_concentration se combinan en un vector de coeficientes distinto para cada patrón. El fantasma puntúa alto en volatilidad; el de captura, alto en concentración; el legítimo, bajo en los tres. Las tres huellas SHAP de abajo son ilustrativas — sus proporciones reflejan los patrones del análisis de RUBLI, no un solo contrato auditado.",
          "Para un periodista la forma es una ruta. Un proveedor de riesgo alto dominado por price_volatility es un caso de manipulación de precios — compara facturas contra precios de mercado. Uno dominado por vendor_concentration es un caso de captura institucional — rastrea la relación entre el proveedor y el funcionario que firma. La firma del coeficiente dicta la investigación.",
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
                annotation: 'ghost signature · 5–10× price jumps',
                annotation_es: 'firma fantasma · saltos de 5–10×',
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
                highlight: true,
                annotation: 'capture signature · one buyer',
                annotation_es: 'firma de captura · un solo comprador',
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
            "Three vendor patterns, three distinct fingerprints on one axis. The signature tells the investigator which case they have — overpricing or institutional capture.",
          quote_es:
            "Tres patrones de proveedor, tres huellas distintas en un mismo eje. La firma le dice al investigador qué caso tiene — sobreprecio o captura institucional.",
          stat: '3',
          statLabel: "vendor patterns — three distinct fingerprints on the same axis",
          statLabel_es: "patrones de proveedor — tres firmas distintas en el mismo eje",
        },
        sources: [
          'RUBLI análisis SHAP v0.8.5, tabla vendor_shap_v52, mayo 2026.',
          'RUBLI ARIA pipeline, P2/P6 pattern classification, mayo 2026.',
        ],
      },
      {
        id: 'ch6',
        number: 6,
        title: "How a Reporter Closes the Case the Algorithm Opened",
        title_es: "Cómo un periodista cierra el caso que abrió el algoritmo",
        subtitle: "Three forensic steps — transparency request, full contract text, price benchmark — and an honest limit",
        subtitle_es: "Tres pasos forenses — solicitud de transparencia, texto completo del contrato, benchmark de precios — y un límite honesto",
        prose: [
          "The algorithm opens the file; the reporter closes it. For any vendor at the top of RUBLI's price_volatility ranking, the forensic route is three steps. First, pull the highest-variance contracts through INAI transparency requests — typical response 20 business days. Second, obtain the full contract text: specification, quantities, unit prices, delivery terms. Third, benchmark those unit prices against domestic comparators — other CompraNet contracts for the same goods — and international ones, the OECD's Open Contracting Partnership and the EU's TED database.",
          "This needs no forensic-accounting expertise. It needs access to public documents and systematic comparison. The ASF already applies this methodology to pharmaceutical procurement, a practice established after the Maypo / Grupo Fármacos / PISA concentration. RUBLI extends it algorithmically across 3.1 million contracts and 18 sectors, and the risk indicator simply flags which vendor-institution pairs deserve the first information request.",
          "The output is not a criminal charge — that requires the Ministerio Público or the UIF. It is published evidence of overpricing in specific named contracts, verified by independent benchmarking, the kind of pressure that charges ultimately require. The lineage is clear: MCCI and Animal Político on La Estafa Maestra, El Universal on IMSS pharma — now made systematically faster. The June invoice was the clue. This is how you turn it into a case.",
        ],
        prose_es: [
          "El algoritmo abre el expediente; el periodista lo cierra. Para cualquier proveedor en la cima del ranking de price_volatility de RUBLI, la ruta forense tiene tres pasos. Primero, sacar los contratos de mayor varianza mediante solicitudes de transparencia al INAI — respuesta típica de 20 días hábiles. Segundo, obtener el texto completo del contrato: especificación, cantidades, precios unitarios, condiciones de entrega. Tercero, hacer benchmarking de esos precios unitarios contra comparadores domésticos — otros contratos de CompraNet por los mismos bienes — e internacionales, el Open Contracting Partnership de la OCDE y la base TED de la UE.",
          "Esto no requiere expertise forense contable. Requiere acceso a documentos públicos y comparación sistemática. La ASF ya aplica esta metodología a las adquisiciones farmacéuticas, una práctica establecida tras la concentración Maypo / Grupo Fármacos / PISA. RUBLI la extiende algorítmicamente a 3.1 millones de contratos y 18 sectores, y el indicador de riesgo simplemente señala cuáles pares proveedor-institución merecen la primera solicitud de información.",
          "El resultado no es una imputación penal — eso requiere al Ministerio Público o a la UIF. Es evidencia publicada de sobreprecio en contratos específicos, identificados por nombre, verificada con benchmarking independiente, el tipo de presión que las imputaciones en última instancia requieren. El linaje es claro: MCCI y Animal Político en La Estafa Maestra, El Universal en la farmacéutica del IMSS — ahora sistemáticamente más rápido. La factura de junio fue la pista. Así se convierte en un caso.",
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
    headline: "The Ratchet",
    headline_es: "El trinquete",
    subheadline:
      "One emergency decree on March 30, 2020 suspended Mexico's competitive-bidding rules overnight. Direct awards jumped from 72.3% to 87%, ghost-pattern vendors collected billions in same-day contracts — and four years later the rate has never come back down.",
    subheadline_es:
      "Un decreto de emergencia, el 30 de marzo de 2020, suspendió de un día para otro las reglas de licitación competitiva en México. La adjudicación directa saltó del 72.3% al 87%, proveedores con patrón de empresa fantasma cobraron miles de millones en contratos del mismo día — y cuatro años después la tasa nunca ha vuelto a bajar.",
    byline: 'RUBLI Unidad de Análisis de Datos',
    estimatedMinutes: 10,
    status: 'reporteado',
    leadStat: {
      value: '87%',
      label: "direct-award rate · 2020 · the rupture year",
      label_es: "tasa de adjudicación directa · 2020 · el año de la ruptura",
      sublabel: "up from 72.3% the year before — and it never reset",
      sublabel_es: "arriba del 72.3% del año anterior — y nunca se reinició",
      color: '#dc2626',
    },
    kickerStats: [
      {
        prefix: "In 2019, competition still won",
        prefix_es: "En 2019, la competencia todavía ganaba en",
        value: '27.7%',
        suffix: "of contracts.",
        suffix_es: "de los contratos.",
        tone: 'muted',
      },
      {
        prefix: "In 2020, that collapsed to just",
        prefix_es: "En 2020 eso se desplomó a apenas",
        value: '13%',
        suffix: "— one contract in eight.",
        suffix_es: "— un contrato de cada ocho.",
        tone: 'critical',
      },
      {
        prefix: "HEMOSER, a ghost-pattern vendor, took",
        prefix_es: "HEMOSER, proveedor con patrón fantasma, se llevó",
        value: '17.2B',
        suffix: "from IMSS in same-day awards.",
        suffix_es: "del IMSS en adjudicaciones del mismo día.",
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
        title: "The System Before",
        title_es: "El sistema de antes",
        subtitle:
          "Already non-competitive — but every shortcut still had to be written down",
        subtitle_es:
          "Ya era poco competitivo — pero cada atajo aún tenía que quedar por escrito",
        prose: [
          "Mexican federal procurement was rigged against competition long before COVID. In 2019, 72.3% of federal contracts were handed out as direct awards, no bidding. That was not a bad year. Across five administrations and 23 years, the direct-award floor has never dropped below 60%. The OECD considers 15-20% the ceiling for a competitive system. By that yardstick, the entire Mexican record is an outlier.",
          "But the pre-COVID system had one thing the post-COVID system lost: a tripwire. The Ley de Adquisiciones requires competitive bidding by default and treats direct award as the exception — one that demands a written justification. A purchasing officer who wanted to skip the bidding still had to put on paper why. In 2019, 27.7% of contracts were competitive. A minority, but a defended one: every direct award stood on the record as a documented departure from the rule.",
          "That distinction is the whole story: the system was strained, not open. What kept it from tipping over was procedural, not statistical — the obligation to explain. What happened in 2020 was not the corruption of something clean. It was the removal of the one thing holding a tilted system in place.",
        ],
        prose_es: [
          "La contratación federal mexicana estaba amañada contra la competencia mucho antes del COVID. En 2019, el 72.3% de los contratos federales se entregaron por adjudicación directa, sin licitar. No fue un mal año: a lo largo de cinco administraciones y 23 años, el piso de adjudicación directa nunca ha bajado del 60%. La OCDE considera que el 15-20% es el tope para un sistema competitivo. Con esa vara, todo el expediente mexicano es un caso atípico.",
          "Pero el sistema pre-COVID tenía algo que el sistema post-COVID perdió: un cable trampa. La Ley de Adquisiciones exige licitación competitiva por defecto y trata la adjudicación directa como la excepción — una que obliga a justificarse por escrito. El funcionario de compras que quisiera saltarse la licitación todavía tenía que poner en papel por qué. En 2019, el 27.7% de los contratos fueron competitivos. Una minoría, pero defendida: cada adjudicación directa quedaba en el registro como una desviación documentada de la regla.",
          "Esa distinción es toda la historia. El sistema estaba tensionado, no abierto. Lo que evitaba que se desbordara era procesal, no estadístico: la obligación de explicar. Lo que pasó en 2020 no fue la corrupción de algo limpio. Fue la eliminación de lo único que sostenía en su lugar a un sistema ya inclinado.",
        ],
        pullquote: {
          quote:
            "The pre-COVID system was non-competitive, but it carried a tripwire: every direct award was an exception that had to be justified.",
          quote_es:
            "El sistema pre-COVID era poco competitivo, pero llevaba un cable trampa: cada adjudicación directa era una excepción que tenía que justificarse.",
          stat: '72.3%',
          statLabel: "Direct-award rate · 2019 · the before-state baseline",
          statLabel_es: "Tasa de adjudicación directa · 2019 · línea base del estado anterior",
        },
        sources: [
          'OCDE. (2022). Government at a Glance. Benchmarks competitividad de compras.',
          'RUBLI v0.8.5. Módulo year-over-year. Tasas adjudicación directa 2015–2024.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: "The Day the Rule Vanished",
        title_es: "El día que la regla desapareció",
        subtitle:
          "March 30, 2020 — competition suspended, and who walked through the gap",
        subtitle_es:
          "30 de marzo de 2020 — competencia suspendida, y quién pasó por la brecha",
        prose: [
          "On March 30, 2020, the federal government declared a national health emergency, and the tripwire was cut. The Ley de Adquisiciones' competitive-bidding requirements were suspended for COVID procurement; any agency could now award contracts directly, with no process and no justification. The rule that had forced an explanation simply stopped applying.",
          "The volume that came through the gap was staggering. RUBLI records 215,000 contracts in 2020 — the highest single-year count of the AMLO administration, up 23% on the year before. Of those, 87% were direct awards, against 72.3% in 2019. That 14.7-point jump across 215,000 contracts is roughly 31,000 contracts that would have required competition under the old rule. In plain terms: in 2020, only one contract in eight was competitive. The other seven were awarded at a desk.",
          "Emergency speed is not automatically corruption — the early pandemic was a real supply shock, and speed can beat process. The question is who the suspension let move. One of the biggest winners was HEMOSER, a vendor that matches the P2 ghost-company signature in RUBLI's ARIA pipeline. HEMOSER took MX$17.2 billion from IMSS during the emergency, much of it in same-day awards: the contract signed the same day the request was filed.",
          "Same-day is the forensic tell. Even with bidding suspended, a real purchase still checks credentials, capacity, and price. A same-day award skips all of it — the vendor was chosen before the paperwork began. And HEMOSER is not alone. The P2 pipeline flags 6,118 vendors nationally carrying the same signature: minimal physical footprint, revenue concentrated in one institution, volatile pricing. The model identifies behavior resembling fraud; it does not prove it. But that is exactly the behavior the lifted rule made room for.",
        ],
        prose_es: [
          "El 30 de marzo de 2020, el gobierno federal declaró emergencia sanitaria nacional, y el cable trampa se cortó. Los requisitos de licitación competitiva de la Ley de Adquisiciones quedaron suspendidos para las compras COVID; cualquier dependencia podía ahora adjudicar contratos directamente, sin proceso y sin justificación. La regla que obligaba a explicar simplemente dejó de aplicar.",
          "El volumen que pasó por la brecha fue brutal. RUBLI registra 215,000 contratos en 2020 — el mayor conteo anual de la administración de AMLO, un 23% por encima del año previo. De ellos, el 87% fueron adjudicaciones directas, contra 72.3% en 2019. Ese salto de 14.7 puntos sobre 215,000 contratos equivale a unos 31,000 contratos que bajo la regla anterior habrían requerido competencia. En claro: en 2020, solo un contrato de cada ocho fue competitivo. Los otros siete se adjudicaron en un escritorio.",
          "La velocidad de emergencia no es corrupción automática — los primeros meses de la pandemia fueron un choque de oferta real, y la velocidad puede ganarle al proceso. La pregunta es a quién dejó moverse la suspensión. Uno de los mayores ganadores fue HEMOSER, proveedor que coincide con la firma P2 de empresa fantasma en el flujo ARIA de RUBLI. HEMOSER se llevó MX$17.2 mil millones del IMSS durante la emergencia, buena parte en adjudicaciones del mismo día: el contrato firmado el mismo día en que se registró la solicitud.",
          "El mismo día es el indicio forense. Aun con la licitación suspendida, una compra real todavía verifica credenciales, capacidad y precio. Una adjudicación del mismo día se salta todo eso — el proveedor fue elegido antes de que empezara el papeleo. Y HEMOSER no está solo. El flujo P2 señala 6,118 proveedores a nivel nacional con la misma firma: huella física mínima, ingresos concentrados en una sola institución, precios volátiles. El modelo identifica conductas que se parecen al fraude; no lo demuestra. Pero esa es exactamente la conducta a la que la regla eliminada le abrió espacio.",
        ],
        pullquote: {
          quote:
            "A same-day award means the vendor was selected before the paperwork started. There is no other explanation.",
          quote_es:
            "Una adjudicación del mismo día significa que el proveedor fue seleccionado antes de que comenzara el papeleo. No hay otra explicación.",
          stat: 'MX$17.2B',
          statLabel: "HEMOSER COVID contracts · IMSS · same-day awards",
          statLabel_es: "Contratos COVID HEMOSER · IMSS · adjudicaciones mismo día",
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
        title: "What Never Came Back",
        title_es: "Lo que nunca regresó",
        subtitle:
          "The emergency ended in 2021. The rate didn't.",
        subtitle_es:
          "La emergencia terminó en 2021. La tasa no.",
        prose: [
          "The COVID emergency was lifted in 2021. The direct-award rate should have fallen back toward its pre-COVID floor. It didn't. It was 81.2% in 2021, 79.4% in 2022, then climbed back to 82.2% in 2023 and 80.1% in 2024 — every post-emergency year higher than the 79.4% trough. Emergency procurement, it turns out, is a ratchet: it moves in one direction and locks.",
          "The chart makes the rupture impossible to miss. The line sits near a pre-COVID baseline of 71.2% — a five-year average of 72.7% — spikes to 87 in 2020, then settles onto a post-emergency floor that never drops below 79.4%, a full 7 points above the old average. Two reference lines frame the fault: the 87% ratchet window above, the 71.2% baseline below. Read across them and the year-by-year line stops being a trend. It becomes a before-and-after.",
          "The verdict is structural, and it spans five administrations and 23 years. Each one inherits its predecessor's direct-award rate; none has delivered a sustained cut; the floor has never fallen below 60% against an OECD target of 15-20%. By that measure, 2020 is not an anomaly. It is the cleanest reading the data offers of a system whose default is non-competition.",
          "The emergency did not corrupt the system. It removed the one requirement — justification — that held the non-competitive default in check, and the requirement never came back. The line in time was crossed in one direction only.",
        ],
        prose_es: [
          "La emergencia COVID se levantó en 2021. La tasa de adjudicación directa debió regresar hacia su piso pre-COVID. No lo hizo. Fue del 81.2% en 2021, del 79.4% en 2022, y luego volvió a subir al 82.2% en 2023 y al 80.1% en 2024 — cada año post-emergencia por encima del mínimo de 79.4%. La contratación de emergencia, resulta, es un trinquete: se mueve en una sola dirección y se traba.",
          "La gráfica hace imposible no ver la ruptura. La línea se mantiene cerca de una línea base pre-COVID de 71.2% — un promedio de cinco años de 72.7% — salta a 87 en 2020, y luego se asienta en un piso post-emergencia que nunca baja del 79.4%, 7 puntos completos sobre el promedio anterior. Dos líneas de referencia enmarcan la falla: la ventana del trinquete del 87% arriba, la línea base del 71.2% abajo. Si se leen juntas, la línea año a año deja de ser una tendencia. Se vuelve un antes y un después.",
          "Es un veredicto estructural que abarca cinco administraciones y 23 años. Cada una hereda la tasa de adjudicación directa de su predecesora; ninguna ha logrado un recorte sostenido; el piso nunca ha bajado del 60% contra un objetivo OCDE de 15-20%. Con esa medida, 2020 no es una anomalía. Es la lectura más limpia que ofrecen los datos de un sistema cuyo default es la no-competencia.",
          "La emergencia no corrompió el sistema. Eliminó el único requisito — la justificación — que mantenía a raya el default no-competitivo, y el requisito nunca regresó. La línea en el tiempo se cruzó en una sola dirección.",
        ],
        chartConfig: {
          type: 'inline-line',
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
                annotation: 'COVID peak · +14pp vs baseline',
                annotation_es: 'pico COVID · +14pp vs base',
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
                annotation: 'post-COVID trough — still +7pp',
                annotation_es: 'mínimo post-COVID — aún +7pp',
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
            yMin: 60,
            unit: '%',
            referenceLine: {
              value: 79.4,
              label: '79.4%',
              label_es: '79.4%',
              color: '#dc2626',
            },
            referenceLine2: {
              value: 72.7,
              label: '72.7%',
              label_es: '72.7%',
            },
            annotation:
              'Upper red line = the post-COVID floor (79.4%, never breached downward since 2020). Lower line = the pre-COVID baseline (72.7%, five-year average). The 2020 spike never resets — the floor settles ~7pp above the pre-COVID average.',
            annotation_es:
              'Línea roja superior = el piso post-COVID (79.4%, nunca rebasado a la baja desde 2020). Línea inferior = la línea base pre-COVID (72.7%, promedio de cinco años). El pico de 2020 no se reinicia — el piso queda ~7pp sobre el promedio pre-COVID.',
          },
        },
        pullquote: {
          quote:
            "Emergency procurement is a ratchet. The COVID year proved that removing a barrier to direct award does not create a path back.",
          quote_es:
            "La contratación de emergencia es un trinquete. El año COVID demostró que eliminar una barrera a la adjudicación directa no crea un camino de regreso.",
          stat: '82.2%',
          statLabel: "Direct award rate 2023 — above the 2021 post-COVID trough",
          statLabel_es: "Tasa adjudicación directa 2023 — sobre el mínimo post-COVID de 2021",
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
    headline: "Three Firms, 240 Billion Pesos, and a Voucher Market That Never Opens",
    headline_es:
      "Tres empresas, 240 mil millones de pesos y un mercado de vales que nunca se abre",
    subheadline:
      "Mexico's entire federal voucher market — 240 billion pesos for food, fuel, and welfare cards — routes to just three vendors: Edenred, Efectivale, and Sodexo. All three win more than 88 percent of their contracts by direct award, against an OECD ceiling of 30. When tenders are held, a single firm shows up — 2,868 times. Five administrations and three parties have governed Mexico in that span. None broke the oligopoly. RUBLI flags this as a market-structure pattern, not proven fraud — but the outcome is the same either way.",
    subheadline_es:
      "Todo el mercado federal de vales de México — 240 mil millones de pesos para tarjetas de despensa, gasolina y bienestar — desemboca en apenas tres proveedores: Edenred, Efectivale y Sodexo. Las tres ganan más del 88 por ciento de sus contratos por adjudicación directa, contra un techo OCDE del 30. Cuando hay licitación, se presenta una sola empresa — 2,868 veces. Cinco administraciones y tres partidos han gobernado en ese lapso. Ninguno rompió el oligopolio. RUBLI marca esto como un patrón de estructura de mercado, no como fraude probado — pero el resultado es el mismo en ambos casos.",
    leadStat: {
      value: '96.7%',
      label: "Edenred direct-award rate",
      label_es: "Tasa de adjudicación directa de Edenred",
      sublabel: "2,210 contracts · every one entered through IMSS direct award",
      sublabel_es: "2,210 contratos · todos entraron por adjudicación directa del IMSS",
      color: '#dc2626',
    },
    kickerStats: [
      {
          suffix_es: "MXN, en manos de 3 proveedores.",
        prefix: "",
        value: '240 mil M',
        suffix: "MXN, held by 3 vendors.",
        tone: 'data',
      },
      {
          suffix_es: "licitaciones con un solo postor.",
          prefix_es: "Efectivale ganó",
        prefix: "Efectivale won",
        value: '2,210',
        suffix: "tenders with a single bidder.",
        tone: 'critical',
      },
      {
          suffix_es: "de sus contratos no pasan por competencia.",
          prefix_es: "Edenred:",
        prefix: "Edenred:",
        value: '96.7%',
        suffix: "of its contracts skip competition.",
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
        title: "Three Names Hold the Entire Market",
        title_es: "Tres nombres acaparan todo el mercado",
        subtitle: "A 240-billion-peso federal market with three permanent winners",
        subtitle_es: "Un mercado federal de 240 mil millones con tres ganadores permanentes",
        prose: [
          "Every federal voucher peso in Mexico — 240 billion of them, for food, fuel, school supplies, and welfare transfers — flows to three vendors: Edenred (formerly Accor Services), Efectivale, and Sodexo. The money fans out to millions of beneficiaries, but the procurement that decides who issues the cards almost never leaves those three hands.",
          "The size is not the scandal — a market can be large and still be open. The award rate is. Edenred wins 96.7 percent of its federal contracts by direct award — 2,210 contracts, every one of them entered through IMSS direct award, with no tender to win or lose. Efectivale's direct-award rate is 92.4 percent; Sodexo's is 88.1. All three sit above 88 against an OECD ceiling of 30, the line past which a market has stopped competing.",
          "RUBLI reads this as a P5 institutional-concentration signature: a handful of vendors holding an entire sector's procurement through a mix of direct award and nominally competitive tenders. The roster below ranks the three by direct-award rate against that 30 percent ceiling.",
          "No shell company drains this budget line. These are real multinationals with real operations. The market did not close because someone hid a theft — it closed because it was allowed to consolidate past the point where competition was possible, and the procurement rules bent to fit the result.",
        ],
        prose_es: [
          "Cada peso federal de vales en México — 240 mil millones de ellos, para despensa, gasolina, útiles escolares y transferencias de bienestar — va a parar a tres proveedores: Edenred (antes Accor Services), Efectivale y Sodexo. El dinero se reparte entre millones de beneficiarios, pero la contratación que decide quién emite las tarjetas casi nunca sale de esas tres manos.",
          "El tamaño no es el escándalo. Un mercado federal puede ser grande y aun así estar abierto; 240 mil millones de pesos no tienen nada de excepcional por sí solos. Lo excepcional es cómo se adjudican los contratos. Edenred gana el 96.7 por ciento de sus contratos federales por adjudicación directa — 2,210 contratos, todos entrados por adjudicación directa del IMSS, sin licitación que ganar o perder. La tasa de Efectivale es del 92.4 por ciento; la de Sodexo, del 88.1. Las tres por encima del 88 frente a un techo OCDE del 30, la raya tras la cual un mercado dejó de competir.",
          "RUBLI lee esto como una firma P5 de concentración institucional: un puñado de proveedores reteniendo toda la contratación de un sector mediante una mezcla de adjudicación directa y licitaciones nominalmente competitivas. El registro siguiente ordena a las tres por tasa de adjudicación directa frente a ese techo del 30 por ciento.",
          "Aquí no hay empresa fantasma vaciando una partida. Son multinacionales reales con operaciones reales. El mercado no se cerró porque alguien ocultara un robo — se cerró porque se le permitió consolidarse más allá del punto donde la competencia era posible, y las reglas de contratación se doblaron para encajar con el resultado.",
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
            referenceLine: {
              value: 30,
              label: 'OECD ceiling',
              label_es: 'techo OCDE',
            },
            annotation:
              'All three above 88% direct-award. OECD ceiling for direct award: 30%. The voucher market has no competitive check.',
            annotation_es:
              'Las tres por encima del 88% de adjudicación directa. Techo OCDE para adjudicación directa: 30%. El mercado de vales carece de control competitivo.',
          },
        },
        pullquote: {
          quote:
            "The 240 billion pesos are not the scandal. The award rate is. A market can be large and still be open — this one is neither.",
          quote_es:
            "Los 240 mil millones de pesos no son el escándalo. La forma de adjudicar lo es. Un mercado puede ser grande y aun así estar abierto — este no es ninguna de las dos cosas.",
          stat: '240B MXN',
          statLabel: "Voucher sector · total federal spend · 3 vendors",
          statLabel_es: "Sector vales · gasto federal total · 3 proveedores",
        },
        sources: [
          'RUBLI ARIA pipeline. Patrón P5 concentración. Sector hacienda (vales). 2002–2025.',
          'COMPRANET registros de contratos. Categoría: vales_despensa, monedero_electronico. 2002–2025.',
        ],
      },
      {
        id: 'ch2',
        number: 2,
        title: "Two Ways to Keep Competition Out",
        title_es: "Dos formas de dejar fuera a la competencia",
        subtitle: "The direct-award bypass, then the single-bidder tender",
        subtitle_es:
          "El atajo de adjudicación directa, luego la licitación de un solo postor",
        prose: [
          "Two mechanisms keep the room closed, and they work in sequence. The first is the bypass: Edenred's 96.7 percent direct-award rate means the competitive process almost never opens — 2,210 contracts, every one awarded through IMSS direct award. When the buyer can skip the open tender, the question of who else might have competed never arises. The bypass is blunt, visible, and entirely legal.",
          "The second mechanism is quieter. When a tender is held, one firm shows up. Efectivale won 2,210 single-bid competitions; Sodexo won 658 more — 2,868 nominally competitive tenders that drew exactly one bidder. RUBLI defines the flag precisely: is_single_bid fires when procedure_type is not direct_award and vendor_count_per_procedure equals 1. These are competitive procedures on paper — a published notice, a formal process under Mexican law — whose outcome is settled the moment only one firm appears. The competition is performed for the record.",
          "The mechanics are well documented in procurement: specifications written around an incumbent's payment network or card format, timelines too short for anyone without advance notice, distribution requirements drawn to favor the firm already inside. RUBLI cannot say which one produced any single result — only the aggregate, and the aggregate is what no open market produces by chance.",
          "The money carried through that second lock is real: Efectivale's single-bid contracts total 19.6 billion pesos, Sodexo's 5.2 billion. P5 flags this structure; it does not assert that any one tender was rigged.",
        ],
        prose_es: [
          "El mercado permanece cerrado mediante dos mecanismos que funcionan en secuencia. El primero es el atajo. La tasa de adjudicación directa del 96.7 por ciento de Edenred significa que el proceso competitivo casi nunca se abre — 2,210 contratos, todos adjudicados por adjudicación directa del IMSS. Cuando el comprador puede saltarse la licitación abierta, la pregunta de quién más habría competido nunca surge. El atajo es burdo, visible y enteramente legal.",
          "El segundo mecanismo es más silencioso. Cuando se celebra una licitación, se presenta una sola empresa. Efectivale ganó 2,210 competencias de oferta única; Sodexo ganó 658 más — 2,868 licitaciones nominalmente competitivas que atrajeron a exactamente un postor. RUBLI define la bandera con precisión: is_single_bid se activa cuando procedure_type no es direct_award y vendor_count_per_procedure es igual a 1. Son procedimientos competitivos en papel — una convocatoria publicada, un proceso formal bajo la ley mexicana — cuyo resultado queda zanjado en el momento en que sólo una empresa aparece. La competencia se actúa para el expediente.",
          "La mecánica está bien documentada en contratación: especificaciones redactadas alrededor de la red de pago o el formato de tarjeta de un incumbente, plazos demasiado cortos para quien no tiene información anticipada, requisitos de distribución trazados para favorecer a la empresa que ya está dentro. RUBLI no puede decir cuál produjo cada resultado individual — sólo el agregado, y el agregado es lo que ningún mercado abierto produce por azar.",
          "El dinero que pasa por esa segunda cerradura es real: los contratos de oferta única de Efectivale suman 19.6 mil millones de pesos, los de Sodexo 5.2 mil millones. P5 marca esta estructura; no afirma que alguna licitación concreta haya sido amañada.",
        ],
        pullquote: {
          quote:
            "2,210 competitive tenders, 2,210 times a single bidder appeared. At some point 'competitive procedure' is a ritual performed for the record.",
          quote_es:
            "2,210 licitaciones competitivas, 2,210 veces apareció un solo postor. En algún punto 'procedimiento competitivo' es un ritual actuado para el expediente.",
          stat: '2,210',
          statLabel: "Single-bid wins · Efectivale · all federal procurement",
          statLabel_es: "Victorias oferta única · Efectivale · toda la contratación federal",
        },
        sources: [
          'RUBLI. Análisis oferta única. Bandera is_single_bid: procedure_type != direct_award AND vendor_count_per_procedure = 1.',
          'COMPRANET registros de contratos. Efectivale. 2010–2024.',
        ],
      },
      {
        id: 'ch3',
        number: 3,
        title: "Five Governments Bought From the Same Three Firms",
        title_es: "Cinco gobiernos compraron a las mismas tres empresas",
        subtitle: "Why the oligopoly outlasts every change of administration",
        subtitle_es: "Por qué el oligopolio sobrevive a cada cambio de administración",
        prose: [
          "The clearest proof the lock is structural is that it outlasts everyone. Fox, Calderón, Peña Nieto, AMLO, Sheinbaum — five administrations and three political parties have governed Mexico, and every one of them bought vouchers from the same three vendors. No oligopoly tied to a single sexenio survives the next election. This one predates every government on the list.",
          "The reason is infrastructure. Welfare vouchers are a natural monopoly masked as a market. The point-of-sale network, the beneficiary databases, the card-issuance systems all demand massive upfront investment, and once built they create lock-in no single tender can undo. The incumbent has already paid for the entry cost; a challenger would have to absorb it while also winning the contract that would justify the spend. Entry is irrational, so no one enters, so the same three names stay.",
          "RUBLI has no evidence that these firms commit fraud in the legal sense. P5 is a market-structure flag, not a fraud flag — the distinction is real. But it does not soften the result, because the result is identical either way: 240 billion pesos, five administrations, three vendors, no competitive check on any of it.",
          "The fix for this market exists — procurement redesign, not a prosecution. No government has reached for it.",
        ],
        prose_es: [
          "La prueba más clara de que la cerradura es estructural es que sobrevive a todos. Fox, Calderón, Peña Nieto, AMLO, Sheinbaum — cinco administraciones y tres partidos políticos han gobernado México, y cada uno de ellos compró vales a los mismos tres proveedores. Ningún oligopolio atado a un solo sexenio sobrevive a la siguiente elección. Este antecede a cada gobierno de la lista.",
          "La razón es la infraestructura. Los vales de bienestar son un monopolio natural disfrazado de mercado. La red de puntos de venta, las bases de datos de beneficiarios, los sistemas de emisión de tarjetas exigen una enorme inversión inicial, y una vez construidos crean una dependencia que ninguna licitación individual puede deshacer. El incumbente ya pagó el costo de entrada; un retador tendría que absorberlo mientras gana el contrato que justificaría el gasto. La entrada es irracional, así que nadie entra, así que se quedan los mismos tres nombres.",
          "RUBLI no tiene evidencia de que estas empresas cometan fraude en el sentido legal. P5 es una bandera de estructura de mercado, no de fraude — la distinción es real. Pero no suaviza el resultado, porque el resultado es idéntico en ambos casos: 240 mil millones de pesos, cinco administraciones, tres proveedores, sin ningún control competitivo sobre nada de ello.",
          "La llave para reabrir este mercado existe — es rediseñar la contratación, no una acusación penal. Ningún gobierno la ha girado.",
        ],
        pullquote: {
          quote:
            "Fox, Calderón, Peña Nieto, AMLO, Sheinbaum. Five administrations, three parties, the same three companies. The key exists — no government has turned it.",
          quote_es:
            "Fox, Calderón, Peña Nieto, AMLO, Sheinbaum. Cinco administraciones, tres partidos, las mismas tres empresas. La llave existe — ningún gobierno la ha girado.",
          stat: '5',
          statLabel: "Consecutive administrations without breaking the voucher oligopoly",
          statLabel_es: "Administraciones consecutivas sin romper el oligopolio de vales",
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
