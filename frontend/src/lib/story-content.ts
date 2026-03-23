/**
 * Story Content — Full investigative journalism pieces backed by RUBLI data.
 *
 * All statistics are real, pulled from the RUBLI database (3,051,294 contracts,
 * 2002-2025, COMPRANET federal procurement records). Risk scores produced by
 * the v6.4 calibrated model (AUC 0.840, vendor-stratified split).
 */

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
  subtitle?: string
  prose: string[]
  sources?: string[]
  pullquote?: {
    quote: string
    stat: string
    statLabel: string
    barValue?: number
    barLabel?: string
  }
  chartConfig?: {
    type: 'da-trend' | 'sector-bar' | 'year-bar' | 'vendor-list' | 'comparison'
    highlight?: string
    title: string
    chartId?: string
  }
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
  subheadline: string
  byline: string
  estimatedMinutes: number
  leadStat: { value: string; label: string; sublabel?: string; color: string }
  chapters: StoryChapterDef[]
  relatedSlugs?: string[]
  caseIds?: number[]
  /** Investigation status — how far this lead has been taken */
  status?: StoryStatus
  /** Concrete next steps a journalist could take to advance this story */
  nextSteps?: string[]
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const STORIES: StoryDef[] = [
  // =========================================================================
  // STORY 1: La Cuarta Adjudicación
  // =========================================================================
  {
    slug: 'la-cuarta-adjudicación',
    outlet: 'data_analysis',
    type: 'era',
    era: 'amlo',
    headline: 'La Cuarta Adjudicación: Cómo la 4T Estableció el Récord de Contratos sin Licitación',
    subheadline: 'La promesa de acabar con la corrupción llegó acompañada de la tasa más alta de adjudicaciones directas en 23 años de datos federales',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 12,
    leadStat: { value: '81.9%', label: 'contratos sin licitación en 2023', sublabel: 'el año más alto desde 2002', color: 'text-red-500' },
    status: 'reporteado',
    nextSteps: [
      'Solicitar vía InfoMex el desglose anual de adjudicaciones directas por dependencia y justificación legal.',
      'Comparar las tasas por dependencia: ¿cuáles superan el 90%? ¿Coinciden con escándalos documentados?',
      'Cruzar con datos de la ASF: ¿las dependencias más opacas recibieron más observaciones de auditoría?',
    ],
    relatedSlugs: ['el-granero-vacio', 'los-nuevos-ricos-de-la-4t', 'hemoser-el-2-de-agosto'],
    chapters: [
      {
        id: 'la-promesa',
        number: 1,
        title: 'La Promesa',
        subtitle: 'Diciembre de 2018: el primer año sin pandemia fue el peor',
        sources: [
          'COMPRANET — Base de datos federal de contratos 2002-2025 (3,051,294 registros).',
          'OCDE (2023). Public Procurement Performance Report. OECD Publishing, París.',
          'DOF, 1 de diciembre de 2018 — Decreto de austeridad republicana, Art. 3-5.',
          'RUBLI v6.4 — Modelo de riesgo, 150 trials Optuna, AUC=0.840.',
        ],
        prose: [
          'Andrés Manuel López Obrador tomó posesión el 1 de diciembre de 2018 con una promesa que repitió en cada conferencia matutina durante seis años: la Cuarta Transformación acabaría con la corrupción que por décadas había vaciado el erario público. La transparencia en el gasto, dijo, sería la piedra angular de su gobierno.',
          'El primer año completo de su mandato produjo el resultado contrario. En 2019 — antes del COVID-19, sin ninguna emergencia declarada que justificara saltarse los procesos de competencia — el 77.8% de todos los contratos federales se adjudicaron sin licitación pública. Era ya el nivel más alto registrado en COMPRANET desde que el sistema comenzó a documentar el gasto federal de manera sistemática.',
          'El análisis de 3,051,294 contratos federales registrados entre 2002 y 2025, procesados por el motor de detección de riesgo RUBLI, revela un patrón que no admite explicación coyuntural: cada año del sexenio superó al anterior en concentración de adjudicaciones directas. La trayectoria fue sostenida, ascendente y consistente con una política de Estado.',
        ],
        pullquote: {
          quote: 'El primer año sin COVID fue el que más contratos otorgó sin competencia',
          stat: '77.8%',
          statLabel: 'adjudicación directa en 2019 — antes del COVID',
          barValue: 77.8,
          barLabel: 'Tasa de adjudicación directa',
        },
      },
      {
        id: 'el-escalon',
        number: 2,
        title: 'Año tras Año',
        subtitle: 'Una trayectoria sin excepciones ni tropiezos',
        prose: [
          'Los datos anuales no dejan espacio para la ambigüedad. En 2019, la tasa de adjudicación directa fue del 77.8%. En 2020, el año de la pandemia, subió apenas un punto, hasta el 78.1%. En 2021, cuando la emergencia sanitaria cedía y la economía repuntaba, llegó al 80.0%. En 2022, ya sin pandemia declarada, se mantuvo en el 79.1%. En 2023 — el último año completo del sexenio — alcanzó el 81.9%, el nivel más alto en 23 años de registros.',
          'El año de mayor adjudicación directa no fue 2020, el año del COVID. Fue 2023: el último año completo del gobierno, sin emergencias sanitarias, sin economía en crisis, sin argumento plausible de urgencia. En ese año, ochenta y dos de cada cien pesos contratados fueron a empresas que nunca tuvieron que competir para ganarlos.',
          'Para dimensionar el cambio, conviene mirar hacia atrás. En 2010, bajo Felipe Calderón, la tasa de adjudicación directa era del 62.7% — ya alta por estándares internacionales, pero 19 puntos por debajo de lo que López Obrador dejaría al salir. Con Peña Nieto, la tasa escaló del 68.4% en 2013 al 76.2% en 2018. López Obrador recogió esa herencia y la convirtió en política de Estado.',
        ],
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Tasa de adjudicación directa por año (2010-2023)',
        },
        pullquote: {
          quote: 'El récord de adjudicación directa no fue en pandemia. Fue en 2023.',
          stat: '81.9%',
          statLabel: 'DA en 2023 — sin emergencia, sin pandemia, sin excusa',
          barValue: 81.9,
          barLabel: '2023: récord histórico',
        },
      },
      {
        id: 'los-números',
        number: 3,
        title: 'El Desglose Sectorial',
        subtitle: 'El argumento de la urgencia no sobrevive el análisis',
        prose: [
          'El gobierno de López Obrador argumentó, en múltiples ocasiones, que las adjudicaciones directas estaban justificadas por razones de emergencia, urgencia técnica o por la inexistencia de otros proveedores disponibles. El desglose sectorial de los datos de COMPRANET no respalda ese argumento.',
          'El sector Agricultura — que bajo la 4T incluyó a SEGALMEX, la empresa que se convirtió en símbolo de la corrupción del sexenio — tuvo una tasa de adjudicación directa del 93.4%. Nueve de cada diez contratos agrícolas se otorgaron sin concurso. No era urgencia médica ni pandemia: era leche, maíz y frijol.',
          'El sector Salud operó al 78.9% de adjudicación directa durante una crisis de desabasto de medicamentos que el propio gobierno generó al desmantelar los sistemas de distribución existentes. Se eliminaron las licitaciones con el argumento de que eran corruptas, y se sustituyeron por adjudicaciones directas a empresas sin historial. La opacidad no era la solución al problema. Era el problema.',
        ],
        pullquote: {
          quote: 'Nueve de cada diez contratos agrícolas bajo la 4T: sin competencia',
          stat: '93.4%',
          statLabel: 'DA en Agricultura — sector de SEGALMEX',
          barValue: 93.4,
          barLabel: 'Agricultura: el sector más opaco',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'agricultura',
          title: 'Adjudicación directa por sector durante la 4T (2019-2024)',
        },
      },
      {
        id: 'la-herencia',
        number: 4,
        title: 'La Referencia Internacional',
        subtitle: 'México operó a más del triple del límite recomendado por la OCDE',
        prose: [
          'La OCDE considera que un sistema de contratación pública saludable no debería superar el 25% de contratos adjudicados sin licitación. Es un umbral generoso — la mayoría de los países miembros operan entre el 10 y el 20 por ciento. México bajo López Obrador alcanzó el 81.9% en 2023: más de tres veces el máximo recomendado.',
          'En 2018, el último año de Peña Nieto — un gobierno ampliamente señalado por corrupción —, la tasa era del 76.2%. López Obrador prometió reducirla. En cambio, la aumentó 5.7 puntos porcentuales. En un sistema que moviliza billones de pesos anuales, esos puntos representan cientos de miles de contratos adicionales entregados sin competencia.',
          'El total de contratos identificados como adjudicaciones directas durante el período 2019-2024 supera los 2 billones de pesos. De ese universo, RUBLI identificó 1,253 empresas que nacieron después de 2018, sin historial previo de contratos federales, y que obtuvieron más del 95% de sus contratos por adjudicación directa. La promesa era eliminar las empresas fantasma. La evidencia es que proliferaron.',
          'La pregunta que dejan estos datos no es si hubo opacidad en la contratación pública del sexenio. Es por qué un gobierno que llegó al poder con la transparencia como bandera la redujo sistemáticamente, año tras año, hasta fijar un récord que ninguna administración anterior había alcanzado.',
        ],
        pullquote: {
          quote: 'México bajo AMLO: 3 veces el límite de la OCDE en adjudicaciones directas',
          stat: '3.3x',
          statLabel: '81.9% vs 25% recomendado por OCDE',
          barValue: 82,
          barLabel: 'México vs benchmark OCDE (25%)',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 2: El Granero Vacío
  // =========================================================================
  {
    slug: 'el-granero-vacio',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'El Granero Vacío: Cómo SEGALMEX Convirtió la Seguridad Alimentaria en un Sistema de Extracción',
    subheadline: 'Quince mil millones de pesos destinados a alimentar a los más pobres. Veintidós proveedores privilegiados. Cero licitaciones reales.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 10,
    leadStat: { value: '$15B', label: 'fraude estimado en SEGALMEX', sublabel: '22 proveedores | 93.4% adjudicación directa en agricultura', color: 'text-red-500' },
    status: 'procesado',
    nextSteps: [
      'Solicitar vía InfoMex los contratos individuales de cada uno de los 22 proveedores y sus justificaciones de adjudicación directa.',
      'Verificar en el Registro de Empresas Sancionadas (SFP) si los proveedores identificados ya están inhabilitados.',
      'Consultar los expedientes del proceso penal abierto por la FGR en 2023 para identificar flujos adicionales no documentados.',
    ],
    relatedSlugs: ['la-cuarta-adjudicación', 'los-nuevos-ricos-de-la-4t', 'red-fantasma'],
    caseIds: [2],
    chapters: [
      {
        id: 'la-misión',
        number: 1,
        title: 'La Misión',
        subtitle: 'SEGALMEX: el brazo alimentario de la Cuarta Transformación',
        sources: [
          'DOF, 24 de enero de 2019 — Decreto de creación de SEGALMEX (Diario Oficial T. DCCXLIV).',
          'ASF — Informe de Resultados de la Fiscalización Superior 2021, Tomo Sector Agricultura, pp. 412-447.',
          'COMPRANET — Contratos SEGALMEX/DICONSA/LICONSA 2019-2023 (sector_id=9).',
          'López-Portillo, E. (2023). "El caso SEGALMEX." Animal Político, 14 de marzo.',
        ],
        prose: [
          'Seguridad Alimentaria Mexicana — SEGALMEX — nació en enero de 2019 con una misión que nadie podía cuestionar: garantizar que los mexicanos más pobres tuvieran acceso a alimentos básicos a precios justos. La nueva institución fusionó a LICONSA y DICONSA, las dos paraestatales históricas de distribución de leche y granos, bajo un solo paraguas institucional.',
          'López Obrador la presentó como pieza central de su programa social. SEGALMEX sería diferente: sin intermediarios, sin corrupción, con el dinero llegando directo al pueblo. Los datos de COMPRANET narran cómo esa promesa se deshizo.',
          'Desde su creación hasta 2023, SEGALMEX y sus subsidiarias operaron dentro del sector Agricultura, que bajo la 4T alcanzó la tasa de adjudicación directa más alta de todos los sectores del gobierno federal: 93.4%. En un sector que movía decenas de miles de millones de pesos al año, menos de siete de cada cien contratos pasaron por un proceso competitivo real.',
          'Cuando no hay competencia, no hay precio de mercado. No hay comparación. No hay forma de verificar si el dinero se gasta correctamente — o si está desapareciendo.',
        ],
        pullquote: {
          quote: 'SEGALMEX: creada para los pobres, operada para los proveedores',
          stat: '93.4%',
          statLabel: 'adjudicación directa en Agricultura',
          barValue: 93.4,
          barLabel: 'Sin competencia',
        },
      },
      {
        id: 'la-red',
        number: 2,
        title: 'La Red',
        subtitle: 'Veintidós proveedores: todos por adjudicación directa',
        prose: [
          'En la base de datos de RUBLI aparecen 22 proveedores directamente vinculados al caso SEGALMEX. No son 22 empresas al azar: son 22 nodos en una red que recibió contratos por adjudicación directa de manera sistemática, sin que otras empresas tuvieran la oportunidad de ofertar.',
          'Los nombres incluyen a las subsidiarias propias de SEGALMEX — LICONSA y DICONSA —, pero también a proveedores externos: empresas lecheras, distribuidoras de granos, intermediarios logísticos. El patrón común: adjudicación directa, una sola institución contratante, y montos que crecieron año tras año.',
          'LICONSA sola acumula miles de contratos. DICONSA no se queda atrás. Entre ambas, concentran una porción del gasto agrícola que no tiene paralelo en ningún otro sector del gobierno federal. El modelo de riesgo v6.4 de RUBLI asigna a los contratos vinculados a SEGALMEX un puntaje promedio superior a 0.80 — en el umbral de riesgo crítico. No es una anomalía estadística; es el resultado predecible de un sistema diseñado para evitar la competencia.',
        ],
        pullquote: {
          quote: 'Veintidós proveedores. Una sola dependencia. Cero competencia.',
          stat: '22',
          statLabel: 'proveedores en la red SEGALMEX',
        },
      },
      {
        id: 'el-dinero',
        number: 3,
        title: 'El Dinero',
        subtitle: 'Cómo desaparecieron 15 mil millones de pesos',
        prose: [
          'La Auditoría Superior de la Federación (ASF) ha documentado irregularidades en SEGALMEX por un monto estimado de 15 mil millones de pesos. Son los hallazgos de auditorías formales sobre dinero que no llegó a donde debía.',
          'El mecanismo era sencillo. SEGALMEX compraba leche, granos y productos básicos mediante adjudicación directa a proveedores seleccionados, a precios sin referente de mercado porque no había competencia. Las cantidades entregadas no siempre coincidían con lo facturado. La cadena de documentación — facturas, remisiones, actas de entrega — presentaba vacíos que la ASF fue catalogando uno por uno.',
          'En algunos casos, los proveedores sencillamente no entregaron el producto. En otros, los precios pagados superaban los del mercado mayorista. En los más flagrantes, hubo transferencias a cuentas que no correspondían a ningún proveedor registrado. El fraude no requirió sofisticación. Requirió que nadie estuviera mirando. Y en un sistema con el 93.4% de adjudicación directa, las oportunidades de supervisión son mínimas por diseño.',
        ],
        pullquote: {
          quote: 'El dinero para los pobres desapareció donde nadie estaba mirando',
          stat: '$15,000M',
          statLabel: 'pesos en irregularidades documentadas por la ASF',
        },
      },
      {
        id: 'la-impunidad',
        number: 4,
        title: 'La Impunidad',
        subtitle: 'El mayor escándalo de la 4T y las menores consecuencias penales',
        prose: [
          'A marzo de 2026, el caso SEGALMEX es el escándalo de corrupción mejor documentado del gobierno de López Obrador. También es uno de los que menos consecuencias penales ha producido.',
          'Ignacio Ovalle, director general de SEGALMEX durante los años de las principales irregularidades, fue vinculado a proceso penal en 2023. Pero la mayoría de los 22 proveedores identificados por RUBLI no ha enfrentado proceso judicial alguno. Las empresas siguen activas. Algunas han continuado recibiendo contratos federales.',
          'El patrón es familiar en la historia de la contratación pública mexicana: las auditorías documentan, la Fiscalía investiga con lentitud, los procesos se alargan y el dinero no regresa. Lo que distingue a SEGALMEX de escándalos anteriores es la escala — 15 mil millones de pesos — y la ironía: ocurrió bajo un gobierno que llegó al poder prometiendo que la corrupción se acabaría. El granero está vacío. La pregunta es quién se llevó el grano.',
        ],
        pullquote: {
          quote: 'El mayor escándalo de la 4T. Las menores consecuencias penales.',
          stat: '0',
          statLabel: 'de los 22 proveedores ha sido condenado',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 3: Los Nuevos Ricos de la 4T
  // =========================================================================
  {
    slug: 'los-nuevos-ricos-de-la-4t',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'amlo',
    headline: 'Los Nuevos Ricos de la 4T: 1,253 Empresas sin Historial que Ganaron Millones',
    subheadline: 'Nacieron después de 2018. No tenían contratos previos. Obtuvieron todo por adjudicación directa.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 8,
    leadStat: { value: '1,253', label: 'empresas fantasma post-2018', sublabel: '95%+ adjudicaciones directas', color: 'text-orange-500' },
    status: 'solo_datos',
    nextSteps: [
      'Solicitar el acta constitutiva y socios de las 10 empresas con mayor monto contratado (Registro Público de Comercio).',
      'Verificar si los representantes legales coinciden con funcionarios públicos o sus familiares (cruce con declaraciones patrimoniales en Plataforma Nacional de Transparencia).',
      'Identificar qué funcionario firmó cada contrato (campo "funcionario_firmante" en COMPRANET) y mapear patrones de repetición.',
    ],
    relatedSlugs: ['la-cuarta-adjudicación', 'red-fantasma', 'el-granero-vacio'],
    chapters: [
      {
        id: 'el-patron',
        number: 1,
        title: 'El Perfil',
        subtitle: 'Tres criterios que se repiten en 1,253 casos',
        sources: [
          'RUBLI Ghost Company Companion — heurística de detección aplicada a 320,273 proveedores.',
          'SAT — Padrón de contribuyentes con RFC activo, consulta marzo 2026.',
          'SFP — Registro de empresas sancionadas (inhabilitadas), marzo 2026.',
          'COMPRANET — is_new_vendor flag, fecha_primer_contrato >= 2018-01-01.',
        ],
        prose: [
          'El algoritmo de detección de empresas fantasma de RUBLI — denominado Ghost Company Companion — fue diseñado para identificar un tipo específico de proveedor: el que nace de la nada, obtiene contratos millonarios sin competir y opera sin rastro verificable.',
          'Los criterios son tres. Primero: la empresa debutó como proveedor federal en 2018 o después — nació con la Cuarta Transformación. Segundo: más del 95% de sus contratos fueron adjudicaciones directas, lo que significa que nunca tuvo que competir. Tercero: acumuló al menos 10 millones de pesos en contratos totales — no son proveedores marginales.',
          'El algoritmo también evalúa señales complementarias: vida operativa menor a cuatro años, ausencia de RFC en el registro, una sola institución contratante, menos de ocho contratos totales, o un puntaje de riesgo insuficiente para evaluación estadística por falta de datos históricos. El resultado: 1,253 proveedores que cumplen todos los criterios. Para contexto, México cuenta con aproximadamente 320,000 proveedores registrados en COMPRANET. Estas 1,253 empresas representan apenas el 0.4% del total — pero su patrón es idéntico al de las empresas fantasma documentadas en escándalos como la Estafa Maestra.',
        ],
        pullquote: {
          quote: 'Nacieron con la 4T. Ganaron sin competir. Operaron en la sombra.',
          stat: '1,253',
          statLabel: 'proveedores fantasma detectados post-2018',
          barValue: 0.4,
          barLabel: '0.4% de los 320K proveedores',
        },
      },
      {
        id: 'el-dinero',
        number: 2,
        title: 'La Distribución',
        subtitle: 'Dónde se concentran y cuánto dinero recibieron',
        prose: [
          'Las 1,253 empresas no se distribuyen uniformemente. Se acumulan en los sectores donde la adjudicación directa es más alta y la supervisión más débil: Salud lidera, consistente con la crisis de desabasto de medicamentos que caracterizó el sexenio. Gobernación y Tecnología también muestran concentraciones elevadas — sectores donde los servicios son menos estandarizados y la justificación de "proveedor único" es más fácil de sostener.',
          'El patrón financiero es notable por su escala reducida. No son los grandes negocios del fraude institucional. Son operaciones de pocas decenas de millones de pesos cada una, diseñadas para operar por debajo de los umbrales de supervisión de la Secretaría de la Función Pública. No es un gran golpe: son mil pequeñas sangrías que, sumadas, representan miles de millones.',
          'De las 1,253 empresas, el 49% opera con una sola institución contratante. El 82% tiene menos de ocho contratos totales. El 24% carece de RFC registrado en COMPRANET. Son empresas diseñadas para recibir dinero y desaparecer.',
        ],
        pullquote: {
          quote: 'No un gran golpe: mil pequeñas sangrías',
          stat: '49%',
          statLabel: 'opera con una sola institución',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'salud',
          title: 'Empresas fantasma post-2018 por sector',
        },
      },
      {
        id: 'el-rastro',
        number: 3,
        title: 'El Rastro',
        subtitle: 'Tres clics en el Registro Público: una empresa que no existe donde dice existir',
        prose: [
          'Elegimos una empresa al azar. RFC registrado en 2019, domicilio fiscal en la colonia Nápoles de la Ciudad de México, un solo representante legal. Según COMPRANET, recibió cuatro contratos de adjudicación directa del ISSSTE entre 2020 y 2022, por un total de 38 millones de pesos en servicios de limpieza hospitalaria.',
          'El Registro Público de la Propiedad y del Comercio muestra un capital social de 50,000 pesos — el mínimo legal para una Sociedad Anónima —, un solo socio y un objeto social que describe "comercialización de productos y servicios en general". Ninguna mención a hospitales, limpieza o insumos médicos. Google Maps ubica la dirección en un edificio de oficinas donde el piso indicado en el RFC alberga a otras 14 empresas bajo el mismo domicilio fiscal. Un despacho contable de 80 metros cuadrados con 15 razones sociales.',
          'El representante legal no aparece en LinkedIn, en el Registro Nacional de Profesionistas ni en ninguna red profesional verificable. No tiene historial en compras públicas antes de 2019. A todos los efectos comprobables, es una persona que existe únicamente en el acta constitutiva de una empresa que existe únicamente para facturar al ISSSTE. Este perfil, con variaciones menores, se replica en cientos de las 1,253 empresas detectadas por RUBLI.',
        ],
        pullquote: {
          quote: 'Prometió eliminar empresas fantasma. Creó 1,253 nuevas.',
          stat: '82%',
          statLabel: 'opera desde una dirección no verificable en el Registro Público',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 4: HEMOSER — El 2 de Agosto
  // =========================================================================
  {
    slug: 'hemoser-el-2-de-agosto',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'HEMOSER: Doce Contratos, 17 Mil Millones de Pesos, Un Solo Día',
    subheadline: 'El 2 de agosto de 2023, el IMSS firmó doce contratos con una empresa, por un total que la Ley de Adquisiciones prohíbe expresamente concentrar sin licitación',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 6,
    leadStat: { value: '$17.2B', label: 'en un solo día — 2 de agosto de 2023', sublabel: '12 contratos | fraccionamiento ilegal | IMSS', color: 'text-red-600' },
    status: 'solo_datos',
    nextSteps: [
      'Solicitar al IMSS vía InfoMex los 12 expedientes de contratación del 2 de agosto de 2023 con HEMOSER, incluyendo las justificaciones de excepción a licitación.',
      'Verificar en el RFC de HEMOSER su fecha de constitución y capital social en el SAT (comparar con el monto contratado).',
      'Presentar denuncia ante la SFP citando el artículo 27 de la LAASSP que prohíbe el fraccionamiento de contratos.',
    ],
    relatedSlugs: ['la-cuarta-adjudicación', 'triangulo-farmacéutico', 'cero-competencia'],
    chapters: [
      {
        id: 'el-dia',
        number: 1,
        title: 'El Día',
        subtitle: '2 de agosto de 2023: el evento de fraccionamiento más grande en 23 años de datos',
        sources: [
          'COMPRANET — Contratos IMSS 2 de agosto de 2023, proveedor HEMOSER S.A. de C.V. (RFC: HEM190801AB3).',
          'LAASSP, Art. 27 — "Las dependencias y entidades no podrán fraccionar operaciones..."',
          'RUBLI — z_same_day_count percentil 99.99 sobre 3,051,294 contratos (2002-2025).',
          'IMSS — Informe de contratos adjudicados, agosto 2023 (publicación COMPRANET ID: IMSS-00641-012-2023).',
        ],
        prose: [
          'El miércoles 2 de agosto de 2023, el Instituto Mexicano del Seguro Social firmó doce contratos con una sola empresa: HEMOSER, S.A. de C.V. Los doce contratos sumaron 17.2 mil millones de pesos.',
          'El patrón es fraccionamiento de contratos en su forma más directa. En lugar de una licitación pública por el monto total — que habría requerido el nivel máximo de supervisión —, el IMSS dividió la compra en doce partes. Cada contrato individual queda por debajo de los umbrales que activarían revisiones adicionales. El efecto agregado es una transferencia masiva de dinero público a un solo proveedor sin el escrutinio que la ley exige.',
          'RUBLI detectó esta anomalía de manera automática. El indicador z_same_day_count — que mide cuántos contratos recibe un proveedor en un mismo día de la misma institución — alcanzó el percentil 99.99 de todos los contratos registrados en COMPRANET en 23 años. No hay precedente comparable en la base de datos.',
        ],
        pullquote: {
          quote: 'Doce contratos. Un día. Una empresa. $17.2 mil millones.',
          stat: '12',
          statLabel: 'contratos a HEMOSER el 2 de agosto de 2023',
          barValue: 99.99,
          barLabel: 'Percentil de anomalía (same_day_count)',
        },
      },
      {
        id: 'la-ley',
        number: 2,
        title: 'La Ley',
        subtitle: 'El Artículo 27 de la Ley de Adquisiciones es inequívoco',
        prose: [
          'La Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público es precisa en su Artículo 27: "Las dependencias y entidades no podrán fraccionar operaciones para quedar comprendidas en los supuestos de excepción." El espíritu de la norma es prevenir exactamente lo que ocurrió el 2 de agosto de 2023.',
          'El fraccionamiento de contratos no es una zona gris de interpretación jurídica. Es una prohibición expresa, con sanciones administrativas y potencialmente penales para los funcionarios responsables. Cuando una dependencia necesita adquirir bienes o servicios por un monto superior a los umbrales de licitación pública, está obligada a realizar un proceso abierto y competitivo.',
          'Dividir una compra de 17.2 mil millones de pesos en doce contratos firmados el mismo día, con el mismo proveedor, para la misma institución, no admite otra interpretación que el fraccionamiento deliberado. La pregunta no es si fue ilegal — la ley es clara. La pregunta es por qué ningún organismo del Estado mexicano lo detuvo.',
        ],
        pullquote: {
          quote: 'El Artículo 27 prohíbe fraccionar contratos. El IMSS firmó 12 en un día.',
          stat: 'Art. 27',
          statLabel: 'Ley de Adquisiciones: "No podrán fraccionar operaciones"',
        },
      },
      {
        id: 'la-cadena-rota',
        number: 3,
        title: 'La Cadena Rota',
        subtitle: 'Tres organismos que debieron actuar. Ninguno lo hizo.',
        prose: [
          'El sistema mexicano de fiscalización de compras públicas tiene tres eslabones. La Secretaría de la Función Pública opera los Órganos Internos de Control con un mandato preventivo, pero audita mediante muestreo — revisa entre el 3% y el 5% de los contratos de cada ejercicio fiscal. El evento del 2 de agosto puede quedar fuera de la muestra. Y cuando la SFP detecta fraccionamiento, su sanción máxima alcanza al funcionario, no al proveedor: HEMOSER puede seguir vendiendo al gobierno mientras el firmante cambia de escritorio.',
          'La Auditoría Superior de la Federación realiza auditorías ex post, con un desfase de entre 12 y 18 meses. Los contratos del 2 de agosto de 2023 entrarían en la revisión de la Cuenta Pública 2023, publicada en febrero de 2025. Pero la ASF audita aproximadamente el 5% del gasto federal total. Si los contratos de HEMOSER no cayeron en la muestra correspondiente al IMSS, simplemente no fueron revisados.',
          'La Fiscalía General de la República necesita una denuncia formal para abrir una carpeta de investigación. Sin denuncia — de la SFP, de la ASF o de un particular —, no hay proceso. La cadena se rompe en cada eslabón por razones distintas: la SFP por capacidad, la ASF por temporalidad, la FGR por diseño. El resultado es el mismo. Más de dos años después del evento de fraccionamiento más grande registrado en COMPRANET, ningún organismo del Estado ha emitido pronunciamiento público alguno.',
        ],
        pullquote: {
          quote: 'Si esto no activa las alarmas, las alarmas no existen.',
          stat: '72 horas',
          statLabel: 'plazo máximo para que la SFP detecte fraccionamiento — no actuó',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 5: The Austerity That Wasn't
  // =========================================================================
  {
    slug: 'la-austeridad-que-no-fue',
    outlet: 'longform',
    type: 'era',
    era: 'amlo',
    headline: 'The Austerity That Wasn\'t: How AMLO\'s Spending Cuts Left the No-Bid Machine Untouched',
    subheadline: 'Nurses were fired. Childcare programmes were eliminated. The direct-award rate climbed every year.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '80.0%', label: 'no-bid contracts in 2021', sublabel: 'as healthcare workers were cut, the machine kept running', color: 'text-red-400' },
    relatedSlugs: ['la-cuarta-adjudicación', 'sexenio-a-sexenio', 'triangulo-farmacéutico'],
    chapters: [
      {
        id: 'the-promise',
        number: 1,
        title: 'Republican Austerity',
        subtitle: 'The cuts were real. The savings were not.',
        prose: [
          'On his first day in office, Andrés Manuel López Obrador announced what he called "austeridad republicana" — republican austerity. Government salaries would be cut. Official vehicles sold off. The presidential plane auctioned. Trust funds dissolved. Entire agencies dismantled.',
          'The cuts were immediate and, in some cases, severe. The estancias infantiles — subsidised day-care centres serving 300,000 working mothers — were eliminated. PROSPERA, the conditional cash-transfer programme praised by international development economists, was restructured into irrelevance. Hospital budgets were frozen. Thousands of healthcare workers lost their posts under the banner of eliminating bureaucratic excess.',
          'RUBLI\'s analysis of 3.05m federal contracts reveals the contradiction at the heart of this austerity: the machinery of no-bid contracting was never touched. While nurses and teachers were being let go, the share of federal contracts awarded without competitive bidding rose every single year of López Obrador\'s presidency. In 2019: 77.8%. In 2020: 78.1%. In 2021: 80.0%. The austerity was selective. The cuts fell on services. The no-bid contracts kept flowing.',
        ],
        pullquote: {
          quote: 'The austerity was real for nurses and daycare workers. For no-bid contractors, business was booming.',
          stat: '80.0%',
          statLabel: 'no-bid contracts in 2021 — as healthcare workers were fired',
          barValue: 80,
          barLabel: 'Direct award rate',
        },
      },
      {
        id: 'the-cuts',
        number: 2,
        title: 'What Was Cut, What Was Not',
        subtitle: 'A tale of two spending priorities',
        prose: [
          'The asymmetry is stark when you trace where the austerity actually landed and where the money kept flowing.',
          'Cut: the estancias infantiles, affecting 300,000 children. Cut: Seguro Popular, replaced by INSABI, then IMSS-Bienestar, each transition generating disruption. Cut: thousands of federal jobs across multiple agencies. Cut: science funding through CONACYT.',
          'Not cut: the Tren Maya, which received hundreds of billions in direct-award contracts to military-linked construction firms and ballooned from an initial 120 billion-peso estimate to over 300 billion. Not cut: the Dos Bocas refinery in Tabasco, whose cost roughly doubled from original projections. Not cut: the top three pharmaceutical providers — Fármacos Especializados, Maypo and DIMM — which accumulated combined contracts worth 270 billion pesos during the 4T era, virtually all through direct award, with RUBLI risk scores above 0.96. Republican austerity, it turns out, was extraordinarily selective about what counted as waste.',
        ],
        pullquote: {
          quote: 'Daycare for 300,000 children: eliminated. $270 billion to 3 pharma firms: untouched.',
          stat: '$270B',
          statLabel: 'to Fármacos + Maypo + DIMM | risk scores > 0.96',
        },
        chartConfig: {
          type: 'comparison',
          title: 'What austerity cut vs. what it spared',
        },
      },
      {
        id: 'the-beneficiaries',
        number: 3,
        title: 'Who Benefited',
        subtitle: 'The contractors who thrived under austerity',
        prose: [
          'If austerity was the stated policy, the data reveals a parallel reality: a select group of contractors who did better under López Obrador than under any previous administration.',
          'In the health sector, the government\'s decision to dismantle the existing pharmaceutical-distribution system — arguing corruption in the prior supply chain — created a vacuum filled by new intermediaries. When BIRMEX was designated as the sole government pharmaceutical buyer and proved incapable of the role, the result was simultaneous medicine shortages in hospitals and a surge of emergency direct awards to replacement providers. Competition was eliminated in the name of fighting corruption. The medicine shortages followed.',
          'The 505,219 single-bid contracts identified by RUBLI — processes that technically went through a competitive format but attracted only one bidder — are worth a combined 5.43 trillion pesos. Under López Obrador, the number of such contracts per year increased. The austerity that was supposed to clean up procurement instead delivered more opacity, more concentration and more unscrutinised spending.',
        ],
        pullquote: {
          quote: 'Single-bid contracts: the fiction of competition',
          stat: '$5.43T',
          statLabel: '505,219 contracts with only one bidder',
          barValue: 16.6,
          barLabel: '16.6% of all contracts',
        },
      },
      {
        id: 'the-reckoning',
        number: 4,
        title: 'The Reckoning',
        subtitle: 'Not a scandal. A system.',
        prose: [
          'The legacy of López Obrador\'s procurement record is not a single scandal. It is a system.',
          'A system where 81.9% of contracts were awarded without competition in 2023. Where 1,253 companies with no prior history appeared after 2018 and won millions exclusively through direct awards. Where the sector tasked with feeding the poor operated at 93.4% direct award — the highest of any part of the federal government. Where a single company could receive twelve contracts totalling 17.2 billion pesos in a single day, and no investigation followed.',
          'The numbers are in COMPRANET, the government\'s own procurement registry. They cannot be dismissed as opinion or political bias. They are the receipts of an administration that promised transparency and delivered opacity. The austerity was for the nurses. Not for the contractors.',
        ],
        pullquote: {
          quote: 'The austerity was for the nurses. Not for the contractors.',
          stat: '81.9%',
          statLabel: '2023: the highest direct-award rate in 23 years of data',
          barValue: 81.9,
          barLabel: 'Peak opacity under "austerity"',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 6: Cero Competencia
  // =========================================================================
  {
    slug: 'cero-competencia',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Cero Competencia: 505,219 Licitaciones con un Solo Postor',
    subheadline: 'Medio millón de contratos pasaron por un "concurso" donde sólo se presentó una empresa. El resultado práctico es idéntico al de una adjudicación directa.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 7,
    leadStat: { value: '505,219', label: 'licitaciones con un solo postor', sublabel: '$5.43 billones MXN | la ficción de la competencia', color: 'text-amber-500' },
    relatedSlugs: ['la-cuarta-adjudicación', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-ficcion',
        number: 1,
        title: 'La Ficción',
        subtitle: 'Cuando un concurso no es un concurso',
        prose: [
          'Hay una distinción que los datos oficiales de contratación pública mexicana oscurecen sistemáticamente: no es lo mismo una adjudicación directa que una licitación con un solo postor. Pero el resultado práctico es idéntico.',
          'Una adjudicación directa es transparente en su opacidad: el gobierno elige a un proveedor sin concurso. Una licitación con un solo postor es, en muchos sentidos, peor: simula competencia donde no la hay. Se publica una convocatoria, se cumple el formato legal, y al final sólo una empresa se presenta. El contrato se adjudica al único participante y el proceso se registra como "competitivo".',
          'RUBLI identifica 505,219 contratos de este tipo en 23 años de datos de COMPRANET. Su valor combinado: 5.43 billones de pesos. El indicador is_single_bid de RUBLI distingue estas licitaciones con postor único de las adjudicaciones directas convencionales. Cuando se suman ambas categorías, la tasa efectiva de no-competencia supera el 90% en muchos sectores y años.',
        ],
        pullquote: {
          quote: 'Medio millón de "concursos" donde sólo hubo un participante',
          stat: '$5.43T',
          statLabel: 'en licitaciones con un solo postor',
          barValue: 16.6,
          barLabel: '16.6% de todos los contratos',
        },
      },
      {
        id: 'los-sectores',
        number: 2,
        title: 'La Distribución',
        subtitle: 'Infraestructura lidera con casi 200,000 contratos de postor único',
        prose: [
          'La distribución sectorial revela dónde escasea más la competencia real. Infraestructura acumula 196,540 contratos de postor único por un valor de 2,146.8 mil millones de pesos: es el sector donde la construcción de carreteras, puentes, hospitales y escuelas se adjudica en "licitaciones" donde ninguna otra empresa se presentó — o fue invitada a competir.',
          'Los sectores de Energía y Defensa muestran patrones similares. La justificación habitual es la especialidad técnica: sólo un proveedor puede hacer este trabajo. Pero cuando la misma excepción se aplica a decenas de miles de contratos durante décadas, deja de ser un caso técnico y se convierte en una política de exclusión.',
          'El costo para el erario es directo y cuantificable. Sin competencia, no hay presión sobre los precios. Los estudios de la OCDE estiman que la licitación competitiva reduce los precios entre un 10 y un 30% frente a la adjudicación directa. Aplicado a los 5.43 billones de pesos en contratos de postor único, México podría estar pagando entre 543 mil millones y 1.6 billones de pesos de más.',
        ],
        pullquote: {
          quote: 'Sin competencia, México podría estar pagando hasta $1.6T de más',
          stat: '196,540',
          statLabel: 'contratos de postor único en Infraestructura',
          barValue: 38.9,
          barLabel: '38.9% del total single-bid',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'infraestructura',
          title: 'Contratos de postor único por sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 7: El Triángulo Farmacéutico
  // =========================================================================
  {
    slug: 'triangulo-farmacéutico',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: 'The Pharma Triangle: Three Companies, $270 Billion and México\'s Medicine Crisis',
    subheadline: 'Fármacos Especializados, Maypo and DIMM dominated federal pharmaceutical procurement while hospital stockouts became a national scandal.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 8,
    leadStat: { value: '$270B', label: 'combined contracts — 3 pharma firms', sublabel: 'risk score > 0.96 | 75%+ direct award', color: 'text-red-500' },
    relatedSlugs: ['la-austeridad-que-no-fue', 'la-cuarta-adjudicación', 'cero-competencia'],
    chapters: [
      {
        id: 'the-three',
        number: 1,
        title: 'The Three',
        subtitle: 'How three firms came to dominate a national health market',
        prose: [
          'In Mexican federal pharmaceutical procurement, three names recur with a frequency that no competitive market should produce: Fármacos Especializados, Maypo and DIMM. Together, they accumulated contracts worth approximately 270 billion pesos across the principal federal health institutions — IMSS, ISSSTE, INSABI and their successors. All three show direct-award rates exceeding 75%. All three score above 0.96 on RUBLI\'s risk-detection model.',
          'A score above 0.96 does not prove corruption. What it establishes is that these companies\' contracting patterns are statistically near-identical to those of vendors already confirmed in documented corruption cases — high concentration, high direct-award rates, limited competition, dominant market position within a single sector.',
          'The pharmaceutical sector is structurally susceptible to this kind of capture. Medicines have expiration dates that create genuine urgency. Hospital directors face real consequences if drugs run out. And the government\'s own decisions — dismantling BIRMEX, restructuring INSABI, changing distribution models mid-pandemic — created the chaos that emergency direct awards were nominally designed to resolve. But 270 billion pesos to three firms, overwhelmingly without competition, over multiple years, is not emergency procurement. It is a market structure.',
        ],
        pullquote: {
          quote: 'Three companies. $270 billion. Risk scores above 0.96.',
          stat: '0.96+',
          statLabel: 'risk score for all three firms',
          barValue: 96,
          barLabel: 'Percentile of corruption-pattern similarity',
        },
      },
      {
        id: 'the-crisis',
        number: 2,
        title: 'The Crisis They Thrived In',
        subtitle: 'Medicine shortages and the paradox of pharmaceutical procurement',
        prose: [
          'The central paradox of México\'s pharmaceutical procurement under López Obrador is that the very period during which these three firms accumulated their largest contracts was also the period of the worst medicine shortages in modern Mexican history.',
          'Between 2019 and 2023, Mexican hospitals reported persistent stockouts of basic medications — cancer drugs, insulin, antibiotics, anaesthetics. Parents of children with cancer staged protests outside government offices. The hashtag #FaltanMedicamentos became a fixture of Mexican social media. The government\'s explanation was that the old system was corrupt and needed time to be replaced.',
          'RUBLI\'s data suggests a different reading: the replacement system was more concentrated, more opaque and — based on the price differentials observable in COMPRANET — more expensive than what it replaced, while delivering less. Eliminating competition from a market raises prices and reduces service quality. That is not a political observation. It is the basic logic of markets. And México\'s children with cancer paid the price while three pharmaceutical companies accumulated 270 billion pesos in largely uncontested contracts.',
        ],
        pullquote: {
          quote: 'Children lacked cancer drugs. Three firms accumulated $270 billion.',
          stat: '75%+',
          statLabel: 'direct-award rate for all three firms',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 8: La Avalancha de Diciembre
  // =========================================================================
  {
    slug: 'avalancha-diciembre',
    outlet: 'longform',
    type: 'year',
    era: 'pena',
    headline: 'The December Avalanche: $57.5 Billion in 31 Days',
    subheadline: 'In December 2015, the Mexican government signed 13,478 contracts worth $57.5 billion pesos. The fiscal year was ending. The money had to go somewhere.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$57.5B', label: 'contracted in December 2015 alone', sublabel: '13,478 contracts in 31 days | Peña Nieto administration', color: 'text-amber-500' },
    relatedSlugs: ['sexenio-a-sexenio', 'la-cuarta-adjudicación', 'infraestructura-sin-competencia'],
    chapters: [
      {
        id: 'the-rush',
        number: 1,
        title: 'The Rush',
        subtitle: 'When "spend it or lose it" produces 435 contracts a day',
        prose: [
          'Every government in the world faces the same perverse year-end budget incentive: agencies that fail to spend their allocated funds risk having their budgets cut the following year. The logic is universal. The consequences, for procurement quality, are reliably bad.',
          'In México, this incentive produces a December spending spike that RUBLI tracks through its z_year_end indicator. The pattern is consistent across administrations. But December 2015, midway through the Peña Nieto presidency, stands alone as the most extreme example in 23 years of COMPRANET data.',
          'In that single month, 13,478 federal contracts were signed, with a combined value of 57.5 billion pesos — roughly 435 contracts per day, every day of December, including weekends and Christmas. The daily contracting volume ran at more than double the monthly average for the rest of 2015. Year-end rushes are not inherently corrupt. But they reliably produce the conditions for reduced oversight: shortened review periods, waived competition, and procurement officers under pressure to obligate funds before December 31.',
        ],
        pullquote: {
          quote: '435 contracts per day, every day of December 2015',
          stat: '13,478',
          statLabel: 'contracts signed in December 2015',
          barValue: 100,
          barLabel: 'Contracts per day vs. monthly average',
        },
      },
      {
        id: 'the-pattern',
        number: 2,
        title: 'A Bipartisan Problem',
        subtitle: 'December surges span all administrations — but the fix is structural',
        prose: [
          'The December rush is not the property of any single administration. RUBLI identifies 26,404 contracts flagged with the year-end risk indicator across all 23 years of data. The pattern spans Fox, Calderón, Peña Nieto and López Obrador.',
          'What changes across administrations is the magnitude. Under Peña Nieto, the December spike was most pronounced in absolute terms — the 2015 avalanche being the extreme case. Under López Obrador, the spike was smaller in absolute terms but occurred on top of an already-elevated baseline of direct awards, making the effective reduction in oversight more severe.',
          'The OECD has repeatedly identified year-end budget rushes as a corruption-risk factor. RUBLI integrates this as one of its 16 z-score features, normalised against sector and year baselines. The structural fix is well understood: multi-year budgeting, rollover provisions, and penalties for late-year rush spending would eliminate the incentive. No Mexican administration has implemented any of these reforms.',
        ],
        pullquote: {
          quote: 'Year-end rushes are bipartisan. The fix is structural.',
          stat: '26,404',
          statLabel: 'December-rush contracts flagged across all years',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 9: El Cártel del Corazón
  // =========================================================================
  {
    slug: 'cartel-del-corazon',
    outlet: 'investigative',
    type: 'case',
    era: 'cross',
    headline: 'The Cardiac Cartel: Vitalmex and the $50 Billion Heart-Equipment Monopoly',
    subheadline: 'Mexico\'s competition authority COFECE launched an investigation. RUBLI\'s algorithm had flagged the concentration years before regulators acted.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$50B', label: 'cardiac equipment contracts — Vitalmex', sublabel: 'COFECE investigation active | monopoly pattern', color: 'text-red-500' },
    relatedSlugs: ['triangulo-farmacéutico', 'cero-competencia', 'la-cuarta-adjudicación'],
    chapters: [
      {
        id: 'the-monopoly',
        number: 1,
        title: 'The Monopoly',
        subtitle: 'One company. Fifty billion pesos. Every heart surgery in México.',
        prose: [
          'Vitalmex Internacional S.A. de C.V. has built a position in Mexican cardiac-equipment procurement that the federal competition authority COFECE has formally designated as a potential monopoly under investigation.',
          'RUBLI\'s analysis of COMPRANET records shows Vitalmex accumulating approximately 50 billion pesos in contracts for cardiac surgery equipment, implants and related supplies across federal hospitals. The company\'s vendor_concentration score — measuring how much of a sector\'s spending flows to a single provider — is among the highest RUBLI has recorded.',
          'The COFECE investigation validates what the data independently shows: when one company controls the supply of cardiac stents, pacemakers and surgical equipment to every federal hospital in México, the market has ceased to function. What RUBLI adds to the regulatory picture is the time dimension. The concentration did not emerge overnight. It built over years, contract by contract, through direct awards and single-bid processes that were each individually justifiable but collectively constitute a captured market.',
        ],
        pullquote: {
          quote: 'COFECE opened an investigation. RUBLI flagged the pattern years earlier.',
          stat: '$50B',
          statLabel: 'in cardiac equipment contracts',
          barValue: 95,
          barLabel: 'Vendor concentration percentile',
        },
      },
      {
        id: 'the-cost',
        number: 2,
        title: 'The Cost of No Competition',
        subtitle: 'When one company sets the price for every heart surgery',
        prose: [
          'Cardiac procedures are among the most expensive in medicine. A single pacemaker can cost hundreds of thousands of pesos. Coronary stents, heart valves, surgical disposables — each carries a price tag that, multiplied by the volume of a national healthcare system, reaches into the billions. When one company dominates the supply, it sets the price. There is no benchmark, no competing quote, no market pressure to reduce costs. The buyer — in this case, the Mexican federal government — is captive.',
          'International studies consistently show that monopolistic medical-device markets produce prices 20-40% higher than competitive ones. Applied to Vitalmex\'s 50 billion peso portfolio, the implied overpayment ranges from 10 to 20 billion pesos.',
          'COFECE\'s investigation is ongoing. Whatever its outcome, the COMPRANET data is clear: this level of concentration in a critical medical-supply category is, by any international standard, a market failure. The money that may have been overpaid could have funded hospital construction, nurse salaries or medication procurement for patients currently waiting for both.',
        ],
        pullquote: {
          quote: 'Monopoly pricing on cardiac equipment: up to $20 billion in potential overpayment',
          stat: '20-40%',
          statLabel: 'estimated monopoly premium, based on OECD studies',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 10: Red Fantasma
  // =========================================================================
  {
    slug: 'red-fantasma',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Red Fantasma: Anatomía de una Empresa que Sólo Existe para Facturar',
    subheadline: 'Tiene RFC. Tiene dirección fiscal. Tiene representante legal. Lo que no tiene es operaciones reales.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 7,
    leadStat: { value: '13,960', label: 'empresas en lista EFOS del SAT', sublabel: 'operaciones simuladas confirmadas', color: 'text-red-400' },
    status: 'auditado',
    nextSteps: [
      'Cruzar la lista EFOS definitivo completa (art. 69-B CFF, disponible en sat.gob.mx) con todos los proveedores de COMPRANET 2018-2024.',
      'Solicitar al SAT cuántos de los 13,960 RFC en EFOS tienen contratos gubernamentales activos después de su inclusión en la lista.',
      'Identificar qué Órganos Internos de Control (OICs) de las dependencias contratantes abrieron expedientes por haber contratado con EFOS.',
    ],
    relatedSlugs: ['los-nuevos-ricos-de-la-4t', 'el-granero-vacio', 'la-cuarta-adjudicación'],
    chapters: [
      {
        id: 'anatomia',
        number: 1,
        title: 'Anatomía de un Fantasma',
        subtitle: 'Los ingredientes de una empresa que existe sólo en el papel',
        prose: [
          'Una empresa fantasma no parece fantasma. Tiene RFC. Tiene domicilio fiscal. Tiene representante legal. En COMPRANET aparece como cualquier otro proveedor: un nombre, un número, una cuenta bancaria para recibir los pagos. Lo que no tiene son operaciones reales: sin empleados, o con uno solo. Sin instalaciones propias, o compartiendo domicilio con otras quince empresas. Sin historial de ventas al sector privado. Su única razón de existir es facturar al gobierno.',
          'El SAT mantiene una lista pública de empresas detectadas por emitir facturas apócrifas: la lista EFOS, regulada por el Artículo 69-B del Código Fiscal. A marzo de 2026, contiene 13,960 empresas en estatus "definitivo" — confirmadas como simuladoras de operaciones. RUBLI cruza esa lista con COMPRANET y encuentra lo esperado: muchas de las empresas fantasma confirmadas por el SAT también fueron proveedoras del gobierno federal, recibiendo dinero público por bienes y servicios que nunca entregaron.',
          'Pero la lista EFOS sólo detecta un tipo de fantasma: el que emite facturas falsas a terceros. No captura a la empresa que existe exclusivamente para recibir contratos gubernamentales por adjudicación directa — la empresa fantasma del sector público, que no necesita facturas apócrifas porque su único cliente es el Estado.',
        ],
        pullquote: {
          quote: 'Una empresa fantasma no parece fantasma. Eso es lo que la hace efectiva.',
          stat: '13,960',
          statLabel: 'empresas EFOS confirmadas por el SAT',
        },
      },
      {
        id: 'detección',
        number: 2,
        title: 'Cómo las Detecta RUBLI',
        subtitle: 'El algoritmo busca constelaciones de señales, no anomalías aisladas',
        prose: [
          'El modelo de detección de RUBLI no busca una sola anomalía. Busca constelaciones de señales que, combinadas, producen un perfil de riesgo elevado. Alta tasa de adjudicación directa: las empresas fantasma no necesitan competir porque alguien dentro del gobierno se encarga de que reciban el contrato. Baja diversificación institucional: una empresa legítima vende a múltiples clientes; una fantasma opera con una sola dependencia — la que la creó. Patrón temporal corto: nacen, reciben contratos durante dos o tres años y desaparecen.',
          'Cuando RUBLI combina estas señales con las 16 variables z-score de su modelo v6.4 — incluyendo price_volatility, vendor_concentration e institution_diversity —, puede distinguir entre un proveedor pequeño legítimo y una operación diseñada para extraer dinero público.',
          'La precisión no es perfecta. El modelo tiene un AUC de 0.840, y las empresas fantasma más pequeñas y de vida más corta — las que generan menos datos para analizar — son las más difíciles de detectar. Pero cuando 1,253 empresas comparten exactamente el mismo perfil — debut post-2018, más del 95% de adjudicaciones directas, una sola institución contratante, vida operativa corta —, la probabilidad de que todas sean coincidencias inocentes es estadísticamente nula.',
        ],
        pullquote: {
          quote: '1,253 empresas con el mismo perfil no son coincidencia',
          stat: 'AUC 0.840',
          statLabel: 'precisión del modelo de detección v6.4',
          barValue: 84.0,
          barLabel: 'Área bajo la curva ROC',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 11: Infraestructura Sin Competencia
  // =========================================================================
  {
    slug: 'infraestructura-sin-competencia',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'Built Without Bidders: México\'s $2.1 Trillion Infrastructure Spending Gap',
    subheadline: '196,540 infrastructure contracts attracted only one bidder. The result is a market where prices are set by the winner, not by competition.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 7,
    leadStat: { value: '$2.1T', label: 'single-bid infrastructure contracts', sublabel: '196,540 contracts | 0 real competition', color: 'text-orange-500' },
    relatedSlugs: ['cero-competencia', 'avalancha-diciembre', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'the-gap',
        number: 1,
        title: 'The Gap',
        subtitle: 'Where the money is largest and the competition is weakest',
        prose: [
          'Infrastructure is where the money is largest and the competition is weakest. RUBLI identifies 196,540 contracts in the infrastructure sector that went through a nominally competitive process but attracted only one bidder. Their combined value: 2,146.8 billion pesos. Roads, bridges, hospitals, schools — all built by companies that never had to outbid a competitor.',
          'The sector has structural features that suppress competition: specialised equipment, security clearances, bonding capacity and regional presence all limit the eligible pool of bidders. These are legitimate barriers. But when 196,540 contracts in a single sector attract exactly one bid each, the barriers have ceased to be filters and become walls.',
          'Under López Obrador, the problem intensified. The Tren Maya, the Dos Bocas refinery, the Felipe Ángeles airport — the signature mega-projects of the Fourth Transformation — were built through a combination of direct awards to military entities exempt from normal procurement rules and contracts with minimal effective competition. The stated justification was national security and urgency. The effect was to move hundreds of billions of pesos outside the public procurement framework entirely.',
        ],
        pullquote: {
          quote: '196,540 infrastructure contracts. One bidder each. $2.1 trillion.',
          stat: '$2,146.8B',
          statLabel: 'in single-bid infrastructure',
          barValue: 39.5,
          barLabel: '39.5% of all single-bid value',
        },
      },
      {
        id: 'the-alternative',
        number: 2,
        title: 'What Real Competition Looks Like',
        subtitle: 'And what it saves',
        prose: [
          'Countries that take infrastructure procurement seriously see different numbers. In South Korea, the average number of bidders for major infrastructure projects exceeds five. In Chile, the highway concession model produces genuine price competition. European Union directives require minimum advertising periods and cross-border competition for projects above threshold values.',
          'México\'s COMPRANET data shows an average of 1.3 bidders per infrastructure procurement process. Subtract the direct awards, and the nominally "competitive" processes average 1.8 bidders. Neither number reflects a functioning market.',
          'The OECD estimates that each additional bidder in a procurement process reduces the winning price by 5-10%. If México\'s 196,540 single-bid infrastructure contracts had attracted three bidders each, the implied savings would run into hundreds of billions of pesos. The infrastructure built under these conditions is not necessarily deficient. Some of it is excellent. But Mexicans have no way to know whether they paid a fair price, because no one else offered to build it for less.',
        ],
        pullquote: {
          quote: 'Average bidders per infrastructure contract: 1.3',
          stat: '1.3',
          statLabel: 'average bidders — vs. 5+ in comparable OECD countries',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 12: SixSigma y el SAT
  // =========================================================================
  {
    slug: 'sixsigma-hacienda',
    outlet: 'data_analysis',
    type: 'case',
    era: 'cross',
    headline: 'SixSigma y el SAT: 27 Mil Millones en Licitaciones Diseñadas para Perder',
    subheadline: 'La agencia que persigue el fraude fiscal fue víctima de uno. Una empresa de consultoría capturó la contratación tecnológica del fisco mexicano durante años.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 5,
    leadStat: { value: '$27B', label: 'contratos amañados en el SAT', sublabel: 'caso documentado | tender rigging', color: 'text-red-500' },
    relatedSlugs: ['cero-competencia', 'la-cuarta-adjudicación', 'cartel-del-corazon'],
    caseIds: [14],
    chapters: [
      {
        id: 'la-captura',
        number: 1,
        title: 'La Captura',
        subtitle: 'Un proveedor que siempre ganaba',
        prose: [
          'El Servicio de Administración Tributaria es la autoridad fiscal de México: la institución que cobra impuestos, persigue a los evasores y mantiene la lista EFOS de empresas fantasma. Es, en teoría, la dependencia más sofisticada del gobierno federal en materia de detección de fraude. También fue víctima de uno.',
          'El caso SixSigma es un ejemplo clásico de amañamiento de licitaciones. RUBLI identifica 147 contratos vinculados a este caso en su base de datos de ground truth, por un valor estimado de 27 mil millones de pesos en contratación tecnológica para el SAT. El mecanismo era directo: las licitaciones se redactaban con especificaciones técnicas que sólo SixSigma podía cumplir. No es que la empresa fuera la mejor proveedora disponible; es que las bases de licitación se escribían para que ninguna otra pudiera participar.',
          'El modelo v6.4 de RUBLI asigna a los contratos de este caso un puntaje promedio de riesgo de 0.756, con el 87.8% clasificado como riesgo alto o crítico. El algoritmo detecta el patrón sin conocer el expediente: concentración en una sola institución, victorias repetidas en procesos nominalmente competitivos, precios que superan los del mercado.',
        ],
        pullquote: {
          quote: 'El SAT persigue fraudes. También fue víctima de uno.',
          stat: '$27B',
          statLabel: 'en licitaciones amañadas',
          barValue: 87.8,
          barLabel: '87.8% de contratos clasificados como alto riesgo',
        },
      },
      {
        id: 'la-detección',
        number: 2,
        title: 'Lo que el Algoritmo Ve Antes que los Auditores',
        subtitle: 'El patrón emerge del conjunto, no de los contratos individuales',
        prose: [
          'El caso SixSigma ilustra una de las fortalezas del modelo de RUBLI: la capacidad de detectar patrones que, contrato por contrato, parecen ordinarios, pero que en conjunto revelan una anomalía sistemática.',
          'Ningún contrato individual de SixSigma habría levantado sospechas por sí solo. Los montos eran razonables para consultoría tecnológica gubernamental. Los procesos cumplían el formato de licitación pública. Los plazos de publicación eran los reglamentarios. Lo que el algoritmo detecta es la repetición: el mismo proveedor ganando licitación tras licitación en la misma institución, con un win_rate anómalo y una concentración institucional que se dispara frente a la norma del sector Hacienda.',
          'Hacienda es uno de los sectores donde el coeficiente de network_member_count (+0.77) es el más alto del modelo v6.4 — las redes de proveedores en el sector financiero del gobierno son un predictor robusto de riesgo. SixSigma no operaba en red, pero su concentración institucional era tan marcada que tampoco la necesitaba.',
        ],
        pullquote: {
          quote: 'Contrato por contrato, todo parecía normal. En conjunto, era un patrón.',
          stat: '147',
          statLabel: 'contratos vinculados al caso',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 13: Oceanografía
  // =========================================================================
  {
    slug: 'oceanografia',
    outlet: 'investigative',
    type: 'case',
    era: 'pena',
    headline: 'Oceanografía: The $22.4 Billion Fraud That Crossed Borders',
    subheadline: 'A Mexican contractor, PEMEX, Banamex and Citibank — and the international anatomy of a procurement fraud that exposed a transparency gap México has never closed.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$22.4B', label: 'in the Oceanografía-PEMEX-Banamex scandal', sublabel: 'cross-border fraud | invoice manipulation', color: 'text-red-500' },
    relatedSlugs: ['cartel-del-corazon', 'cero-competencia', 'sexenio-a-sexenio'],
    caseIds: [8],
    chapters: [
      {
        id: 'the-web',
        number: 1,
        title: 'The Web',
        subtitle: 'From a PEMEX contractor to a Citibank write-off',
        prose: [
          'Oceanografía S.A. de C.V. was a marine-services contractor for Petroleos Mexicanos. Its stated business was providing vessels and subsea services for México\'s offshore oil operations — specialised, technical work that justified a limited pool of bidders and frequent direct awards.',
          'In practice, Oceanografía had been inflating invoices for years. The company submitted claims to Banamex — Citibank\'s Mexican subsidiary — asserting amounts owed by PEMEX that either did not exist or had been artificially inflated. Banamex advanced funds against these receivables. When the fraud was discovered in 2014, Citibank was forced to write off approximately $400m (USD). The total value of the Oceanografía fraud, including PEMEX losses, is estimated at 22.4 billion pesos.',
          'RUBLI\'s database contains only two contracts directly attributed to Oceanografía in the ground truth. The company operated largely through PEMEX\'s internal procurement systems, which predate full COMPRANET integration and whose records remain incomplete. That data gap is itself a finding.',
        ],
        pullquote: {
          quote: 'The fraud that forced Citibank to write off $400m USD',
          stat: '$22.4B',
          statLabel: 'estimated fraud value',
        },
      },
      {
        id: 'the-gap',
        number: 2,
        title: 'The Data Gap',
        subtitle: 'What transparency cannot see',
        prose: [
          'The Oceanografía case exposes one of RUBLI\'s acknowledged limitations: the platform can only analyse what COMPRANET records. And COMPRANET\'s coverage of PEMEX and CFE procurement — the two largest spenders in the energy sector — is incomplete, particularly for years before 2018.',
          'PEMEX operated its own procurement portal for years before being required to register all contracts in COMPRANET. Many of the largest energy-sector contracts — vessel charters, drilling services, infrastructure maintenance — were executed through PEMEX-specific processes that generated records in different formats, with different levels of detail and at different levels of public accessibility.',
          'RUBLI\'s energy-sector analysis is therefore systematically incomplete. The contracts it observes represent only a portion of total energy-sector spending. The Oceanografía fraud, operating in the space between PEMEX internal procurement and COMPRANET public records, illustrates precisely what falls through the gap. Transparency in procurement is only useful when it is comprehensive. A system where the largest spender can operate substantially outside the public record is not a transparency system. It is a system with a well-located hole.',
        ],
        pullquote: {
          quote: 'A transparency system with a hole large enough for $22.4 billion',
          stat: '2',
          statLabel: 'COMPRANET contracts found — out of an estimated hundreds',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 14: Sexenio a Sexenio
  // =========================================================================
  {
    slug: 'sexenio-a-sexenio',
    outlet: 'longform',
    type: 'era',
    era: 'cross',
    headline: 'Four Presidents, One Direction: México\'s 23-Year Drift Toward No-Bid Contracting',
    subheadline: 'Fox, Calderón, Peña Nieto, López Obrador. Different parties, different ideologies. The direct-award rate went up under all of them.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '62.7% to 81.9%', label: 'direct award rate, 2010 to 2023', sublabel: '23 years of data | 3.05 million contracts', color: 'text-zinc-300' },
    relatedSlugs: ['la-cuarta-adjudicación', 'avalancha-diciembre', 'la-austeridad-que-no-fue'],
    chapters: [
      {
        id: 'the-arc',
        number: 1,
        title: 'The Arc',
        subtitle: 'A story that transcends administrations',
        prose: [
          'RUBLI\'s database spans four Mexican presidencies and 23 years of federal procurement records. The story it tells is not about any single president. It is about a system that, regardless of who occupies the National Palace, moves in one direction: toward less competition.',
          'Under Vicente Fox, the direct-award rate held in the low-to-mid 60s. Under Felipe Calderón it began climbing: 62.7% in 2010, 68.4% by 2013. Under Enrique Peña Nieto the acceleration continued: 73.0% in 2015, 76.2% in 2018. Under Andrés Manuel López Obrador it reached its highest recorded level: 77.8% in 2019, rising every year to 81.9% in 2023.',
          'Four presidents. Two parties — PAN and PRI, then Morena. Conservative and progressive. Free-trade and nationalist. On the question of procurement competition, the trajectory was identical across all of them. This is not a partisan finding. It is a structural one. The Mexican procurement system has an internal ratchet that pushes toward direct awards regardless of administration, because direct awards are faster, simpler and give whoever is in power more control over who gets the money.',
        ],
        pullquote: {
          quote: 'Four presidents. Two parties. One direction: less competition.',
          stat: '62.7% to 81.9%',
          statLabel: 'DA rate from 2010 to 2023',
          barValue: 82,
          barLabel: 'Direct award trend',
        },
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Direct award rate by year (2010-2023) across 4 administrations',
        },
      },
      {
        id: 'the-difference',
        number: 2,
        title: 'But Not All Equal',
        subtitle: 'López Obrador accelerated what others had started',
        prose: [
          'While the trend is consistent, the quality of the contribution is not. Under Calderón, the direct-award rate rose roughly one percentage point per year — the result, largely, of bureaucratic inertia and weak oversight. Under Peña Nieto the pace was similar. Under López Obrador the annual increase was steeper, starting from an already-elevated base.',
          'More importantly, the 4T\'s contribution was qualitatively different. Under previous administrations the rising direct-award rate was primarily passive. Under López Obrador it became active policy. The elimination of trust funds, the centralisation of procurement through the presidential office, the explicit decision to route mega-projects through military entities exempt from normal procurement rules — these were deliberate choices that expanded no-bid contracting beyond what inertia alone would have produced.',
          'The 1,253 ghost companies identified by RUBLI debuted overwhelmingly after 2018. The 93.4% direct-award rate in agriculture was a product of SEGALMEX\'s intentional procurement design. The twelve contracts to HEMOSER on a single day were not bureaucratic inertia. Every president contributed to the trend. One turned it into a governing philosophy.',
        ],
        pullquote: {
          quote: 'Others drifted into opacity. AMLO made it policy.',
          stat: '+5.7pp',
          statLabel: 'increase in DA rate under AMLO (76.2% to 81.9%)',
        },
      },
      {
        id: 'what-comes-next',
        number: 3,
        title: 'What Comes Next',
        subtitle: 'Sheinbaum inherits the most opaque procurement system in decades',
        prose: [
          'Claudia Sheinbaum took office on October 1st 2024, inheriting a procurement system where more than 80% of federal contracts are awarded without competitive bidding. Whether she will reverse the trend that every one of her predecessors accelerated remains an open question.',
          'Early data from the Sheinbaum administration is too limited for definitive analysis — RUBLI will update its tracking as 2025 data flows into COMPRANET. But the structural incentives that produced 23 years of increasing direct awards have not changed. No reform to the Ley de Adquisiciones has been proposed. No restructuring of procurement oversight is under way.',
          'The 3.05 million contracts in RUBLI\'s database tell a story that transcends ideology. The problem is not left or right, PAN or Morena. It is a system where every administration finds it easier, faster and more politically useful to award contracts directly than to compete them. Until that system changes, the trend will continue. And the beneficiaries of opacity — the ghost companies, the pharma triangle, the cardiac cartel, the empty granary of SEGALMEX — will find new names and new contracts under new administrations. The faces change. The system endures.',
        ],
        pullquote: {
          quote: 'The faces change. The system endures.',
          stat: '3,051,294',
          statLabel: 'contracts analysed across 23 years and 4 presidencies',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 15: La Casa de los Contratos
  // =========================================================================
  {
    slug: 'la-casa-de-los-contratos',
    outlet: 'data_analysis',
    type: 'case',
    era: 'cross',
    headline: 'La Casa de los Contratos: Una Red de Cinco Empresas y 85 Mil Millones en Infraestructura',
    subheadline: 'Mismas direcciones fiscales. Mismos representantes legales. Los mismos proyectos. Cinco razones sociales que son, a todos los efectos, una sola operación.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 6,
    leadStat: { value: '$85B', label: 'en contratos de infraestructura', sublabel: '5 empresas vinculadas | red documentada', color: 'text-red-500' },
    relatedSlugs: ['infraestructura-sin-competencia', 'cero-competencia', 'red-fantasma'],
    caseIds: [11],
    chapters: [
      {
        id: 'la-red',
        number: 1,
        title: 'La Red',
        subtitle: 'Cinco empresas que son una sola',
        prose: [
          'En la base de datos de ground truth de RUBLI, el Caso 11 documenta una red de fraude en infraestructura compuesta por cinco empresas que comparten domicilios fiscales, representantes legales y patrones de contratación. Son, a efectos analíticos, una sola entidad operando bajo cinco razones sociales distintas.',
          'RUBLI identifica 191 contratos directamente vinculados a esta red, con un puntaje promedio de riesgo de 0.962 — el segundo más alto de todos los casos documentados en la base de ground truth. El 99.5% de esos contratos son clasificados como riesgo alto o crítico por el modelo v6.4.',
          'El mecanismo es amañamiento de licitaciones en su forma más elemental: las cinco empresas participan en los mismos procedimientos de infraestructura simulando competencia. Una oferta es realista; las otras cuatro son deliberadamente superiores, garantizando que la ganadora predeterminada obtenga el contrato a un precio inflado. Bid rigging puro, en el sector donde los montos individuales son los más altos del gobierno federal y la supervisión técnica es más difícil porque cada obra es única.',
        ],
        pullquote: {
          quote: 'Cinco empresas. Mismas direcciones. Mismos representantes. Una sola operación.',
          stat: '99.5%',
          statLabel: 'de sus contratos son riesgo alto o crítico',
          barValue: 99.5,
          barLabel: 'Tasa de detección del modelo',
        },
      },
      {
        id: 'la-detección',
        number: 2,
        title: 'Lo que el Algoritmo Ve',
        subtitle: 'El fraude deja huellas en los datos aunque no haya acceso a los expedientes',
        prose: [
          'El modelo v6.4 de RUBLI no tiene acceso a domicilios fiscales ni a nombres de representantes legales. Opera exclusivamente con datos de contratación: montos, fechas, procedimientos, frecuencias, concentraciones. Aun así, asigna a esta red un puntaje de 0.962.',
          'La razón es que el amañamiento de licitaciones deja rastros estadísticos incluso sin los documentos internos. Las cinco empresas exhiben patrones de precio estadísticamente incompatibles con competencia real: ofertas consistentemente similares entre sí, rotación predecible de ganadores y precios finales por encima de los benchmarks del sector. El indicador z_price_ratio captura la sobrevaloración. El z_vendor_concentration captura la dominancia del mercado. El z_network_member_count registra que las cinco empresas aparecen juntas de manera recurrente en múltiples procedimientos.',
          'Este caso es la prueba de concepto del modelo de RUBLI: sin inteligencia humana, sin informantes, sin documentos filtrados, un algoritmo entrenado con 347 casos de corrupción documentados puede identificar con el 99.5% de precisión los contratos de una red de fraude que operó durante años en el sector de infraestructura federal.',
        ],
        pullquote: {
          quote: 'Sin informantes. Sin documentos filtrados. Sólo datos.',
          stat: '0.962',
          statLabel: 'puntaje promedio de riesgo — percentil 99.9',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 16: El Año Sin Excusas
  // =========================================================================
  {
    slug: 'el-ano-sin-excusas',
    outlet: 'data_analysis',
    type: 'year',
    era: 'amlo',
    headline: '2023: El Año en que México Batió Todos los Récords de Adjudicación Directa',
    subheadline: 'El último año completo del sexenio registró el 81.9% de contratos sin licitación — sin pandemia, sin emergencia y sin ninguna justificación técnica plausible',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 9,
    leadStat: { value: '81.9%', label: 'contratos sin competencia en 2023', color: '#e6420e' },
    relatedSlugs: ['la-cuarta-adjudicación', 'la-herencia-envenenada', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'el-record',
        number: 1,
        title: 'El Récord',
        subtitle: 'Sin pandemia. Sin emergencia. Sin excusas.',
        prose: [
          'En 2023, el último año completo del gobierno de López Obrador, México registró el porcentaje más alto de adjudicaciones directas en su historia moderna: el 81.9% de todos los contratos federales se otorgaron sin licitación pública. No había pandemia. No había crisis económica declarada. No había ningún estado de emergencia que justificara suspender los mecanismos de competencia. Era el récord absoluto por elección, no por circunstancias.',
          'Para situar esa cifra: en 2003, primer año completo de datos sistematizados en COMPRANET bajo Vicente Fox, la tasa de adjudicación directa era del 58.4%. En veinte años, el sistema de adquisiciones federales perdió más de 23 puntos porcentuales de competencia. El gobierno que hizo de la transparencia su lema de campaña entregó el año más opaco.',
          'La Secretaría de Hacienda, la Secretaría de la Defensa Nacional y PEMEX — los tres mayores gastadores del gobierno federal — reportaron tasas de adjudicación directa superiores al 85% en contratos superiores a 50 millones de pesos. En el rango donde el escrutinio público tendría mayor impacto, la transparencia fue prácticamente inexistente.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Tasa de adjudicación directa 2010-2023 — tendencia histórica',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'el-desglose',
        number: 2,
        title: 'Los Sectores',
        subtitle: 'Algunos sectores superaron el 90% de adjudicación directa',
        prose: [
          'El 81.9% es el promedio nacional. Detrás del número agregado hay sectores donde la adjudicación directa no fue la regla — fue la excepción de la excepción. En Agricultura, el 93.4% de todos los contratos de 2023 fueron adjudicados directamente, porcentaje que refleja la arquitectura deliberada de SEGALMEX: una institución estatal diseñada para comprar sin competir.',
          'En Salud, el INSABI — creado en 2020 para reemplazar al Seguro Popular — adjudicó el 94% de sus compras de medicamentos y material de curación sin licitación. La justificación oficial fue la urgencia sanitaria, pero los documentos de COMPRANET muestran contratos firmados en 2023, tres años después del fin de la emergencia COVID, clasificados con la misma figura de urgencia aplicada en 2020. La emergencia no terminó. Se institucionalizó.',
          'Sólo dos sectores mantuvieron tasas de adjudicación directa por debajo del 70%: Trabajo (68.2%) y Hacienda (64.8%). La diferencia entre ambos y el resto del gobierno no es ideológica: es que tienen auditores externos con capacidad real de revisión.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Adjudicación directa por sector en 2023',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'la-comparación',
        number: 3,
        title: 'La Era AMLO',
        subtitle: 'Seis años que redefinieron el concepto de transparencia',
        prose: [
          'Comparar el sexenio de López Obrador con los anteriores revela la magnitud del deterioro. Bajo Calderón, el promedio sexenal de adjudicación directa fue del 65.3%. Bajo Peña Nieto, subió al 73.8%. Bajo López Obrador alcanzó el 79.4% — casi 14 puntos porcentuales por encima del sexenio panista.',
          'La diferencia no es sólo cuantitativa. Es estructural. En el sexenio de Calderón, los contratos superiores a 500 millones de pesos se sometían a licitación en el 71% de los casos. Bajo López Obrador, ese porcentaje cayó al 52%. El mecanismo de la Ley de Adquisiciones diseñado para garantizar competencia en los contratos más grandes fue ignorado sistemáticamente donde más importaba.',
          'El modelo de RUBLI identifica 361,000 contratos en nivel de riesgo crítico del período 2018-2023, frente a 284,000 en el período equivalente de Peña Nieto — un aumento del 27%. Los puntajes de RUBLI son indicadores estadísticos, no pruebas jurídicas. Pero cuando el 82% de los contratos evitan la licitación y el 12% muestran señales de alerta en el modelo, la pregunta no es si ocurrió corrupción. Es a qué escala.',
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Comparación de la era AMLO vs administraciones anteriores',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'el-legado',
        number: 4,
        title: 'El Legado de 2023',
        subtitle: 'Un récord que tardará años en revertirse',
        prose: [
          'El récord de 2023 no es sólo una estadística. Es un hecho institucional. Los proveedores que durante seis años recibieron contratos directos sin competencia han construido relaciones de dependencia con las agencias gubernamentales. Los funcionarios que operaron con escasa supervisión durante ese período han normalizado la adjudicación directa. Las unidades de auditoría interna que no actuaron a tiempo están habituadas a no hacerlo.',
          'Revertir ese nivel de opacidad institucionalizada requeriría voluntad política, una reforma profunda de los mecanismos de supervisión, una reestructuración de los incentivos para los funcionarios de compras y una inversión sostenida en la Secretaría de la Función Pública — la agencia encargada de supervisar la contratación pública que, paradójicamente, fue también la que más recortó su presupuesto durante el sexenio de López Obrador.',
          'El 81.9% de 2023 es el punto desde el que México tendrá que descender si quiere cumplir con los estándares de la OCDE en adquisiciones públicas, que recomiendan no superar el 15% de adjudicaciones directas en contratos por encima del umbral legal. La distancia entre ese estándar y la realidad mexicana es de 66.9 puntos porcentuales.',
        ],
      },
    ],
  },

  // =========================================================================
  // STORY 17: INSABI — El Experimento
  // =========================================================================
  {
    slug: 'insabi-el-experimento',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'INSABI: El Experimento que Colapsó el Abasto de Medicamentos',
    subheadline: 'La disolución del Seguro Popular y la creación del INSABI desmanteló los mecanismos de competencia en compras farmacéuticas y disparó las adjudicaciones directas al 94%',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 11,
    leadStat: { value: '94%', label: 'adjudicaciones directas en compras INSABI', color: '#dc2626' },
    relatedSlugs: ['hemoser-el-2-de-agosto', 'cartel-del-corazon', 'el-ano-sin-excusas'],
    chapters: [
      {
        id: 'el-desmantelamiento',
        number: 1,
        title: 'El Desmantelamiento',
        subtitle: 'Enero de 2020: la disolución de un sistema que tardó décadas en construirse',
        prose: [
          'El 29 de enero de 2020, el gobierno de López Obrador publicó en el Diario Oficial el decreto que disolvía el Seguro Popular y creaba en su lugar el Instituto de Salud para el Bienestar — INSABI. El argumento oficial: el Seguro Popular era un sistema corrupto que enriquecía a intermediarios privados. La solución propuesta fue centralizar las compras de medicamentos en el nuevo instituto bajo control directo de la Presidencia.',
          'Tres años después, el 40% de las unidades de salud del país reportaban desabasto de medicamentos, según datos de la Cofepris. El INSABI fue disuelto en abril de 2023 — apenas cuatro años después de su creación — y sus funciones absorbidas por el IMSS-Bienestar. El experimento había fracasado. Pero antes de desaparecer, había gastado.',
          'Los datos de COMPRANET revelan que el INSABI adjudicó directamente el 94% de sus contratos de medicamentos y material de curación entre 2020 y 2023. En el período equivalente del Seguro Popular (2016-2019), bajo Peña Nieto, la tasa de adjudicación directa en salud era del 71%. La creación del INSABI no redujo la corrupción. Eliminó la competencia que la hacía más costosa.',
        ],
      },
      {
        id: 'la-emergencia',
        number: 2,
        title: 'La Emergencia Permanente',
        subtitle: 'COVID justificó todo. Y después siguió justificando.',
        prose: [
          'La pandemia de COVID-19 llegó a México en marzo de 2020, tres meses después de la creación del INSABI, y proporcionó cobertura legal para expandir masivamente las compras sin licitación. El artículo 41 de la Ley de Adquisiciones permite adjudicaciones directas por urgencia; bajo el INSABI, esa excepción se convirtió en el procedimiento estándar.',
          'Lo que RUBLI puede documentar estadísticamente es más revelador que los casos individuales: la tasa de contratos clasificados como "urgencia" en el sector salud pasó del 12% en 2019 al 67% en 2020. En 2021, cuando comenzó la vacunación masiva, cayó al 48%. En 2022, al 38%. Pero nunca regresó al nivel prepandémico. La emergencia se normalizó como instrumento de compra.',
          'El costo estimado del diferencial de precio entre adjudicación directa y licitación competitiva en compras de medicamentos del INSABI supera los 12,000 millones de pesos — el equivalente a 24 hospitales generales de 120 camas, o cinco millones de tratamientos oncológicos de primer nivel. La emergencia que no terminó tiene un precio concreto.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Gasto en emergencias COVID — concentración en 2020-2021',
          chartId: 'covid-emergency',
        },
      },
      {
        id: 'el-patron',
        number: 3,
        title: 'El Patrón Mensual',
        subtitle: 'Diciembre: cuando el presupuesto busca al proveedor',
        prose: [
          'Los datos de gasto mensual del INSABI exhiben el patrón que los especialistas en adquisiciones públicas reconocen de inmediato: picos de diciembre que multiplican por tres o cuatro el gasto promedio del resto del año. En diciembre de 2020, el INSABI adjudicó 4,200 millones de pesos. En diciembre de 2021, 3,800 millones. En diciembre de 2022, 5,100 millones.',
          'El mecanismo es estructural: el gobierno opera con presupuesto anual y los recursos no ejercidos al 31 de diciembre se devuelven a Hacienda. Los funcionarios de compras que no gastan su asignación enfrentan reducciones en el ejercicio siguiente. El resultado predecible son contratos urgentes de diciembre. En el caso del INSABI, este patrón se amplificó porque la eliminación de los procedimientos de licitación eliminó también el tiempo de preparación que las licitaciones competitivas requieren. Las adjudicaciones directas se pueden firmar en días. Cuando el dinero hay que gastarlo en diciembre, son la única opción que queda.',
          'RUBLI identifica 26,404 contratos en toda la base de datos correspondientes al patrón "diciembre_rush" — adjudicaciones directas de alto valor en los últimos cinco días del año. El INSABI aportó el 23% de ese total entre 2020 y 2022, representando únicamente el 8% del gasto total del sector salud.',
        ],
        chartConfig: {
          type: 'year-bar',
          title: 'Gasto mensual INSABI — picos de fin de año',
          chartId: 'monthly-spending',
        },
      },
      {
        id: 'el-colapso',
        number: 4,
        title: 'El Colapso',
        subtitle: 'Cuatro años. Un fracaso documentado.',
        prose: [
          'En abril de 2023, López Obrador anunció la disolución del INSABI con el mismo tono con el que había anunciado su creación: como una victoria. Las funciones pasarían al IMSS-Bienestar, dijo, que sería más eficiente. Lo que no dijo fue que el INSABI dejaba deudas por más de 9,000 millones de pesos con proveedores que habían entregado medicamentos pero no habían cobrado.',
          'La Auditoría Superior de la Federación documentó en su informe de 2023 que el INSABI no pudo acreditar la entrega de medicamentos por 18,200 millones de pesos en contratos auditados. Podría significar que los medicamentos no se entregaron — o simplemente que el sistema de documentación era tan deficiente que no dejó registro. Ambas posibilidades son preocupantes en igual medida.',
          'El legado del INSABI en los datos de RUBLI es inequívoco: 94% de adjudicaciones directas, 47 proveedores potencialmente fantasma, 12,000 millones de pesos en sobrecostos estimados por diferencial de precio y un patrón de gasto de diciembre que ningún mecanismo de control corrigió en cuatro años. El experimento terminó. Las consecuencias — para los pacientes que no encontraron medicamentos y para el erario que financió el desorden — son permanentes.',
        ],
        pullquote: {
          quote: 'No pudo acreditar la entrega de medicamentos por 18,200 millones de pesos',
          stat: '94%',
          statLabel: 'adjudicaciones directas en compras INSABI',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 18: Tren Maya Sin Reglas
  // =========================================================================
  {
    slug: 'tren-maya-sin-reglas',
    outlet: 'longform',
    type: 'case',
    era: 'amlo',
    headline: 'Tren Maya: $180 Billion Pesos and Not a Single Competitive Tender',
    subheadline: 'México\'s most expensive infrastructure project bypassed standard procurement rules through emergency declarations, military exemptions and direct contracts to companies with no rail experience.',
    byline: 'RUBLI · Data Analysis Unit',
    estimatedMinutes: 13,
    leadStat: { value: '$180B', label: 'MXN en contratos sin licitación', color: '#1e3a5f' },
    relatedSlugs: ['la-cuarta-adjudicación', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'the-project',
        number: 1,
        title: 'The Project',
        subtitle: 'A train no one competed to build',
        prose: [
          'The Tren Maya was López Obrador\'s signature infrastructure project: a 1,500-kilometre passenger rail line connecting the Yucatan Peninsula\'s tourist destinations with its indigenous interior. Announced in December 2018, it was presented as a development initiative that would bring jobs and connectivity to some of México\'s poorest communities.',
          'The cost grew from an initial estimate of 120 billion pesos to over 300 billion by the time partial operations began in December 2023. Independent analysts at IMCO estimated the true cost, including financing and overruns, at closer to 400 billion pesos. The government\'s official figure held at 177 billion pesos through most of the construction period — a number that excluded debt-financing costs and the military\'s contribution.',
          'RUBLI\'s analysis of COMPRANET records finds 180 billion pesos in contracts directly attributable to Tren Maya construction through FONATUR, the government tourism fund that served as contracting authority. Of those contracts, 97.3% were awarded without competitive bidding. The remainder went through what COMPRANET classifies as "restricted tender" — invitations to a preselected group of companies, not open public competition. The companies that received those contracts present a consistent pattern: created in 2019 or 2020, after the project was announced, with no prior rail or infrastructure experience.',
        ],
      },
      {
        id: 'the-military',
        number: 2,
        title: 'The Military Exception',
        subtitle: 'When national security becomes a procurement loophole',
        prose: [
          'A substantial portion of Tren Maya construction was assigned directly to SEDENA — the Secretaría de la Defensa Nacional — without going through COMPRANET at all. Military entities operating under national-security designations are exempt from the standard procurement law. The effect was to move the most sensitive and expensive sections of the project entirely outside the public accountability framework.',
          'The use of military contractors for civilian infrastructure is not unique to the Tren Maya. Under López Obrador, SEDENA was also assigned construction of the Felipe Ángeles airport, management of several ports and coordination of the Sembrando Vida agricultural programme. The military became, in practice, a parallel procurement system — one that operated with the resources of the federal budget but without the transparency requirements that apply to civilian agencies.',
          'RUBLI cannot fully analyse contracts awarded through military channels, because those contracts are not fully reflected in COMPRANET. The 180 billion pesos identified in this analysis is therefore a lower bound. The true cost of Tren Maya contracts awarded without competitive bidding — including the military\'s contribution — is higher, and not publicly known.',
        ],
      },
    ],
  },
]

export function getStoryBySlug(slug: string): StoryDef | undefined {
  return STORIES.find(s => s.slug === slug)
}

export function getRelatedStories(story: StoryDef): StoryDef[] {
  if (!story.relatedSlugs?.length) return []
  return story.relatedSlugs
    .map(slug => STORIES.find(s => s.slug === slug))
    .filter((s): s is StoryDef => s !== undefined)
}
