/**
 * Pattern exemplars — one famous, well-documented Mexican procurement
 * scandal per P1..P7 pattern. The case becomes the editorial anchor on
 * the SpotlightCard, turning an abstract pattern label into a concrete
 * "yes, I know that case" recognition moment.
 *
 * Sourcing: each exemplar is a ground-truth case present in our
 * ground_truth_cases table (or directly cited by major investigative
 * outlets — MCCI, Animal Político, Quinto Elemento, NYT, Reforma).
 *
 * To revise: prefer cases with English-language coverage so EN users
 * recognize them. Period is the documented active span, not the
 * litigation timeline.
 */

export interface PatternExemplar {
  /** Pattern code this exemplar anchors. */
  code: string
  /** Spanish-language case name (canonical, used in es). */
  name_es: string
  /** English-language case name (when widely covered in EN press,
   *  otherwise the Spanish title is reused). */
  name_en: string
  /** Active period as displayed: "2014–2017" — em-dash, no space. */
  period: string
  /** Optional one-line context (used in tooltip / future expand). */
  context_es?: string
  context_en?: string
}

export const PATTERN_EXEMPLARS: Record<string, PatternExemplar> = {
  P1: {
    code: 'P1',
    name_es: 'PEMEX – Vitol',
    name_en: 'PEMEX – Vitol',
    period: '2014–2020',
    context_es: 'Vitol declaró culpa en EE. UU. por sobornos a funcionarios de PEMEX para asegurar suministros de combustible.',
    context_en: 'Vitol pleaded guilty in the US to bribing PEMEX officials to lock up fuel supply contracts.',
  },
  P2: {
    code: 'P2',
    name_es: 'Contratistas ficticios PEMEX–Lozoya',
    name_en: 'PEMEX–Lozoya ghost contractors',
    period: '2013–2016',
    context_es: 'Contratistas individuales sin RFC ni historial ganaron contratos millonarios y desaparecieron del registro.',
    context_en: 'Individual contractors with no RFC and no history won massive contracts then vanished.',
  },
  P3: {
    code: 'P3',
    name_es: 'Personas físicas SAE',
    name_en: 'SAE individual contractors',
    period: '2017',
    context_es: '38 personas físicas con contratos idénticos de 372 MDP cada una, sin actividad previa ni posterior.',
    context_en: '38 individuals each awarded identical 372 MXN-million contracts, with no prior or later activity.',
  },
  P4: {
    code: 'P4',
    name_es: 'Línea 12 del Metro',
    name_en: 'Mexico City Metro Line 12',
    period: '2008–2014',
    context_es: 'Consorcio ICA – Alstom – Carso ganó la licitación; el tramo elevado colapsó en 2021.',
    context_en: 'ICA – Alstom – Carso consortium won the bid; the elevated stretch collapsed in 2021.',
  },
  P5: {
    code: 'P5',
    name_es: 'Vacunas COVID – Birmex',
    name_en: 'COVID vaccine procurement',
    period: '2020–2021',
    context_es: 'Adjudicaciones directas a precios muy por encima del promedio internacional durante la emergencia.',
    context_en: 'Direct awards at prices well above the international average during the public-health emergency.',
  },
  P6: {
    code: 'P6',
    name_es: 'La Estafa Maestra',
    name_en: 'La Estafa Maestra',
    period: '2013–2014',
    context_es: '11 universidades públicas convirtieron 7,670 MDP en contratos a 186 empresas fantasma con la SEDESOL.',
    context_en: '11 public universities funneled 7.67 billion MXN to 186 ghost companies via SEDESOL.',
  },
  P7: {
    code: 'P7',
    name_es: 'Red Grupo Higa',
    name_en: 'Grupo Higa network',
    period: '2012–2018',
    context_es: 'Red de contratistas vinculados al constructor de la Casa Blanca, con co-licitaciones recurrentes en SCT y OHL.',
    context_en: 'Network of contractors tied to the Casa Blanca builder, with recurring co-bids across SCT and OHL.',
  },
}

/** Lookup helper — returns null for non-pattern codes (sectors, sexenios). */
export function getExemplarFor(code: string): PatternExemplar | null {
  return PATTERN_EXEMPLARS[code] ?? null
}
