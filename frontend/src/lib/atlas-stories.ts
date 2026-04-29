/**
 * Atlas Stories — long-form, multi-chapter narratives that the Atlas tells
 * about Mexican federal procurement.
 *
 * Each story is structured as a sequence of chapters. A chapter applies a
 * specific Atlas state (mode, year, pinned cluster) and presents an
 * editorial paragraph + optional pull-stat to the reader. The chart locks
 * to that state for the chapter's dwell duration; the reader can pause,
 * skip, or interact with the constellation without breaking the story.
 *
 * Voice: third-person editorial. The chart is the evidence; the chapter
 * body provides the historical context and meaning.
 *
 * Pacing: dwell durations are 6–12s per chapter (vs the 3–5s of brief tours)
 * so the reader has time to read the body AND watch the chart settle into
 * the chapter's state.
 *
 * Lengths: 5–7 chapters per story so the full narrative reads in 45–80s
 * if auto-played, or as long as the reader wants if they pause to explore.
 */

import type { ConstellationMode } from '@/components/charts/ConcentrationConstellation'

export interface StoryChapter {
  /** Slug for the chapter (used in URLs / analytics). */
  id: string
  /** 1-indexed chapter number for display. */
  number: number
  /** Year label shown in the chapter header (e.g. "2010", "2014–2017"). */
  yearLabel: { en: string; es: string }
  /** Chapter title — appears in Playfair Display. */
  title: { en: string; es: string }
  /** 2–3 sentence editorial paragraph. */
  body: { en: string; es: string }
  /** Optional pull-stat callout — big number with caption. */
  pull?: {
    value: { en: string; es: string }
    caption: { en: string; es: string }
  }
  /** Atlas state to apply during this chapter. */
  state: {
    mode: ConstellationMode
    /** Actual year (snapshot lookup happens at runtime). */
    year: number
    pinnedCode: string | null
  }
  /** Milliseconds to dwell on this chapter before auto-advancing. */
  dwellMs: number
}

export interface Story {
  /** URL-safe slug identifier. */
  id: string
  /** Editorial title (Playfair Display). */
  title: { en: string; es: string }
  /** Subtitle / dek — shown below the title in the story banner. */
  subtitle: { en: string; es: string }
  /** One-line description for the story menu. */
  blurb: { en: string; es: string }
  /** Total length estimate (e.g. "~50s"). */
  duration: string
  /** Accent color for chapter borders + progress bar. */
  accent: string
  /** Chapter sequence. */
  chapters: StoryChapter[]
  /** Optional closing card content. */
  closing: {
    headline: { en: string; es: string }
    body: { en: string; es: string }
  }
  /**
   * Slug of the long-form `/stories/:slug` page that this Observatory tour
   * is the visual trailer for. When set, the closing card surfaces a
   * "Read the full investigation" CTA, and the corresponding /stories page
   * surfaces a reverse "View in the Observatory" affordance. Leave
   * undefined for orphan tours that have no long-form counterpart yet.
   */
  longformSlug?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PHARMACEUTICAL CARTEL — 6 chapters, ~50s
// ─────────────────────────────────────────────────────────────────────────────
const PHARMA_CARTEL: Story = {
  id: 'pharma_cartel',
  title: {
    en: 'The Pharmaceutical Cartel',
    es: 'El Cártel Farmacéutico',
  },
  subtitle: {
    en: 'How three distributors captured Mexico\'s public drug supply — and how the data saw them years before COFECE did.',
    es: 'Cómo tres distribuidores capturaron el suministro público de medicamentos — y cómo los datos los vieron años antes que la COFECE.',
  },
  blurb: {
    en: '6 chapters · 2010s consolidation → COFECE 2018 → AMLO veto → COVID continuity',
    es: '6 capítulos · consolidación década 2010 → COFECE 2018 → veto AMLO → continuidad COVID',
  },
  duration: '~55s',
  accent: '#dc2626',
  chapters: [
    {
      id: 'before',
      number: 1,
      yearLabel: { en: '2010–2013', es: '2010–2013' },
      title: { en: 'A Captive Market', es: 'Un Mercado Cautivo' },
      body: {
        en: 'Mexican federal pharmaceutical procurement is, by structure, a captive market. IMSS, ISSSTE, and the federal health ministry account for roughly 60% of all public drug spending. In the early 2010s, dozens of distributors competed for these contracts. By 2014, that picture would change.',
        es: 'La contratación farmacéutica federal mexicana es, por estructura, un mercado cautivo. IMSS, ISSSTE y la Secretaría de Salud concentran aproximadamente el 60% de todo el gasto público en medicamentos. A inicios de la década de 2010, decenas de distribuidores competían por estos contratos. Para 2014, el panorama cambiaría.',
      },
      state: { mode: 'categories', year: 2012, pinnedCode: 'medicamentos' },
      dwellMs: 9000,
    },
    {
      id: 'consolidation',
      number: 2,
      yearLabel: { en: '2014–2017', es: '2014–2017' },
      title: { en: 'The Consolidation', es: 'La Consolidación' },
      body: {
        en: 'Across four years, three distributors — Grupo Fármacos Especializados, Distribuidora Internacional de Medicamentos, and Grupo Fármacos Mexicanos — concentrate IMSS allocation. Smaller suppliers exit. Pattern P5 in the data — Systematic Overpricing — begins to glow as the cluster\'s critical-risk share climbs each year.',
        es: 'En cuatro años, tres distribuidores — Grupo Fármacos Especializados, Distribuidora Internacional de Medicamentos y Grupo Fármacos Mexicanos — concentran la asignación del IMSS. Los proveedores menores salen del mercado. El patrón P5 — Sobreprecio Sistemático — comienza a iluminarse mientras la proporción crítica del cúmulo trepa año tras año.',
      },
      pull: {
        value: { en: '60%', es: '60%' },
        caption: {
          en: 'of IMSS pharmacy spending captured by 3 distributors',
          es: 'del gasto farmacéutico IMSS capturado por 3 distribuidores',
        },
      },
      state: { mode: 'patterns', year: 2016, pinnedCode: 'P5' },
      dwellMs: 11000,
    },
    {
      id: 'cofece',
      number: 3,
      yearLabel: { en: '2018', es: '2018' },
      title: { en: 'COFECE Investigates', es: 'La COFECE Investiga' },
      body: {
        en: 'In 2018, Mexico\'s antitrust regulator opens a cartel investigation against the three distributors. The proceedings reveal what the data has been showing for four years: coordinated pricing, divided territories, ghost competitive bids. The pattern was the cartel signature.',
        es: 'En 2018, el regulador antimonopolios de México abre una investigación de cártel contra los tres distribuidores. El procedimiento revela lo que los datos venían mostrando desde hacía cuatro años: precios coordinados, territorios divididos, licitaciones competitivas fantasma. El patrón era la firma del cártel.',
      },
      pull: {
        value: { en: '4 yrs', es: '4 años' },
        caption: {
          en: 'lead-time from data signal to regulatory action',
          es: 'desde la señal en los datos hasta la acción regulatoria',
        },
      },
      state: { mode: 'patterns', year: 2018, pinnedCode: 'P5' },
      dwellMs: 9500,
    },
    {
      id: 'veto',
      number: 4,
      yearLabel: { en: '2019', es: '2019' },
      title: { en: 'The Veto', es: 'El Veto' },
      body: {
        en: 'AMLO publicly vetoes the cartel from his morning press conferences. New rules require unbundled drug bidding — each medicine its own contract. The cluster, briefly, recedes. New entrants briefly appear in the data. The remedy looks like it might work.',
        es: 'AMLO veta públicamente al cártel desde sus conferencias matutinas. Las nuevas reglas exigen licitación desagregada — cada medicamento, contrato propio. El cúmulo, brevemente, retrocede. Aparecen nuevos participantes en los datos. El remedio parece funcionar.',
      },
      state: { mode: 'patterns', year: 2019, pinnedCode: 'P5' },
      dwellMs: 8500,
    },
    {
      id: 'covid',
      number: 5,
      yearLabel: { en: '2020', es: '2020' },
      title: { en: 'The Emergency Window', es: 'La Ventana de la Emergencia' },
      body: {
        en: 'COVID arrives. Federal agencies invoke emergency procurement provisions — direct-award is permitted again. The distributors return through the open channel. The pharmaceutical cluster intensifies sharply. The veto, in practice, is suspended for the duration of the emergency. The emergency lasts.',
        es: 'Llega COVID. Las agencias federales invocan disposiciones de emergencia — la adjudicación directa vuelve a permitirse. Los distribuidores regresan por el canal abierto. El cúmulo farmacéutico se intensifica abruptamente. El veto, en la práctica, queda suspendido durante la emergencia. La emergencia dura.',
      },
      pull: {
        value: { en: '87%', es: '87%' },
        caption: {
          en: '2020 direct-award rate (vs 75% baseline)',
          es: 'tasa adjudicación directa 2020 (vs 75% base)',
        },
      },
      state: { mode: 'patterns', year: 2020, pinnedCode: 'P5' },
      dwellMs: 11000,
    },
    {
      id: 'persistence',
      number: 6,
      yearLabel: { en: '2023–2025', es: '2023–2025' },
      title: { en: 'What Persists', es: 'Lo Que Persiste' },
      body: {
        en: 'Three years past the veto, the cluster persists. RUBLI flags pharmaceutical contracts as critical risk in 2023; few are referred to public investigation. The cartel, as a thing in the data, continues. The question for the next administration is no longer whether the pattern exists — it is whether anyone will act on what is already plainly visible.',
        es: 'Tres años después del veto, el cúmulo persiste. RUBLI marca contratos farmacéuticos como riesgo crítico en 2023; pocos se remiten a investigación pública. El cártel, como cosa en los datos, continúa. La pregunta para la próxima administración ya no es si el patrón existe — es si alguien actuará sobre lo que ya está plenamente visible.',
      },
      state: { mode: 'patterns', year: 2024, pinnedCode: 'P5' },
      dwellMs: 11000,
    },
  ],
  closing: {
    headline: { en: 'The data was always there.', es: 'Los datos siempre estuvieron ahí.' },
    body: {
      en: 'The pharmaceutical cartel was visible in federal procurement data from 2014. COFECE acted in 2018. AMLO vetoed in 2019. The pattern persists into 2025. RUBLI exists so the next pattern doesn\'t require four years of suffering before someone acts.',
      es: 'El cártel farmacéutico fue visible en los datos de contratación federal desde 2014. La COFECE actuó en 2018. AMLO vetó en 2019. El patrón persiste en 2025. RUBLI existe para que el próximo patrón no requiera cuatro años de sufrimiento antes de que alguien actúe.',
    },
  },
  longformSlug: 'el-monopolio-invisible',
}

// ─────────────────────────────────────────────────────────────────────────────
// LA ESTAFA MAESTRA — 6 chapters, ~55s
// ─────────────────────────────────────────────────────────────────────────────
const ESTAFA_MAESTRA: Story = {
  id: 'estafa_maestra',
  title: {
    en: 'La Estafa Maestra',
    es: 'La Estafa Maestra',
  },
  subtitle: {
    en: 'The largest documented procurement fraud in Mexican history. Eleven universities. Eight federal agencies. Seven and a half billion pesos. And a pattern.',
    es: 'El mayor fraude de contratación documentado en la historia de México. Once universidades. Ocho agencias federales. Siete mil quinientos millones de pesos. Y un patrón.',
  },
  blurb: {
    en: '6 chapters · 2010 loophole → 2013–15 mechanism → 2017 publication → outcome',
    es: '6 capítulos · 2010 vacío legal → 2013–15 mecanismo → 2017 publicación → desenlace',
  },
  duration: '~55s',
  accent: '#a06820',
  chapters: [
    {
      id: 'origin',
      number: 1,
      yearLabel: { en: '2010', es: '2010' },
      title: { en: 'The Loophole', es: 'El Vacío Legal' },
      body: {
        en: 'In 2010, federal agencies discovered a legal loophole. Public universities, as autonomous government bodies, were exempt from competitive procurement rules. Agencies could route contracts through universities without bidding. The universities would subcontract the actual work — to whomever they chose.',
        es: 'En 2010, las agencias federales descubrieron un vacío legal. Las universidades públicas, como entes autónomos, estaban exentas de las reglas de licitación. Las agencias podían canalizar contratos a través de las universidades sin licitar. Las universidades subcontratarían el trabajo — a quien eligieran.',
      },
      state: { mode: 'patterns', year: 2010, pinnedCode: 'P3' },
      dwellMs: 9000,
    },
    {
      id: 'mechanism',
      number: 2,
      yearLabel: { en: '2013–2015', es: '2013–2015' },
      title: { en: 'The Mechanism', es: 'El Mecanismo' },
      body: {
        en: 'Pattern P3 in the data — Single-Use Intermediary — captures the signature. Federal agency contracts go to a public university. The university contracts a private firm. The private firm — frequently registered weeks before the contract — delivers little or nothing. Funds disappear into a chain of receipts.',
        es: 'El patrón P3 en los datos — Intermediaria de Uso Único — captura la firma. Los contratos de las agencias federales van a una universidad pública. La universidad contrata a una empresa privada. La empresa privada — frecuentemente registrada semanas antes del contrato — entrega poco o nada. Los fondos desaparecen en una cadena de recibos.',
      },
      state: { mode: 'patterns', year: 2014, pinnedCode: 'P3' },
      dwellMs: 11000,
    },
    {
      id: 'scale',
      number: 3,
      yearLabel: { en: '2013–2014', es: '2013–2014' },
      title: { en: 'The Scale', es: 'La Escala' },
      body: {
        en: 'The audit trail, when it is reconstructed, names eleven universities and eight federal agencies. The total is somewhere between 7.6 and 11 billion pesos depending on which contracts are counted. Most of the money cannot be traced to any deliverable.',
        es: 'El rastro de auditoría, cuando se reconstruye, nombra once universidades y ocho agencias federales. El total ronda entre 7,600 y 11,000 millones de pesos según qué contratos se cuenten. La mayor parte del dinero no puede rastrearse a ninguna entrega.',
      },
      pull: {
        value: { en: '11 / 8 / 7.6 bn', es: '11 / 8 / 7,600 M' },
        caption: {
          en: 'universities · agencies · MXN diverted',
          es: 'universidades · agencias · MXN desviados',
        },
      },
      state: { mode: 'sectors', year: 2014, pinnedCode: 'gobernacion' },
      dwellMs: 11000,
    },
    {
      id: 'publication',
      number: 4,
      yearLabel: { en: 'September 2017', es: 'Septiembre 2017' },
      title: { en: 'Animal Político', es: 'Animal Político' },
      body: {
        en: 'On September 5, 2017, Animal Político and Mexicanos contra la Corrupción publish the investigation under the title "La Estafa Maestra." The mechanism finally has a public name. The pattern was active in the data for seven years before it was named in print.',
        es: 'El 5 de septiembre de 2017, Animal Político y Mexicanos contra la Corrupción publican la investigación bajo el título "La Estafa Maestra". El mecanismo finalmente tiene un nombre público. El patrón estuvo activo en los datos durante siete años antes de aparecer impreso.',
      },
      state: { mode: 'patterns', year: 2017, pinnedCode: 'P3' },
      dwellMs: 9000,
    },
    {
      id: 'sanctions',
      number: 5,
      yearLabel: { en: '2018–2020', es: '2018–2020' },
      title: { en: 'The Slow Aftermath', es: 'El Lento Desenlace' },
      body: {
        en: 'SFP issues administrative sanctions. ASF audit reports flag billions. Criminal cases against named officials trickle through the courts. Some convictions arrive. Many do not. The total recovered is a small fraction of the total diverted.',
        es: 'La SFP emite sanciones administrativas. Los informes de la ASF detectan miles de millones. Los procesos penales contra los funcionarios mencionados avanzan con lentitud. Algunas sentencias llegan. Muchas no. Lo recuperado es una fracción pequeña de lo desviado.',
      },
      state: { mode: 'patterns', year: 2019, pinnedCode: 'P3' },
      dwellMs: 9500,
    },
    {
      id: 'lesson',
      number: 6,
      yearLabel: { en: 'Now', es: 'Ahora' },
      title: { en: 'The Lesson', es: 'La Lección' },
      body: {
        en: 'Pattern P3 — Single-Use Intermediary — now anchors RUBLI\'s detection model. The next Estafa Maestra is detectable in real time, in this very dashboard, the moment the contracts are signed. The technical question has been answered. The political one remains.',
        es: 'El patrón P3 — Intermediaria de Uso Único — ahora ancla el modelo de detección de RUBLI. La próxima Estafa Maestra es detectable en tiempo real, en este mismo tablero, en el momento en que se firman los contratos. La pregunta técnica está respondida. La política sigue en pie.',
      },
      state: { mode: 'patterns', year: 2024, pinnedCode: 'P3' },
      dwellMs: 11000,
    },
  ],
  closing: {
    headline: {
      en: 'The next one is detectable in real time.',
      es: 'La próxima es detectable en tiempo real.',
    },
    body: {
      en: 'P3 was visible in COMPRANET from 2010. La Estafa Maestra was named publicly in 2017. The platform you are reading exists so the gap between "visible" and "named" closes from seven years to seven days.',
      es: 'P3 fue visible en COMPRANET desde 2010. La Estafa Maestra se nombró públicamente en 2017. La plataforma que estás leyendo existe para que la brecha entre "visible" y "nombrado" pase de siete años a siete días.',
    },
  },
  longformSlug: 'la-industria-del-intermediario',
}

// ─────────────────────────────────────────────────────────────────────────────
// EL AÑO COVID — 5 chapters, ~45s
// ─────────────────────────────────────────────────────────────────────────────
const COVID_YEAR: Story = {
  id: 'covid_year',
  title: {
    en: 'The COVID Year',
    es: 'El Año COVID',
  },
  subtitle: {
    en: '2020 was a public health emergency. It was also a procurement event. The constellation lit up — and stayed lit.',
    es: '2020 fue una emergencia de salud pública. También fue un evento de contratación. La constelación se encendió — y siguió encendida.',
  },
  blurb: {
    en: '5 chapters · 2019 baseline → emergency procurement → cohort → new normal',
    es: '5 capítulos · base 2019 → compras emergencia → cohorte → nueva normalidad',
  },
  duration: '~45s',
  accent: '#dc2626',
  chapters: [
    {
      id: 'baseline',
      number: 1,
      yearLabel: { en: '2019', es: '2019' },
      title: { en: 'Before', es: 'Antes' },
      body: {
        en: 'Mexican federal procurement entered 2020 already at 79% direct-award rate — well above the OECD recommended ceiling of 30%. The pattern was bad. It was also stable. The constellation distribution was, by recent standards, a baseline.',
        es: 'La contratación federal mexicana entró a 2020 ya con 79% de adjudicación directa — muy por encima del techo recomendado por la OCDE de 30%. El patrón era malo. También era estable. La distribución de la constelación era, según los estándares recientes, una línea base.',
      },
      state: { mode: 'patterns', year: 2019, pinnedCode: null },
      dwellMs: 8500,
    },
    {
      id: 'emergency',
      number: 2,
      yearLabel: { en: 'March 2020', es: 'Marzo 2020' },
      title: { en: 'The Emergency Provisions', es: 'Las Disposiciones de Emergencia' },
      body: {
        en: 'On March 30, 2020, COVID-19 is declared a national health emergency. Article 41 of the Federal Procurement Law permits direct-award in emergency conditions. Within weeks, the share of contracts awarded without competition climbs to 87% — the highest single-year reading in the COMPRANET record.',
        es: 'El 30 de marzo de 2020, COVID-19 se declara emergencia sanitaria nacional. El artículo 41 de la LAASSP permite adjudicación directa en condiciones de emergencia. En semanas, la proporción de contratos sin licitación trepa al 87% — la lectura anual más alta en el registro COMPRANET.',
      },
      pull: {
        value: { en: '87%', es: '87%' },
        caption: {
          en: 'highest single-year direct-award rate (2002–2025)',
          es: 'mayor tasa anual de adjudicación directa (2002–2025)',
        },
      },
      state: { mode: 'patterns', year: 2020, pinnedCode: 'P5' },
      dwellMs: 11000,
    },
    {
      id: 'cohort',
      number: 3,
      yearLabel: { en: '2020', es: '2020' },
      title: { en: 'The Cohort', es: 'La Cohorte' },
      body: {
        en: 'A cohort of suppliers receives extraordinary volume — HEMOSER, $17.2B in IMSS medical supplies; Cyplam, multi-billion in personal protective equipment; smaller firms with no prior IMSS history processing same-day awards. The medical-equipment category cluster doubles in two months.',
        es: 'Una cohorte de proveedores recibe volumen extraordinario — HEMOSER, 17,200 MDP en insumos médicos al IMSS; Cyplam, miles de millones en equipo de protección personal; pequeñas firmas sin historial IMSS previo procesando adjudicaciones mismo-día. El cúmulo de equipo médico se duplica en dos meses.',
      },
      state: { mode: 'categories', year: 2020, pinnedCode: 'equipo_medico' },
      dwellMs: 11000,
    },
    {
      id: 'sustained',
      number: 4,
      yearLabel: { en: '2021–2022', es: '2021–2022' },
      title: { en: 'After the Wave', es: 'Después de la Ola' },
      body: {
        en: 'The acute phase of the emergency passes. The procurement adjustment does not. Direct-award rate settles at 80–81% in 2021 and 75% in 2022 — higher than the pre-COVID baseline of 76%. The channels that opened in March 2020 do not fully close.',
        es: 'La fase aguda de la emergencia pasa. El ajuste de contratación no. La adjudicación directa se estabiliza en 80–81% en 2021 y 75% en 2022 — más alto que el promedio pre-COVID de 76%. Los canales que se abrieron en marzo de 2020 no se cierran del todo.',
      },
      state: { mode: 'patterns', year: 2022, pinnedCode: 'P5' },
      dwellMs: 9000,
    },
    {
      id: 'legacy',
      number: 5,
      yearLabel: { en: '2024', es: '2024' },
      title: { en: 'The New Normal', es: 'La Nueva Normalidad' },
      body: {
        en: 'Five years after the emergency, the new baseline is 75–78% direct-award. What was supposed to be an exception became the floor. The COVID year is not over in the data. It is what 2024 is built on.',
        es: 'Cinco años después de la emergencia, la nueva base es 75–78% de adjudicación directa. Lo que debía ser una excepción se volvió el piso. El año COVID no ha terminado en los datos. Es sobre lo que se construye 2024.',
      },
      state: { mode: 'patterns', year: 2024, pinnedCode: 'P5' },
      dwellMs: 10000,
    },
  ],
  closing: {
    headline: {
      en: 'The exception became the floor.',
      es: 'La excepción se volvió el piso.',
    },
    body: {
      en: 'COVID-19 was a justifiable suspension of competitive procurement. What the data shows is that the suspension never fully reversed. The next emergency will inherit this floor.',
      es: 'COVID-19 fue una suspensión justificable de la licitación competitiva. Lo que muestran los datos es que la suspensión nunca se revirtió por completo. La próxima emergencia heredará este piso.',
    },
  },
}

export const ATLAS_STORIES: Story[] = [PHARMA_CARTEL, ESTAFA_MAESTRA, COVID_YEAR]

/** Look up a story by id, or null if not found. */
export function findStory(id: string): Story | null {
  return ATLAS_STORIES.find((s) => s.id === id) ?? null
}

/**
 * Reverse lookup: given a /stories/:slug long-form slug, return the
 * Observatory tour that is the visual trailer for it (or null if no tour
 * exists for this slug). Used by the long-form story page to surface a
 * "View in the Observatory" affordance.
 */
export function findStoryByLongformSlug(slug: string): Story | null {
  return ATLAS_STORIES.find((s) => s.longformSlug === slug) ?? null
}

/** Total chapters across all stories — used for analytics / progress hints. */
export const STORY_TOTAL_CHAPTERS = ATLAS_STORIES.reduce(
  (sum, s) => sum + s.chapters.length,
  0,
)
