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
