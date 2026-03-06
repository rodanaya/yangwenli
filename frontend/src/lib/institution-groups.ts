/**
 * Institution Group Definitions
 * Maps fragmented institution name variants into canonical parent groups.
 * Used for: NetworkGraph clustering, MoneyFlow grouping, institution cards.
 *
 * Logo strategy:
 *  - Tier 1 (large orgs): official SVG logo path under /logos/
 *  - Tier 2: sector-colored initials badge (auto-generated from acronym)
 */

export interface InstitutionGroup {
  id: string
  /** Canonical display name */
  name: string
  /** Short name / acronym for tight spaces */
  shortName: string
  /** Path to logo SVG under /public/logos/, or null for initials badge */
  logo: string | null
  /** Sector color from taxonomy */
  color: string
  /** Sector ID */
  sectorId: number
  /** Official website (for favicon fallback) */
  website: string | null
  /** Wikipedia article title (Spanish) for thumbnail fallback when no local logo */
  wikiArticle?: string | null
  /** DB institution name fragments that belong to this group */
  members: string[]
}

export const INSTITUTION_GROUPS: InstitutionGroup[] = [
  // ── ENERGY ──────────────────────────────────────────────────────────────
  {
    id: 'pemex',
    name: 'Petróleos Mexicanos',
    shortName: 'PEMEX',
    logo: '/logos/pemex.svg',
    color: '#eab308',
    sectorId: 4,
    website: 'https://www.pemex.com',
    members: [
      'PEMEX REFINACIÓN',
      'PEMEX EXPLORACIÓN Y PRODUCCIÓN',
      'PEMEX GAS Y PETROQUÍMICA BÁSICA',
      'Pemex-Gas y Petroquímica Básica',
      'Pemex-Petroquímica',
      'PEMEX PETROQUÍMICA',
      'Pemex-Refinación',
      'Pemex-Exploración y Producción',
      'Petróleos Mexicanos (Corporativo)',
      'PETRÓLEOS MEXICANOS',
      'INSTITUTO MEXICANO DEL PETRÓLEO',
    ],
  },
  {
    id: 'cfe',
    name: 'Comisión Federal de Electricidad',
    shortName: 'CFE',
    logo: '/logos/cfe.svg',
    color: '#eab308',
    sectorId: 4,
    website: 'https://www.cfe.mx',
    members: [
      'COMISIÓN FEDERAL DE ELECTRICIDAD',
      'CFE DISTRIBUCIÓN',
      'CFE TRANSMISIÓN',
      'CFE SUMINISTRADOR DE SERVICIOS BÁSICOS',
      'CFE GENERACIÓN VI',
      'CFE ENERGÍA',
      'CFE INTERMEDIACIÓN DE CONTRATOS LEGADOS',
      'CFE TELECOMUNICACIONES E INTERNET PARA TODOS',
      'Instituto Nacional de Electricidad y Energías Limpias',
    ],
  },

  // ── SALUD ────────────────────────────────────────────────────────────────
  {
    id: 'imss',
    name: 'Instituto Mexicano del Seguro Social',
    shortName: 'IMSS',
    logo: '/logos/imss.svg',
    color: '#dc2626',
    sectorId: 1,
    website: 'https://www.imss.gob.mx',
    members: [
      'INSTITUTO MEXICANO DEL SEGURO SOCIAL',
      'SERVICIOS DE SALUD DEL INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR',
      'IMSS-BIENESTAR',
    ],
  },
  {
    id: 'issste',
    name: 'Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado',
    shortName: 'ISSSTE',
    logo: '/logos/issste.svg',
    color: '#dc2626',
    sectorId: 1,
    website: 'https://www.gob.mx/issste',
    members: [
      'INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO',
    ],
  },
  {
    id: 'salud-federal',
    name: 'Secretaría de Salud',
    shortName: 'SSA',
    logo: '/logos/ssa.svg',
    color: '#dc2626',
    sectorId: 1,
    website: 'https://www.gob.mx/salud',
    members: [
      'SECRETARÍA DE SALUD',
      'Instituto de Salud para el Bienestar',
      'CONSEJO NACIONAL PARA EL CONTROL DE ESTUPEFACIENTES',
    ],
  },
  {
    id: 'hospitales-nacionales',
    name: 'Hospitales Nacionales de Alta Especialidad',
    shortName: 'Hospitales',
    logo: null,
    color: '#dc2626',
    sectorId: 1,
    website: null,
    wikiArticle: 'Instituto_Nacional_de_Cancerología',
    members: [
      'HOSPITAL JUÁREZ DE MÉXICO',
      'HOSPITAL INFANTIL DE MÉXICO FEDERICO GÓMEZ',
      'Hospital General de México "Dr. Eduardo Liceaga"',
      'INSTITUTO NACIONAL DE CANCEROLOGÍA',
      'INSTITUTO NACIONAL DE CARDIOLOGÍA IGNACIO CHÁVEZ',
      'INSTITUTO NACIONAL DE PEDIATRÍA',
      'Instituto Nacional de Neurología y Neurocirugía Manuel Velasco Suárez',
      'Instituto Nacional de Rehabilitación Luis Guillermo Ibarra Ibarra',
      'Instituto Nacional de Perinatología Isidro Espinosa de los Reyes',
      'Instituto Nacional de Enfermedades Respiratorias Ismael Cosío Villegas',
      'Instituto Nacional de Psiquiatría Ramón de la Fuente Muñiz',
      'INSTITUTO NACIONAL DE CIENCIAS MÉDICAS Y NUTRICIÓN SALVADOR ZUBIRÁN',
      'INSTITUTO NACIONAL DE SALUD PÚBLICA',
      'Hospital General "Dr. Manuel Gea González"',
      'HOSPITAL REGIONAL DE ALTA ESPECIALIDAD DEL BAJÍO',
      'Hospital Regional de Alta Especialidad de Ciudad Victoria "Bicentenario 2010"',
    ],
  },

  // ── INFRAESTRUCTURA ──────────────────────────────────────────────────────
  {
    id: 'sct',
    name: 'Secretaría de Infraestructura, Comunicaciones y Transportes',
    shortName: 'SICT',
    logo: '/logos/sict.svg',
    color: '#ea580c',
    sectorId: 3,
    website: 'https://www.gob.mx/sict',
    members: [
      'SECRETARÍA DE COMUNICACIONES Y TRANSPORTES',
      'Secretaría de Infraestructura, Comunicaciones y Transportes',
      'INFRAESTRUCTURA, COMUNICACIONES Y TRANSPORTES',
      'CAMINOS Y PUENTES FEDERALES DE INGRESOS Y SERVICIOS CONEXOS',
      'AEROPUERTOS Y SERVICIOS AUXILIARES',
    ],
  },

  // ── EDUCACIÓN ────────────────────────────────────────────────────────────
  {
    id: 'sep',
    name: 'Secretaría de Educación Pública',
    shortName: 'SEP',
    logo: '/logos/sep.svg',
    color: '#3b82f6',
    sectorId: 2,
    website: 'https://www.gob.mx/sep',
    members: [
      'SECRETARÍA DE EDUCACIÓN PÚBLICA',
      'Comisión Nacional de Libros de Texto Gratuitos',
      'CONSEJO NACIONAL DE FOMENTO EDUCATIVO',
      'Instituto Nacional de la Infraestructura Física Educativa',
    ],
  },
  {
    id: 'ipn',
    name: 'Instituto Politécnico Nacional',
    shortName: 'IPN',
    logo: '/logos/ipn.svg',
    color: '#3b82f6',
    sectorId: 2,
    website: 'https://www.ipn.mx',
    members: [
      'INSTITUTO POLITÉCNICO NACIONAL',
      'XE-IPN Canal 11',
      'Centro de Investigación y de Estudios Avanzados del Instituto Politécnico Nacional',
      'CORPORACIÓN MEXICANA DE INVESTIGACIÓN EN MATERIALES, S.A. DE C.V.',
    ],
  },

  // ── HACIENDA / FINANZAS ──────────────────────────────────────────────────
  {
    id: 'shcp',
    name: 'Secretaría de Hacienda y Crédito Público',
    shortName: 'SHCP',
    logo: '/logos/shcp.svg',
    color: '#16a34a',
    sectorId: 7,
    website: 'https://www.gob.mx/shcp',
    members: [
      'SECRETARÍA DE HACIENDA Y CRÉDITO PÚBLICO',
      'SERVICIO DE ADMINISTRACIÓN TRIBUTARIA',
      'INSTITUTO DEL FONDO NACIONAL PARA EL CONSUMO DE LOS TRABAJADORES',
      'BANCO NACIONAL DE OBRAS Y SERVICIOS PÚBLICOS, S.N.C.',
      'NACIONAL FINANCIERA, S.N.C.',
      'BANCO NACIONAL DE COMERCIO EXTERIOR, S.N.C.',
      'BANCO NACIONAL DEL EJÉRCITO, FUERZA AÉREA Y ARMADA, S.N.C.',
      'CASA DE MONEDA DE MÉXICO',
    ],
  },

  // ── ALIMENTACIÓN / BIENESTAR ────────────────────────────────────────────
  {
    id: 'segalmex',
    name: 'Segalmex / Alimentación para el Bienestar',
    shortName: 'Segalmex',
    logo: null,
    color: '#22c55e',
    sectorId: 9,
    website: 'https://www.gob.mx/segalmex',
    wikiArticle: 'Segalmex',
    members: [
      'Diconsa, S.A. de C.V.',
      'ALIMENTACIÓN PARA EL BIENESTAR, S.A. DE C.V.',
      'LICONSA, S.A. DE C.V.',
    ],
  },

  // ── AGUA / AMBIENTE ─────────────────────────────────────────────────────
  {
    id: 'agua',
    name: 'Comisión Nacional del Agua',
    shortName: 'CONAGUA',
    logo: '/logos/conagua.svg',
    color: '#10b981',
    sectorId: 10,
    website: 'https://www.gob.mx/conagua',
    members: [
      'COMISIÓN NACIONAL DEL AGUA',
      'COMISIÓN NACIONAL FORESTAL',
    ],
  },

  // ── GOBERNACIÓN ──────────────────────────────────────────────────────────
  {
    id: 'segob',
    name: 'Secretaría de Gobernación',
    shortName: 'SEGOB',
    logo: null,
    color: '#be123c',
    sectorId: 8,
    website: 'https://www.gob.mx/segob',
    wikiArticle: 'Secretaría_de_Gobernación_(México)',
    members: [
      'SECRETARÍA DE GOBERNACIÓN',
      'SECRETARÍA ANTICORRUPCIÓN Y BUEN GOBIERNO',
      'SECRETARÍA DE LA FUNCIÓN PÚBLICA',
      'Instituto Nacional de los Pueblos Indígenas',
      'SISTEMA NACIONAL PARA EL DESARROLLO INTEGRAL DE LA FAMILIA',
    ],
  },

  // ── DEFENSA ──────────────────────────────────────────────────────────────
  {
    id: 'sedena',
    name: 'Secretaría de la Defensa Nacional',
    shortName: 'SEDENA',
    logo: '/logos/sedena.svg',
    color: '#1e3a5f',
    sectorId: 5,
    website: 'https://www.gob.mx/sedena',
    members: [
      'SECRETARÍA DE LA DEFENSA NACIONAL',
    ],
  },
  {
    id: 'marina',
    name: 'Secretaría de Marina',
    shortName: 'SEMAR',
    logo: '/logos/semar.svg',
    color: '#1e3a5f',
    sectorId: 5,
    website: 'https://www.gob.mx/semar',
    members: [
      'Secretaría de Marina',
    ],
  },

  // ── AGRICULTURA / CAMPO ──────────────────────────────────────────────────────
  {
    id: 'sader',
    name: 'Secretaría de Agricultura y Desarrollo Rural',
    shortName: 'SADER',
    logo: null,
    color: '#22c55e',
    sectorId: 9,
    website: 'https://www.gob.mx/agricultura',
    wikiArticle: 'Secretaría_de_Agricultura_y_Desarrollo_Rural',
    members: [
      'SECRETARÍA DE AGRICULTURA Y DESARROLLO RURAL',
      'SECRETARÍA DE AGRICULTURA, GANADERÍA, DESARROLLO RURAL, PESCA Y ALIMENTACIÓN',
      'SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA',
      'COMISIÓN NACIONAL DE ACUACULTURA Y PESCA',
      'APOYOS Y SERVICIOS A LA COMERCIALIZACIÓN AGROPECUARIA',
      'FINANCIERA NACIONAL DE DESARROLLO AGROPECUARIO, RURAL, FORESTAL Y PESQUERO',
    ],
  },

  // ── TRABAJO ──────────────────────────────────────────────────────────────────
  {
    id: 'stps',
    name: 'Secretaría del Trabajo y Previsión Social',
    shortName: 'STPS',
    logo: null,
    color: '#f97316',
    sectorId: 11,
    website: 'https://www.gob.mx/stps',
    wikiArticle: 'Secretaría_del_Trabajo_y_Previsión_Social_(México)',
    members: [
      'SECRETARÍA DEL TRABAJO Y PREVISIÓN SOCIAL',
      'PROCURADURÍA FEDERAL DE LA DEFENSA DEL TRABAJO',
    ],
  },
  {
    id: 'infonavit',
    name: 'Instituto del Fondo Nacional de la Vivienda para los Trabajadores',
    shortName: 'INFONAVIT',
    logo: null,
    color: '#f97316',
    sectorId: 11,
    website: 'https://www.infonavit.org.mx',
    wikiArticle: 'Infonavit',
    members: [
      'INSTITUTO DEL FONDO NACIONAL DE LA VIVIENDA PARA LOS TRABAJADORES',
    ],
  },

  // ── TECNOLOGÍA / COMUNICACIONES ───────────────────────────────────────────────
  {
    id: 'sct-telecom',
    name: 'Agencia Digital de Innovación Pública',
    shortName: 'ADIP',
    logo: null,
    color: '#8b5cf6',
    sectorId: 6,
    website: 'https://adip.cdmx.gob.mx',
    wikiArticle: null,
    members: [
      'COORDINACIÓN DE ESTRATEGIA DIGITAL NACIONAL',
      'AGENCIA DIGITAL DE INNOVACIÓN PÚBLICA',
    ],
  },

  // ── MEDIO AMBIENTE ────────────────────────────────────────────────────────────
  {
    id: 'semarnat',
    name: 'Secretaría de Medio Ambiente y Recursos Naturales',
    shortName: 'SEMARNAT',
    logo: null,
    color: '#10b981',
    sectorId: 10,
    website: 'https://www.gob.mx/semarnat',
    wikiArticle: 'Secretaría_de_Medio_Ambiente_y_Recursos_Naturales',
    members: [
      'SECRETARÍA DE MEDIO AMBIENTE Y RECURSOS NATURALES',
      'PROCURADURÍA FEDERAL DE PROTECCIÓN AL AMBIENTE',
      'COMISIÓN DE RECURSOS NATURALES',
    ],
  },

  // ── RELACIONES EXTERIORES ─────────────────────────────────────────────────────
  {
    id: 'sre',
    name: 'Secretaría de Relaciones Exteriores',
    shortName: 'SRE',
    logo: null,
    color: '#be123c',
    sectorId: 8,
    website: 'https://www.gob.mx/sre',
    wikiArticle: 'Secretaría_de_Relaciones_Exteriores_(México)',
    members: [
      'SECRETARÍA DE RELACIONES EXTERIORES',
      'INSTITUTO DE LOS MEXICANOS EN EL EXTERIOR',
      'INSTITUTO MATÍAS ROMERO',
    ],
  },

  // ── ECONOMÍA ─────────────────────────────────────────────────────────────────
  {
    id: 'economia',
    name: 'Secretaría de Economía',
    shortName: 'SE',
    logo: null,
    color: '#16a34a',
    sectorId: 7,
    website: 'https://www.gob.mx/se',
    wikiArticle: 'Secretaría_de_Economía_(México)',
    members: [
      'SECRETARÍA DE ECONOMÍA',
      'COMISIÓN FEDERAL DE COMPETENCIA ECONÓMICA',
      'PROCURADURÍA FEDERAL DEL CONSUMIDOR',
      'INSTITUTO MEXICANO DE LA PROPIEDAD INDUSTRIAL',
    ],
  },

  // ── TURISMO ───────────────────────────────────────────────────────────────────
  {
    id: 'sectur',
    name: 'Secretaría de Turismo',
    shortName: 'SECTUR',
    logo: null,
    color: '#0ea5e9',
    sectorId: 12,
    website: 'https://www.gob.mx/sectur',
    wikiArticle: 'Secretaría_de_Turismo_(México)',
    members: [
      'SECRETARÍA DE TURISMO',
      'CONSEJO DE PROMOCIÓN TURÍSTICA DE MÉXICO',
      'FONATUR',
      'FONDO NACIONAL DE FOMENTO AL TURISMO',
    ],
  },

  // ── CULTURA ───────────────────────────────────────────────────────────────────
  {
    id: 'cultura',
    name: 'Secretaría de Cultura',
    shortName: 'Cultura',
    logo: null,
    color: '#ec4899',
    sectorId: 12,
    website: 'https://www.gob.mx/cultura',
    wikiArticle: 'Secretaría_de_Cultura_(México)',
    members: [
      'SECRETARÍA DE CULTURA',
      'CONSEJO NACIONAL PARA LA CULTURA Y LAS ARTES',
      'INSTITUTO NACIONAL DE BELLAS ARTES Y LITERATURA',
      'INSTITUTO NACIONAL DE ANTROPOLOGÍA E HISTORIA',
      'CANAL ONCE',
    ],
  },

  // ── BIENESTAR ─────────────────────────────────────────────────────────────────
  {
    id: 'bienestar',
    name: 'Secretaría de Bienestar',
    shortName: 'Bienestar',
    logo: null,
    color: '#22c55e',
    sectorId: 9,
    website: 'https://www.gob.mx/bienestar',
    wikiArticle: 'Secretaría_de_Bienestar_(México)',
    members: [
      'SECRETARÍA DE BIENESTAR',
      'SECRETARÍA DE DESARROLLO SOCIAL',
      'INSTITUTO NACIONAL DE DESARROLLO SOCIAL',
      'COORDINACIÓN NACIONAL DE BECAS PARA EL BIENESTAR BENITO JUÁREZ',
    ],
  },

  // ── CIENCIA / INVESTIGACIÓN ───────────────────────────────────────────────────
  {
    id: 'conahcyt',
    name: 'Consejo Nacional de Humanidades, Ciencias y Tecnologías',
    shortName: 'CONAHCYT',
    logo: null,
    color: '#8b5cf6',
    sectorId: 6,
    website: 'https://conahcyt.mx',
    wikiArticle: 'Consejo_Nacional_de_Humanidades,_Ciencias_y_Tecnologías',
    members: [
      'CONSEJO NACIONAL DE CIENCIA Y TECNOLOGÍA',
      'CONSEJO NACIONAL DE HUMANIDADES, CIENCIAS Y TECNOLOGÍAS',
      'CONAHCYT',
    ],
  },

  // ── JUSTICIA ─────────────────────────────────────────────────────────────────
  {
    id: 'fgr',
    name: 'Fiscalía General de la República',
    shortName: 'FGR',
    logo: null,
    color: '#be123c',
    sectorId: 8,
    website: 'https://www.gob.mx/fgr',
    wikiArticle: 'Fiscalía_General_de_la_República_(México)',
    members: [
      'FISCALÍA GENERAL DE LA REPÚBLICA',
      'PROCURADURÍA GENERAL DE LA REPÚBLICA',
    ],
  },
  {
    id: 'poder-judicial',
    name: 'Poder Judicial de la Federación',
    shortName: 'PJF',
    logo: null,
    color: '#6b7280',
    sectorId: 12,
    website: 'https://www.scjn.gob.mx',
    wikiArticle: 'Suprema_Corte_de_Justicia_de_la_Nación',
    members: [
      'SUPREMA CORTE DE JUSTICIA DE LA NACIÓN',
      'CONSEJO DE LA JUDICATURA FEDERAL',
      'TRIBUNAL ELECTORAL DEL PODER JUDICIAL DE LA FEDERACIÓN',
    ],
  },

  // ── SEGURIDAD ─────────────────────────────────────────────────────────────────
  {
    id: 'sspc',
    name: 'Secretaría de Seguridad y Protección Ciudadana',
    shortName: 'SSPC',
    logo: null,
    color: '#1e3a5f',
    sectorId: 5,
    website: 'https://www.gob.mx/sspc',
    wikiArticle: 'Secretaría_de_Seguridad_y_Protección_Ciudadana_(México)',
    members: [
      'SECRETARÍA DE SEGURIDAD Y PROTECCIÓN CIUDADANA',
      'SECRETARÍA DE SEGURIDAD PÚBLICA',
      'COMISIÓN NACIONAL DE SEGURIDAD',
      'POLICÍA FEDERAL',
      'GUARDIA NACIONAL',
      'CENTRO NACIONAL DE INTELIGENCIA',
    ],
  },
]

/** Build a reverse lookup: DB institution name → group */
export const INSTITUTION_NAME_TO_GROUP: Map<string, InstitutionGroup> = new Map(
  INSTITUTION_GROUPS.flatMap(group =>
    group.members.map(member => [member.toUpperCase(), group])
  )
)

/** Find group for a given institution name (case-insensitive) */
export function getInstitutionGroup(name: string): InstitutionGroup | null {
  return INSTITUTION_NAME_TO_GROUP.get(name.toUpperCase()) ?? null
}

/** Get display name: group name if grouped, else original name */
export function getCanonicalName(name: string): string {
  return getInstitutionGroup(name)?.name ?? name
}

/** Get short name for tight spaces */
export function getShortName(name: string): string {
  return getInstitutionGroup(name)?.shortName ?? name.slice(0, 12)
}

/** Color for institution (group color or sector fallback) */
export function getInstitutionColor(name: string, fallback = '#64748b'): string {
  return getInstitutionGroup(name)?.color ?? fallback
}
