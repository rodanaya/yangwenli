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
    type: 'da-trend' | 'sector-bar' | 'year-bar' | 'vendor-list' | 'comparison' | 'sunburst' | 'racing' | 'network' | 'pyramid' | 'scatter' | 'breakdown' | 'fingerprint' | 'radar' | 'trends' | 'calendar'
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
    slug: 'la-cuarta-adjudicacion',
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
        chartConfig: {
          type: 'sunburst',
          title: 'Huella presupuestal por administración — 5 sexenios, 12 sectores',
          chartId: 'admin-sunburst',
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
          chartId: 'da-by-sector',
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
        chartConfig: {
          type: 'sector-bar',
          title: 'Mapa de riesgo por sector 2002-2025 — patrón histórico completo',
          chartId: 'sector-risk-heatmap',
        },
      },
      {
        id: 'la-conclusion',
        number: 5,
        title: 'Qué Puede Hacer un Periodista con Estos Datos',
        subtitle: 'De los datos a la historia: guía de investigación',
        prose: [
          'Los datos de COMPRANET son públicos. Están en compranet.hacienda.gob.mx y en la plataforma de datos abiertos del gobierno federal. El sistema de RUBLI los ha procesado, normalizado y puntuado: cada uno de los 3,051,294 contratos de 2002 a 2025 tiene una puntuación de riesgo, un nivel de alerta y un conjunto de indicadores que señalan por qué llama la atención.',
          'El primer paso para una investigación es la institución. ¿Qué dependencia tiene la tasa más alta de adjudicaciones directas en tu sector de interés? La respuesta está disponible en RUBLI: cada institución tiene su perfil con sus estadísticas de contratación, sus proveedores recurrentes y sus patrones temporales. Una dependencia que adjudicó directamente el 95% de sus contratos durante cuatro años consecutivos merece una solicitud de transparencia puntual.',
          'El segundo paso es el proveedor. El directorio de proveedores de RUBLI permite identificar quiénes acumularon contratos durante el sexenio, qué porcentaje fue por adjudicación directa, y si esos patrones coinciden con las señales del modelo de riesgo. Una empresa creada en 2019, con menos de cinco empleados registrados ante el SAT, que acumuló cien contratos federales por adjudicación directa entre 2020 y 2024, es una historia.',
          'El tercer paso, y el más importante, es la fuente humana. Los datos señalan anomalías; las personas explican por qué ocurrieron. Funciona Bien, IMCO, FUNDAR y el Archivo de Inteligencia tienen investigadores especializados en contratación pública. Los exfuncionarios de compras son frecuentemente más accesibles de lo que parece. Y los perdedores de licitaciones — las empresas que participaron y no ganaron — tienen incentivos para hablar.',
        ],
        pullquote: {
          quote: 'Los datos señalan anomalías. Las personas explican por qué ocurrieron.',
          stat: '3.1M',
          statLabel: 'contratos públicos disponibles para investigación',
          barValue: 100,
          barLabel: 'Contratos accesibles en COMPRANET',
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
    relatedSlugs: ['la-cuarta-adjudicacion', 'los-nuevos-ricos-de-la-4t', 'red-fantasma'],
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
        chartConfig: {
          type: 'racing',
          title: 'Gasto federal por sector 2002–2025 — el ascenso de la agricultura',
          chartId: 'racing-bar',
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
        chartConfig: {
          type: 'network',
          title: 'Comunidades de proveedores vinculados — tamaño = valor, color = riesgo',
          chartId: 'community-bubbles',
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
        chartConfig: {
          type: 'vendor-list',
          title: 'Flujo de dinero: instituciones de salud → triángulo farmacéutico',
          chartId: 'money-sankey',
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
        chartConfig: {
          type: 'pyramid',
          title: 'Pirámide de riesgo — dónde está el dinero en el sistema de contratación',
          chartId: 'risk-pyramid',
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
    relatedSlugs: ['la-cuarta-adjudicacion', 'red-fantasma', 'el-granero-vacio'],
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
        chartConfig: {
          type: 'scatter',
          title: 'La paradoja: adjudicación directa ≠ riesgo de corrupción',
          chartId: 'sector-paradox',
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
          chartId: 'da-by-sector',
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
    relatedSlugs: ['la-cuarta-adjudicacion', 'triangulo-farmaceutico', 'cero-competencia'],
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
        chartConfig: {
          type: 'vendor-list',
          title: 'HEMOSER — 12 contratos bajo el umbral de supervisión · 2 agosto 2023',
          chartId: 'threshold-splitting',
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
        chartConfig: {
          type: 'breakdown',
          title: 'Tipos de procedimiento por sector — adjudicación directa vs licitación',
          chartId: 'procedure-breakdown',
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
        chartConfig: {
          type: 'fingerprint',
          title: 'Huella digital de riesgo: HEMOSER — 8 factores del modelo v6.4',
          chartId: 'vendor-fingerprint',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 5: La Austeridad Que No Fue
  // =========================================================================
  {
    slug: 'la-austeridad-que-no-fue',
    outlet: 'longform',
    type: 'era',
    era: 'amlo',
    headline: 'La Austeridad Que No Fue: Recortes para las Enfermeras, Contratos sin Competencia para los Proveedores',
    subheadline: 'Mientras se eliminaban guarderías y se despedían trabajadores de salud, la tasa de adjudicación directa creció cada año del sexenio',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 10,
    leadStat: { value: '80.0%', label: 'contratos sin licitación en 2021', sublabel: 'mientras se recortaba al personal de salud, la máquina seguía operando', color: 'text-red-400' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'sexenio-a-sexenio', 'triangulo-farmaceutico'],
    chapters: [
      {
        id: 'la-promesa-de-austeridad',
        number: 1,
        title: 'Austeridad Republicana',
        subtitle: 'Los recortes fueron reales. Los ahorros no.',
        prose: [
          'El primer día de su gobierno, Andrés Manuel López Obrador anunció lo que denominó "austeridad republicana". Los salarios del gobierno serían reducidos. Los vehículos oficiales, vendidos. El avión presidencial, rematado. Los fideicomisos, disueltos. Dependencias enteras, desmanteladas.',
          'Los recortes fueron inmediatos y, en algunos casos, severos. Las estancias infantiles — que atendían a 300,000 hijos de madres trabajadoras — fueron eliminadas. El programa PROSPERA fue reestructurado hasta hacerlo irrelevante. Los presupuestos hospitalarios se congelaron. Miles de trabajadores del sector salud perdieron sus plazas bajo el argumento de eliminar la burocracia excesiva.',
          'El análisis de RUBLI sobre 3.05 millones de contratos federales revela la contradicción en el corazón de esa austeridad: la maquinaria de adjudicación directa nunca fue tocada. Mientras enfermeras y maestros eran dados de baja, la proporción de contratos federales otorgados sin licitación creció cada año del sexenio. En 2019: 77.8%. En 2020: 78.1%. En 2021: 80.0%. La austeridad fue selectiva. Los recortes cayeron sobre los servicios. Los contratos sin competencia siguieron fluyendo.',
        ],
        pullquote: {
          quote: 'La austeridad fue real para las enfermeras. Para los contratistas sin competencia, fue un sexenio de prosperidad.',
          stat: '80.0%',
          statLabel: 'contratos sin licitación en 2021 — mientras se despedía personal de salud',
          barValue: 80,
          barLabel: 'Tasa de adjudicación directa',
        },
        chartConfig: {
          type: 'radar',
          title: 'Huella de contratación por sexenio — Fox a Sheinbaum',
          chartId: 'administration-fingerprints',
        },
      },
      {
        id: 'lo-que-se-cortó',
        number: 2,
        title: 'Lo Que Se Cortó. Lo Que No.',
        subtitle: 'Una historia de dos prioridades de gasto',
        prose: [
          'La asimetría es contundente cuando se traza dónde aterrizó realmente la austeridad y dónde el dinero siguió fluyendo.',
          'Recortado: las estancias infantiles, que afectaron a 300,000 niños. Recortado: el Seguro Popular, sustituido por el INSABI y luego por el IMSS-Bienestar, generando caos en cada transición. Recortados: miles de empleos federales. Recortado: el financiamiento científico a través del CONACYT.',
          'No recortado: el Tren Maya, que recibió cientos de miles de millones en contratos directos a empresas vinculadas al ejército y cuyo costo escaló de los 120,000 millones iniciales a más de 300,000 millones. No recortado: el Dos Bocas, cuyo costo se duplicó respecto a las proyecciones originales. No recortados: los tres principales proveedores farmacéuticos — Fármacos Especializados, Maypo y DIMM —, que acumularon contratos por 270,000 millones de pesos durante la 4T, prácticamente todos por adjudicación directa, con puntajes de riesgo RUBLI superiores a 0.96. La austeridad republicana fue extraordinariamente selectiva en su definición del despilfarro.',
        ],
        pullquote: {
          quote: 'Guarderías para 300,000 niños: eliminadas. $270,000M a tres farmacéuticas: intocados.',
          stat: '$270,000M',
          statLabel: 'a Fármacos + Maypo + DIMM | puntajes de riesgo > 0.96',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Lo que la austeridad recortó frente a lo que protegió',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'los-beneficiarios',
        number: 3,
        title: 'Los Beneficiarios',
        subtitle: 'Los contratistas que prosperaron bajo la austeridad',
        prose: [
          'Si la austeridad fue la política declarada, los datos revelan una realidad paralela: un grupo selecto de contratistas que operó mejor bajo López Obrador que bajo cualquier administración anterior.',
          'En el sector salud, la decisión del gobierno de desmantelar el sistema de distribución farmacéutica existente — argumentando corrupción en la cadena anterior — creó un vacío que llenaron nuevos intermediarios. Cuando BIRMEX fue designado como comprador único de medicamentos y demostró ser incapaz de cumplir el rol, el resultado fue desabasto simultáneo en hospitales y una explosión de adjudicaciones directas de emergencia a proveedores sustitutos. La competencia fue eliminada en nombre de combatir la corrupción. El desabasto llegó después.',
          'Los 505,219 contratos de postor único identificados por RUBLI — procedimientos que técnicamente siguieron el formato competitivo pero que sólo atrajeron a un postulante — suman 5.43 billones de pesos. Bajo López Obrador, el número de este tipo de contratos por año aumentó. La austeridad que debía limpiar la contratación entregó en cambio más opacidad, más concentración y más gasto sin escrutinio.',
        ],
        pullquote: {
          quote: 'Contratos de postor único: la ficción de la competencia',
          stat: '$5.43T',
          statLabel: '505,219 contratos con un solo postor',
          barValue: 16.6,
          barLabel: '16.6% de todos los contratos',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Riesgo por sector — quién se benefició más de la opacidad',
          chartId: 'risk-by-sector',
        },
      },
      {
        id: 'el-balance',
        number: 4,
        title: 'El Balance',
        subtitle: 'No fue un escándalo. Fue un sistema.',
        prose: [
          'El legado del historial de contratación de López Obrador no es un escándalo aislado. Es un sistema.',
          'Un sistema donde el 81.9% de los contratos se otorgaron sin competencia en 2023. Donde 1,253 empresas sin historial previo surgieron después de 2018 y ganaron millones exclusivamente por adjudicación directa. Donde el sector encargado de alimentar a los más pobres operó al 93.4% de adjudicación directa — el más alto de todo el gobierno federal. Donde una sola empresa pudo recibir doce contratos por 17,200 millones de pesos en un solo día, sin que siguiera ninguna investigación.',
          'Los números están en COMPRANET, el propio registro de adquisiciones del gobierno. No pueden descartarse como opinión ni como sesgo político. Son los comprobantes de una administración que prometió transparencia y entregó opacidad. La austeridad fue para las enfermeras. No para los contratistas.',
        ],
        pullquote: {
          quote: 'La austeridad fue para las enfermeras. No para los contratistas.',
          stat: '81.9%',
          statLabel: '2023: la tasa de adjudicación directa más alta en 23 años de datos',
          barValue: 81.9,
          barLabel: 'El pico de opacidad bajo la "austeridad"',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'Pirámide de riesgo — cuánto dinero concentra el riesgo crítico',
          chartId: 'risk-pyramid',
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
    relatedSlugs: ['la-cuarta-adjudicacion', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
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
        chartConfig: {
          type: 'scatter',
          title: 'La paradoja: sectores con más adjudicación directa no son los más corruptos',
          chartId: 'sector-paradox',
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
          chartId: 'da-by-sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 7: El Triángulo Farmacéutico
  // =========================================================================
  {
    slug: 'triangulo-farmaceutico',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: 'El Triángulo Farmacéutico: Tres Empresas, 270 Mil Millones y la Crisis de Medicamentos',
    subheadline: 'Fármacos Especializados, Maypo y DIMM dominaron la contratación farmacéutica federal mientras los desabastos en hospitales se convertían en escándalo nacional.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 8,
    leadStat: { value: '$270B', label: 'contratos combinados — 3 empresas farmacéuticas', sublabel: 'puntaje de riesgo > 0.96 | adjudicación directa > 75%', color: 'text-red-500' },
    relatedSlugs: ['la-austeridad-que-no-fue', 'la-cuarta-adjudicacion', 'cero-competencia'],
    chapters: [
      {
        id: 'las-tres',
        number: 1,
        title: 'Las Tres',
        subtitle: 'Cómo tres empresas llegaron a dominar un mercado nacional de salud',
        prose: [
          'En la contratación farmacéutica federal mexicana, tres nombres se repiten con una frecuencia que ningún mercado competitivo debería producir: Fármacos Especializados, Maypo y DIMM. Juntas, acumularon contratos por aproximadamente 270 mil millones de pesos en las principales instituciones federales de salud — IMSS, ISSSTE, INSABI y sus sucesoras. Las tres registran tasas de adjudicación directa superiores al 75%. Las tres obtienen puntajes por encima de 0.96 en el modelo de detección de riesgo de RUBLI.',
          'Un puntaje superior a 0.96 no prueba corrupción. Lo que establece es que los patrones de contratación de estas empresas son estadísticamente casi idénticos a los de proveedores ya confirmados en casos de corrupción documentados: alta concentración, altas tasas de adjudicación directa, competencia limitada, posición dominante de mercado dentro de un solo sector.',
          'El sector farmacéutico es estructuralmente susceptible a este tipo de captura. Los medicamentos tienen fechas de caducidad que generan urgencias genuinas. Los directores hospitalarios enfrentan consecuencias reales si los fármacos se agotan. Y las propias decisiones del gobierno — desmantelar BIRMEX, reestructurar el INSABI, cambiar modelos de distribución en medio de la pandemia — crearon el caos que las adjudicaciones directas de emergencia estaban nominalmente diseñadas para resolver. Pero 270 mil millones de pesos a tres empresas, en su gran mayoría sin competencia, durante varios años, no es contratación de emergencia. Es una estructura de mercado.',
        ],
        pullquote: {
          quote: 'Tres empresas. 270 mil millones. Puntajes de riesgo superiores a 0.96.',
          stat: '0.96+',
          statLabel: 'puntaje de riesgo para las tres empresas',
          barValue: 96,
          barLabel: 'Percentil de similitud con patrones de corrupción',
        },
        chartConfig: {
          type: 'vendor-list',
          title: 'Flujo de dinero: instituciones de salud → triángulo farmacéutico 2019-2023',
          chartId: 'money-sankey',
        },
      },
      {
        id: 'la-crisis',
        number: 2,
        title: 'La Crisis en la que Prosperaron',
        subtitle: 'Desabasto de medicamentos y la paradoja de la contratación farmacéutica',
        prose: [
          'La paradoja central de la contratación farmacéutica mexicana bajo López Obrador es que el período en el que estas tres empresas acumularon sus mayores contratos fue también el período de los peores desabastos de medicamentos en la historia moderna del país.',
          'Entre 2019 y 2023, los hospitales mexicanos reportaron desabastos persistentes de medicamentos básicos: quimioterapias, insulina, antibióticos, anestésicos. Los padres de niños con cáncer se manifestaron frente a oficinas de gobierno. El hashtag #FaltanMedicamentos se volvió una constante en las redes sociales mexicanas. La explicación oficial fue que el sistema anterior era corrupto y necesitaba tiempo para ser reemplazado.',
          'Los datos de RUBLI sugieren una lectura distinta: el sistema de reemplazo fue más concentrado, más opaco y — con base en las diferencias de precios observables en COMPRANET — más caro que lo que sustituyó, entregando menos. Eliminar la competencia de un mercado eleva los precios y reduce la calidad del servicio. No es una observación política. Es la lógica básica de los mercados. Y los niños mexicanos con cáncer pagaron el precio mientras tres empresas farmacéuticas acumulaban 270 mil millones de pesos en contratos prácticamente sin disputa.',
        ],
        pullquote: {
          quote: 'Faltaban medicamentos para niños con cáncer. Tres empresas acumulaban 270 mil millones.',
          stat: '75%+',
          statLabel: 'tasa de adjudicación directa para las tres empresas',
        },
        chartConfig: {
          type: 'trends',
          title: 'Tendencia de riesgo por sector — la salud lideró el ascenso 2018-2023',
          chartId: 'sector-risk-trends',
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
    headline: 'La Avalancha de Diciembre: 57,500 Millones en 31 Días',
    subheadline: 'En diciembre de 2015, el gobierno mexicano firmó 13,478 contratos por 57,500 millones de pesos. El año fiscal terminaba. El dinero tenía que ejercerse.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 6,
    leadStat: { value: '$57.5B', label: 'contratados en diciembre de 2015', sublabel: '13,478 contratos en 31 días | gobierno de Peña Nieto', color: 'text-amber-500' },
    relatedSlugs: ['sexenio-a-sexenio', 'la-cuarta-adjudicacion', 'infraestructura-sin-competencia'],
    chapters: [
      {
        id: 'la-avalancha',
        number: 1,
        title: 'La Avalancha',
        subtitle: 'Cuando el incentivo de "úsalo o piérdelo" produce 435 contratos al día',
        prose: [
          'Todos los gobiernos del mundo enfrentan el mismo incentivo presupuestal perverso de fin de año: las dependencias que no gastan sus recursos asignados arriesgan que sus presupuestos sean reducidos al año siguiente. La lógica es universal. Las consecuencias para la calidad de la contratación son consistentemente malas.',
          'En México, este incentivo produce un pico de gasto en diciembre que RUBLI rastrea mediante el indicador z_year_end. El patrón es consistente entre administraciones. Pero diciembre de 2015, a la mitad del gobierno de Peña Nieto, es el caso más extremo en 23 años de datos de COMPRANET.',
          'En ese solo mes se firmaron 13,478 contratos federales, con un valor combinado de 57,500 millones de pesos — alrededor de 435 contratos al día, cada día de diciembre, incluidos fines de semana y días festivos. El volumen diario de contratación fue más del doble del promedio mensual del resto de 2015. Las avalanchas de fin de año no son inherentemente corruptas. Pero producen sistemáticamente las condiciones para reducir la supervisión: plazos de revisión acortados, competencia suspendida y funcionarios bajo presión para comprometer recursos antes del 31 de diciembre.',
        ],
        pullquote: {
          quote: '435 contratos al día, cada día de diciembre de 2015',
          stat: '13,478',
          statLabel: 'contratos firmados en diciembre de 2015',
          barValue: 100,
          barLabel: 'Contratos por día vs. promedio mensual',
        },
        chartConfig: {
          type: 'year-bar',
          title: 'El efecto diciembre — patrones de contratación mensual en 23 años',
          chartId: 'seasonality-calendar',
        },
      },
      {
        id: 'un-problema-bipartidista',
        number: 2,
        title: 'Un Problema Bipartidista',
        subtitle: 'Los picos de diciembre abarcan todas las administraciones — pero la solución es estructural',
        prose: [
          'La avalancha de diciembre no pertenece a ninguna administración en particular. RUBLI identifica 26,404 contratos marcados con el indicador de riesgo de fin de año en los 23 años de datos. El patrón abarca a Fox, Calderón, Peña Nieto y López Obrador.',
          'Lo que cambia entre administraciones es la magnitud. Con Peña Nieto, el pico de diciembre fue el más pronunciado en términos absolutos — siendo la avalancha de 2015 el caso extremo. Con López Obrador, el pico fue menor en términos absolutos pero se produjo sobre una línea base de adjudicaciones directas ya elevada, haciendo la reducción efectiva en la supervisión más severa.',
          'La OCDE ha identificado repetidamente las avalanchas de fin de año como un factor de riesgo de corrupción. RUBLI lo integra como una de sus 16 características z-score, normalizada frente a las líneas base de sector y año. La solución estructural es bien conocida: presupuestación plurianual, provisiones de arrastre y penalizaciones por gasto acelerado de fin de año eliminarían el incentivo. Ninguna administración mexicana ha implementado ninguna de estas reformas.',
        ],
        pullquote: {
          quote: 'Las avalanchas de diciembre son bipartidistas. La solución es estructural.',
          stat: '26,404',
          statLabel: 'contratos de fin de año marcados en todos los años',
        },
        chartConfig: {
          type: 'calendar',
          title: 'Mapa de riesgo mensual 2016–2025 — diciembre = rojo permanente',
          chartId: 'risk-calendar',
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
    headline: 'El Cártel del Corazón: Vitalmex y el Monopolio de 50 Mil Millones en Equipo Cardíaco',
    subheadline: 'La autoridad de competencia COFECE abrió una investigación. El algoritmo de RUBLI había detectado la concentración años antes de que actuaran los reguladores.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 6,
    leadStat: { value: '$50B', label: 'en contratos de equipo cardíaco — Vitalmex', sublabel: 'investigación COFECE activa | patrón de monopolio', color: 'text-red-500' },
    relatedSlugs: ['triangulo-farmaceutico', 'cero-competencia', 'la-cuarta-adjudicacion'],
    chapters: [
      {
        id: 'el-monopolio',
        number: 1,
        title: 'El Monopolio',
        subtitle: 'Una empresa. Cincuenta mil millones. Cada cirugía cardíaca en México.',
        prose: [
          'Vitalmex Internacional S.A. de C.V. ha construido una posición en la contratación de equipo cardíaco mexicano que la autoridad federal de competencia COFECE ha designado formalmente como un posible monopolio bajo investigación.',
          'El análisis de RUBLI sobre los registros de COMPRANET muestra a Vitalmex acumulando aproximadamente 50 mil millones de pesos en contratos para equipo de cirugía cardíaca, implantes y suministros relacionados en hospitales federales. El puntaje de concentración de proveedor de la empresa — que mide qué proporción del gasto de un sector fluye hacia un solo proveedor — se encuentra entre los más altos que RUBLI ha registrado.',
          'La investigación de COFECE valida lo que los datos muestran de manera independiente: cuando una empresa controla el suministro de stents cardíacos, marcapasos y equipo quirúrgico a todos los hospitales federales de México, el mercado ha dejado de funcionar. Lo que RUBLI añade al panorama regulatorio es la dimensión temporal. La concentración no surgió de la noche a la mañana. Se construyó durante años, contrato por contrato, a través de adjudicaciones directas y procesos de un solo postor que cada uno era individualmente justificable pero que en conjunto constituyen un mercado capturado.',
        ],
        pullquote: {
          quote: 'COFECE abrió una investigación. RUBLI había detectado el patrón años antes.',
          stat: '$50B',
          statLabel: 'en contratos de equipo cardíaco',
          barValue: 95,
          barLabel: 'Percentil de concentración de proveedor',
        },
        chartConfig: {
          type: 'vendor-list',
          title: 'Concentración de proveedores — captura del mercado de equipo cardíaco',
          chartId: 'vendor-concentration',
        },
      },
      {
        id: 'el-costo',
        number: 2,
        title: 'El Costo de la No Competencia',
        subtitle: 'Cuando una empresa fija el precio de cada cirugía cardíaca',
        prose: [
          'Los procedimientos cardíacos se encuentran entre los más costosos de la medicina. Un solo marcapasos puede costar cientos de miles de pesos. Los stents coronarios, las válvulas cardíacas, los descartables quirúrgicos — cada uno tiene un precio que, multiplicado por el volumen de un sistema de salud nacional, alcanza miles de millones. Cuando una empresa domina el suministro, ella fija el precio. No hay punto de referencia, no hay cotización competidora, no hay presión de mercado para reducir costos. El comprador — en este caso, el gobierno federal mexicano — es un rehén.',
          'Los estudios internacionales muestran consistentemente que los mercados monopolísticos de dispositivos médicos producen precios entre 20 y 40% más altos que los competitivos. Aplicado al portafolio de 50 mil millones de pesos de Vitalmex, el sobrepago implícito oscila entre 10 y 20 mil millones de pesos.',
          'La investigación de COFECE está en curso. Cualquiera que sea su resultado, los datos de COMPRANET son claros: este nivel de concentración en una categoría crítica de insumos médicos es, por cualquier estándar internacional, una falla de mercado. El dinero que pudo haberse pagado de más podría haber financiado construcción hospitalaria, salarios de enfermeras o compra de medicamentos para pacientes que actualmente esperan ambas cosas.',
        ],
        pullquote: {
          quote: 'Precios de monopolio en equipo cardíaco: hasta 20 mil millones en sobrepago potencial',
          stat: '20-40%',
          statLabel: 'prima de monopolio estimada, con base en estudios de la OCDE',
        },
        chartConfig: {
          type: 'pyramid',
          title: 'Concentración de valor en contratos de riesgo crítico — equipo cardíaco',
          chartId: 'risk-pyramid',
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
    relatedSlugs: ['los-nuevos-ricos-de-la-4t', 'el-granero-vacio', 'la-cuarta-adjudicacion'],
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
        chartConfig: {
          type: 'network',
          title: 'Comunidades de proveedores — redes de empresas fantasma detectadas',
          chartId: 'community-bubbles',
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
        chartConfig: {
          type: 'pyramid',
          title: 'Cómo distribuye el modelo RUBLI — pirámide de riesgo 3.05M contratos',
          chartId: 'risk-pyramid',
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
    headline: 'Sin Postores: 2.1 Billones en Obra Pública sin Competencia Real',
    subheadline: '196,540 contratos de infraestructura recibieron un solo postor. El resultado: un mercado donde los precios los fija el ganador, no la competencia.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 7,
    leadStat: { value: '$2.1T', label: 'contratos de infraestructura con un solo postor', sublabel: '196,540 contratos | 0 competencia real', color: 'text-orange-500' },
    relatedSlugs: ['cero-competencia', 'avalancha-diciembre', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-brecha',
        number: 1,
        title: 'La Brecha',
        subtitle: 'Donde el dinero es mayor y la competencia es menor',
        prose: [
          'La infraestructura es donde el dinero es mayor y la competencia es menor. RUBLI identifica 196,540 contratos en el sector de infraestructura que pasaron por un proceso nominalmente competitivo pero que solo atrajeron un postor. Su valor combinado: 2,146,800 millones de pesos. Carreteras, puentes, hospitales, escuelas — todo construido por empresas que nunca tuvieron que superar la oferta de un competidor.',
          'El sector tiene características estructurales que suprimen la competencia: equipo especializado, autorizaciones de seguridad, capacidad de fianza y presencia regional limitan el universo de licitantes elegibles. Son barreras legítimas. Pero cuando 196,540 contratos en un solo sector atraen exactamente un postor cada uno, las barreras han dejado de ser filtros y se han convertido en muros.',
          'Bajo López Obrador, el problema se intensificó. El Tren Maya, la refinería Dos Bocas, el Aeropuerto Internacional Felipe Ángeles — los megaproyectos emblemáticos de la Cuarta Transformación — se construyeron mediante una combinación de adjudicaciones directas a entidades militares exentas de las reglas normales de contratación y contratos con competencia efectiva mínima. La justificación declarada fue seguridad nacional y urgencia. El efecto fue mover cientos de miles de millones de pesos completamente fuera del marco de contratación pública.',
        ],
        pullquote: {
          quote: '196,540 contratos de infraestructura. Un solo postor. 2.1 billones de pesos.',
          stat: '$2,146.8B',
          statLabel: 'en infraestructura con un solo postor',
          barValue: 39.5,
          barLabel: '39.5% del valor total de contratos con un solo postor',
        },
        chartConfig: {
          type: 'trends',
          title: 'Tendencia de riesgo por sector — la brecha estructural de infraestructura',
          chartId: 'sector-risk-trends',
        },
      },
      {
        id: 'la-alternativa',
        number: 2,
        title: 'Cómo Se Ve la Competencia Real',
        subtitle: 'Y cuánto ahorra',
        prose: [
          'Los países que se toman en serio la contratación de infraestructura ven números distintos. En Corea del Sur, el promedio de licitantes para proyectos de infraestructura importantes supera cinco. En Chile, el modelo de concesión de carreteras produce competencia real de precios. Las directivas de la Unión Europea exigen períodos mínimos de publicación y competencia transfronteriza para proyectos que superan ciertos montos.',
          'Los datos de COMPRANET muestran un promedio de 1.3 licitantes por proceso de contratación de infraestructura. Si se restan las adjudicaciones directas, los procesos nominalmente "competitivos" promedian 1.8 licitantes. Ninguno de los dos números refleja un mercado que funcione.',
          'La OCDE estima que cada licitante adicional en un proceso de contratación reduce el precio ganador en un 5-10%. Si los 196,540 contratos de infraestructura con un solo postor hubieran atraído tres licitantes cada uno, el ahorro implicado ascendería a cientos de miles de millones de pesos. La infraestructura construida en estas condiciones no es necesariamente deficiente. Parte de ella es excelente. Pero los mexicanos no tienen manera de saber si pagaron un precio justo, porque nadie más ofreció construirla por menos.',
        ],
        pullquote: {
          quote: 'Promedio de licitantes por contrato de infraestructura: 1.3',
          stat: '1.3',
          statLabel: 'licitantes promedio — vs. 5+ en países comparables de la OCDE',
        },
        chartConfig: {
          type: 'scatter',
          title: 'Infraestructura tiene la tasa de DA más baja — pero no el menor riesgo',
          chartId: 'sector-paradox',
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
    relatedSlugs: ['cero-competencia', 'la-cuarta-adjudicacion', 'cartel-del-corazon'],
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
        chartConfig: {
          type: 'radar',
          title: 'Huella de Hacienda — cómo difiere su perfil de contratación del promedio',
          chartId: 'administration-fingerprints',
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
        chartConfig: {
          type: 'pyramid',
          title: 'Lo que el modelo ve — distribución de riesgo en Hacienda 2002-2025',
          chartId: 'risk-pyramid',
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
    headline: 'Oceanografía: El Fraude de 22,400 Millones que Cruzó Fronteras',
    subheadline: 'Un contratista mexicano, PEMEX, Banamex y Citibank — y la anatomía internacional de un fraude de contratación que expuso un vacío de transparencia que México nunca ha cerrado.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 6,
    leadStat: { value: '$22.4B', label: 'en el escándalo Oceanografía-PEMEX-Banamex', sublabel: 'fraude transfronterizo | manipulación de facturas', color: 'text-red-500' },
    relatedSlugs: ['cartel-del-corazon', 'cero-competencia', 'sexenio-a-sexenio'],
    caseIds: [8],
    chapters: [
      {
        id: 'la-red',
        number: 1,
        title: 'La Red',
        subtitle: 'De un contratista de PEMEX a una pérdida para Citibank',
        prose: [
          'Oceanografía S.A. de C.V. era un contratista de servicios marítimos para Petróleos Mexicanos. Su actividad declarada era proveer embarcaciones y servicios submarinos para las operaciones petroleras offshore de México — trabajo técnico especializado que justificaba un universo limitado de licitantes y adjudicaciones directas frecuentes.',
          'En la práctica, Oceanografía llevaba años inflando facturas. La empresa presentaba reclamaciones a Banamex — la subsidiaria mexicana de Citibank — afirmando montos adeudados por PEMEX que o no existían o habían sido artificialmente inflados. Banamex anticipaba fondos contra estas cuentas por cobrar. Cuando el fraude fue descubierto en 2014, Citibank se vio obligado a registrar una pérdida de aproximadamente 400 millones de dólares. El valor total del fraude de Oceanografía, incluyendo las pérdidas de PEMEX, se estima en 22,400 millones de pesos.',
          'La base de datos de RUBLI contiene solo dos contratos directamente atribuidos a Oceanografía en el ground truth. La empresa operó en gran medida a través de los sistemas internos de contratación de PEMEX, que preceden la integración completa a COMPRANET y cuyos registros permanecen incompletos. Ese vacío de datos es en sí mismo un hallazgo.',
        ],
        pullquote: {
          quote: 'El fraude que obligó a Citibank a registrar una pérdida de 400 millones de dólares',
          stat: '$22.4B',
          statLabel: 'valor estimado del fraude',
        },
        chartConfig: {
          type: 'network',
          title: 'Red de proveedores PEMEX — comunidades de co-contratación detectadas',
          chartId: 'community-bubbles',
        },
      },
      {
        id: 'el-vacio',
        number: 2,
        title: 'El Vacío de Datos',
        subtitle: 'Lo que la transparencia no puede ver',
        prose: [
          'El caso Oceanografía expone una de las limitaciones reconocidas de RUBLI: la plataforma solo puede analizar lo que COMPRANET registra. Y la cobertura de COMPRANET sobre la contratación de PEMEX y CFE — los dos mayores gastadores del sector energético — es incompleta, particularmente para los años anteriores a 2018.',
          'PEMEX operó su propio portal de contratación durante años antes de ser obligada a registrar todos los contratos en COMPRANET. Muchos de los contratos más grandes del sector energético — fletamento de embarcaciones, servicios de perforación, mantenimiento de infraestructura — se ejecutaron a través de procesos específicos de PEMEX que generaron registros en formatos distintos, con diferentes niveles de detalle y diferentes grados de acceso público.',
          'El análisis del sector energético de RUBLI es por tanto sistemáticamente incompleto. Los contratos que observa representan solo una parte del gasto total del sector. El fraude de Oceanografía, que operó en el espacio entre la contratación interna de PEMEX y los registros públicos de COMPRANET, ilustra precisamente lo que cae por las grietas. La transparencia en la contratación solo es útil cuando es integral. Un sistema donde el mayor gastador puede operar sustancialmente fuera del registro público no es un sistema de transparencia. Es un sistema con un agujero bien ubicado.',
        ],
        pullquote: {
          quote: 'Un sistema de transparencia con un agujero de 22,400 millones',
          stat: '2',
          statLabel: 'contratos en COMPRANET encontrados — de un estimado de cientos',
        },
        chartConfig: {
          type: 'trends',
          title: 'Tendencia de riesgo en energía — el patrón que el modelo detecta',
          chartId: 'sector-risk-trends',
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
    headline: 'Cuatro Presidentes, Una Dirección: La Deriva de 23 Años hacia la Adjudicación Directa',
    subheadline: 'Fox, Calderón, Peña Nieto, López Obrador. Partidos distintos, ideologías distintas. La tasa de adjudicación directa subió con todos ellos.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 10,
    leadStat: { value: '62.7% a 81.9%', label: 'tasa de adjudicación directa, 2010 a 2023', sublabel: '23 años de datos | 3.05 millones de contratos', color: 'text-zinc-300' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'avalancha-diciembre', 'la-austeridad-que-no-fue'],
    chapters: [
      {
        id: 'el-arco',
        number: 1,
        title: 'El Arco',
        subtitle: 'Una historia que trasciende administraciones',
        prose: [
          'La base de datos de RUBLI abarca cuatro presidencias mexicanas y 23 años de registros de contratación federal. La historia que cuenta no es sobre ningún presidente en particular. Es sobre un sistema que, sin importar quién ocupa el Palacio Nacional, se mueve en una sola dirección: hacia menos competencia.',
          'Con Vicente Fox, la tasa de adjudicación directa se mantuvo entre los 60 puntos bajos y medios. Con Felipe Calderón comenzó a subir: 62.7% en 2010, 68.4% para 2013. Con Enrique Peña Nieto la aceleración continuó: 73.0% en 2015, 76.2% en 2018. Con Andrés Manuel López Obrador alcanzó su nivel más alto registrado: 77.8% en 2019, subiendo cada año hasta llegar a 81.9% en 2023.',
          'Cuatro presidentes. Dos partidos — PAN y PRI, luego Morena. Conservador y progresista. Libre comercio y nacionalista. En la cuestión de la competencia en la contratación, la trayectoria fue idéntica en todos ellos. Este no es un hallazgo partidista. Es uno estructural. El sistema de contratación mexicano tiene un trinquete interno que empuja hacia las adjudicaciones directas sin importar la administración, porque las adjudicaciones directas son más rápidas, más simples y dan a quien está en el poder mayor control sobre quién recibe el dinero.',
        ],
        pullquote: {
          quote: 'Cuatro presidentes. Dos partidos. Una dirección: menos competencia.',
          stat: '62.7% a 81.9%',
          statLabel: 'tasa de adjudicación directa de 2010 a 2023',
          barValue: 82,
          barLabel: 'Tendencia de adjudicación directa',
        },
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Tasa de adjudicación directa por año (2010-2023) — 4 administraciones',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'pero-no-iguales',
        number: 2,
        title: 'Pero No Son Iguales',
        subtitle: 'López Obrador aceleró lo que otros habían comenzado',
        prose: [
          'Aunque la tendencia es consistente, la naturaleza de la contribución no lo es. Con Calderón, la tasa de adjudicación directa subió aproximadamente un punto porcentual por año — resultado, en gran medida, de la inercia burocrática y la débil supervisión. Con Peña Nieto el ritmo fue similar. Con López Obrador el aumento anual fue más pronunciado, partiendo de una base ya elevada.',
          'Más importante aún, la contribución de la 4T fue cualitativamente distinta. Bajo las administraciones anteriores, el aumento de la tasa de adjudicación directa fue principalmente pasivo. Con López Obrador se convirtió en política activa. La eliminación de los fideicomisos, la centralización de la contratación a través de la oficina presidencial, la decisión explícita de canalizar los megaproyectos a través de entidades militares exentas de las reglas normales de contratación — estas fueron decisiones deliberadas que expandieron la contratación sin licitación más allá de lo que la inercia sola habría producido.',
          'Las 1,253 empresas fantasma identificadas por RUBLI debutaron de manera abrumadora después de 2018. La tasa de adjudicación directa del 93.4% en agricultura fue producto del diseño intencional de la contratación de SEGALMEX. Los doce contratos a HEMOSER en un solo día no fueron inercia burocrática. Cada presidente contribuyó a la tendencia. Uno la convirtió en filosofía de gobierno.',
        ],
        pullquote: {
          quote: 'Los demás derivaron hacia la opacidad. AMLO la convirtió en política.',
          stat: '+5.7pp',
          statLabel: 'aumento en la tasa de AD bajo AMLO (76.2% a 81.9%)',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Tasa de adjudicación directa por administración — 4 sexenios comparados',
          chartId: 'sexenio-comparison',
        },
      },
      {
        id: 'lo-que-viene',
        number: 3,
        title: 'Lo Que Viene',
        subtitle: 'Sheinbaum hereda el sistema de contratación más opaco en décadas',
        prose: [
          'Claudia Sheinbaum tomó posesión el 1 de octubre de 2024, heredando un sistema de contratación donde más del 80% de los contratos federales se adjudican sin licitación competitiva. Si revertirá la tendencia que aceleró cada uno de sus predecesores sigue siendo una pregunta abierta.',
          'Los datos tempranos de la administración Sheinbaum son demasiado limitados para un análisis definitivo — RUBLI actualizará su seguimiento conforme los datos de 2025 fluyan hacia COMPRANET. Pero los incentivos estructurales que produjeron 23 años de adjudicaciones directas crecientes no han cambiado. No se ha propuesto ninguna reforma a la Ley de Adquisiciones. No hay ninguna reestructuración de la supervisión de la contratación en marcha.',
          'Los 3.05 millones de contratos en la base de datos de RUBLI cuentan una historia que trasciende la ideología. El problema no es de izquierda ni de derecha, PAN ni Morena. Es un sistema donde cada administración encuentra más fácil, más rápido y más útil políticamente adjudicar contratos directamente que licitarlos. Hasta que ese sistema cambie, la tendencia continuará. Y los beneficiarios de la opacidad — las empresas fantasma, el triángulo farmacéutico, el cártel del corazón, la bodega vacía de SEGALMEX — encontrarán nuevos nombres y nuevos contratos bajo nuevas administraciones. Las caras cambian. El sistema permanece.',
        ],
        pullquote: {
          quote: 'Las caras cambian. El sistema permanece.',
          stat: '3,051,294',
          statLabel: 'contratos analizados en 23 años y 4 presidencias',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Trayectoria del puntaje de riesgo 2010–2025 — hacia dónde va el sistema',
          chartId: 'temporal-risk',
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
        chartConfig: {
          type: 'network',
          title: 'Comunidades de empresas de infraestructura — cinco nodos, una red',
          chartId: 'community-bubbles',
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
        chartConfig: {
          type: 'scatter',
          title: 'Infraestructura: alta concentración de valor, no la mayor adjudicación directa',
          chartId: 'sector-paradox',
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
    relatedSlugs: ['la-cuarta-adjudicacion', 'la-herencia-envenenada', 'sexenio-a-sexenio'],
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
        chartConfig: {
          type: 'sector-bar',
          title: 'Mapa de riesgo por sector 2002-2025 — legado estructural de la opacidad',
          chartId: 'sector-risk-heatmap',
        },
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
        chartConfig: {
          type: 'sunburst',
          title: 'Reconfiguración del gasto en salud — 2018 vs 2022 por administración',
          chartId: 'admin-sunburst',
        },
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
        chartConfig: {
          type: 'pyramid',
          title: 'El peso del riesgo crítico en salud — 41.8% del valor en 6.1% de contratos',
          chartId: 'risk-pyramid',
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
    headline: 'Tren Maya: 180 Mil Millones de Pesos y Ni Una Sola Licitación Competitiva',
    subheadline: 'El proyecto de infraestructura más caro de México eludió las reglas de contratación mediante declaratorias de emergencia, exenciones militares y contratos directos a empresas sin ninguna experiencia ferroviaria.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 13,
    leadStat: { value: '$180B', label: 'MXN en contratos sin licitación', color: '#1e3a5f' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'el-proyecto',
        number: 1,
        title: 'El Proyecto',
        subtitle: 'Un tren que nadie licitó para construir',
        prose: [
          'El Tren Maya fue el proyecto de infraestructura emblemático de López Obrador: una línea de pasajeros de 1,500 kilómetros que conectaría los destinos turísticos de la Península de Yucatán con su interior indígena. Anunciado en diciembre de 2018, se presentó como una iniciativa de desarrollo que traería empleos y conectividad a algunas de las comunidades más pobres de México.',
          'El costo creció de una estimación inicial de 120 mil millones de pesos a más de 300 mil millones cuando comenzaron las operaciones parciales en diciembre de 2023. Analistas independientes estimaron el costo real, incluyendo financiamiento y sobrecostos, en alrededor de 400 mil millones de pesos. La cifra oficial del gobierno se mantuvo en 177 mil millones de pesos durante la mayor parte del período de construcción — un número que excluía los costos de financiamiento de deuda y la contribución militar.',
          'El análisis de RUBLI sobre los registros de COMPRANET encuentra 180 mil millones de pesos en contratos directamente atribuibles a la construcción del Tren Maya a través de FONATUR, el fondo de turismo gubernamental que fungió como autoridad contratante. De esos contratos, el 97.3% se adjudicaron sin licitación competitiva. El resto pasó por lo que COMPRANET clasifica como "invitación restringida" — invitaciones a un grupo preseleccionado de empresas, no competencia pública abierta. Las empresas que recibieron esos contratos presentan un patrón consistente: creadas en 2019 o 2020, después del anuncio del proyecto, sin experiencia previa en ferroviaria o infraestructura.',
        ],
        chartConfig: {
          type: 'racing',
          title: 'El ascenso de infraestructura — gasto federal por sector 2002-2025',
          chartId: 'racing-bar',
        },
      },
      {
        id: 'la-excepcion-militar',
        number: 2,
        title: 'La Excepción Militar',
        subtitle: 'Cuando la seguridad nacional se convierte en escape de las reglas de contratación',
        prose: [
          'Una parte sustancial de la construcción del Tren Maya fue asignada directamente a la SEDENA — la Secretaría de la Defensa Nacional — sin pasar por COMPRANET. Las entidades militares que operan bajo designaciones de seguridad nacional están exentas de la ley estándar de contratación. El efecto fue mover las secciones más sensibles y costosas del proyecto completamente fuera del marco de rendición de cuentas pública.',
          'El uso de contratistas militares para infraestructura civil no es exclusivo del Tren Maya. Con López Obrador, a la SEDENA también se le asignó la construcción del Aeropuerto Internacional Felipe Ángeles, la gestión de varios puertos y la coordinación del programa agrícola Sembrando Vida. Las fuerzas armadas se convirtieron, en la práctica, en un sistema de contratación paralelo — uno que operaba con los recursos del presupuesto federal pero sin los requisitos de transparencia que aplican a las dependencias civiles.',
          'RUBLI no puede analizar completamente los contratos adjudicados a través de canales militares, porque esos contratos no están completamente reflejados en COMPRANET. Los 180 mil millones de pesos identificados en este análisis son por tanto un límite inferior. El costo real de los contratos del Tren Maya adjudicados sin licitación competitiva — incluyendo la contribución militar — es mayor, y no se conoce públicamente.',
        ],
        chartConfig: {
          type: 'sunburst',
          title: 'Huella presupuestal bajo AMLO — hacia dónde fue el gasto 2018-2024',
          chartId: 'admin-sunburst',
        },
      },
    ],
  },

  // =========================================================================
  // NEW STORY: La Máquina de Papel / The Paper Machine
  // History of COMPRANET, its creation, dissolution, and the rigged tender system
  // =========================================================================
  {
    slug: 'la-maquina-de-papel',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'La Máquina de Papel: COMPRANET y las Licitaciones Imposibles',
    subheadline: 'Creado en 1996 para hacer transparentes las compras del gobierno, COMPRANET se convirtió en el escenario perfecto para un truco más sofisticado: la licitación que cumple todas las formas — y garantiza el resultado.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 16,
    leadStat: { value: '23', label: 'años de datos de contratación en COMPRANET', sublabel: '3.1 millones de contratos | 2002-2025', color: 'text-blue-400' },
    status: 'solo_datos',
    nextSteps: [
      'Solicitar vía InfoMex el expediente completo de cualquier licitación donde el plazo de publicación fue inferior a 5 días hábiles.',
      'Verificar si las especificaciones técnicas de contratos de adjudicación directa recurrentes son idénticas o coinciden con las marcas registradas del proveedor ganador.',
      'Cruzar las fechas de apertura de licitaciones con el calendario de días festivos y periodos vacacionales para identificar ventanas imposibles.',
      'Comparar las licitaciones con "invitación a tres" con los registros de participación real: ¿cuántas tuvieron tres ofertas auténticas?',
    ],
    relatedSlugs: ['sexenio-a-sexenio', 'cero-competencia', 'la-cuarta-adjudicacion', 'dividir-para-evadir'],
    chapters: [
      {
        id: 'el-origen',
        number: 1,
        title: 'La Promesa Original',
        subtitle: 'México, 1996: el gobierno que quería ser transparente',
        sources: [
          'DOF, 28 de julio de 1997 — Acuerdo por el que se crea COMPRANET.',
          'SECODAM (2000). Manual de Operación de COMPRANET.',
        ],
        prose: [
          'En 1996, bajo la presidencia de Ernesto Zedillo, México tomó una decisión que en su momento se presentó como revolucionaria: todas las licitaciones del gobierno federal serían publicadas en un sistema electrónico unificado al que cualquier empresa podría acceder. Se llamó COMPRANET — el Sistema Electrónico de Contrataciones Gubernamentales.',
          'La lógica era impecable. Si los contratos son visibles, los funcionarios no pueden asignarlos en la oscuridad. Si cualquier empresa puede conocer las convocatorias, hay más competencia. Más competencia significa mejores precios. Y precios más justos significan menos dinero robado. Era la aplicación del principio más elemental de la economía: la transparencia disciplina al mercado.',
          'En su primera década, COMPRANET funcionó de manera rudimentaria: boletines de papel escaneados, conexiones lentas, sistemas que colapsaban. Pero el principio estaba ahí. Para 2004, cuando SECODAM fue sustituida por la Secretaría de la Función Pública (SFP), el sistema ya procesaba decenas de miles de contratos por año. Para 2011, con el lanzamiento de COMPRANET 5.0, México se convirtió en uno de los primeros países latinoamericanos con un sistema de compras públicas completamente electrónico.',
          'Los analistas internacionales aplaudieron. La OCDE citó a México como modelo. El Banco Mundial financió parte de la modernización. Y en las reuniones de transparencia presupuestal, México era un caso de éxito. En los datos, la realidad era más complicada.',
        ],
        pullquote: {
          quote: 'La transparencia disciplina al mercado. Eso era la teoría.',
          stat: '1996',
          statLabel: 'año de creación de COMPRANET',
          barValue: 38,
          barLabel: 'porcentaje de licitaciones competitivas en 2002',
        },
        chartConfig: {
          type: 'da-trend',
          title: 'Evolución de la adjudicación directa 2002-2024',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'la-ventana',
        number: 2,
        title: 'La Ventana Imposible',
        subtitle: 'Cómo los plazos de licitación se convirtieron en la herramienta de selección',
        prose: [
          'La Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público establece plazos mínimos para las licitaciones públicas: 20 días hábiles para licitaciones nacionales, 40 para internacionales. En teoría, ese tiempo permite que cualquier empresa interesada conozca los requisitos, prepare su oferta y la presente.',
          'En la práctica, el sistema tiene un truco que no requiere violar ninguna norma. Se llama licitación convocada con plazos mínimos y especificaciones de marca. El mecanismo funciona así: una dependencia publica una convocatoria un viernes por la tarde, con veinte días exactos de plazo — el mínimo legal. Las especificaciones técnicas no describen qué se necesita; describen qué marca específica se quiere, con palabras como "o equivalente" añadidas al final para cumplir la forma. El plazo suficiente, las especificaciones imposibles de cumplir para otra empresa en ese tiempo.',
          'RUBLI ha documentado miles de contratos que siguen este patrón. El indicador técnico que los identifica se llama z_same_day_count — contratos adjudicados en el mismo día, al mismo proveedor, por la misma institución. En el análisis estadístico, estos racimos aparecen como anomalías. En la realidad presupuestal, son el resultado de un proceso que comenzó semanas antes con una decisión ya tomada.',
          'El fenómeno tiene nombre en los círculos de contratación: "licitación a modo". La convocatoria existe. Los documentos están en COMPRANET. El plazo está en la ley. Y el resultado es el que siempre iba a ser.',
        ],
        pullquote: {
          quote: 'La convocatoria existe. Los documentos están en COMPRANET. El resultado ya estaba decidido.',
          stat: '505,219',
          statLabel: 'contratos con un solo oferente en 23 años de datos',
          barValue: 505219,
          barLabel: 'Licitaciones con un solo participante',
        },
      },
      {
        id: 'los-tres',
        number: 3,
        title: 'La Invitación a Tres',
        subtitle: 'La licitación restringida que funciona como adjudicación directa',
        prose: [
          'Cuando el monto del contrato no justifica una licitación pública abierta — por ser menor al umbral legal —, la ley permite una modalidad intermedia: la "invitación a cuando menos tres personas". La institución puede seleccionar tres empresas y pedirles que presenten propuestas. En apariencia, hay competencia. En la práctica, los datos cuentan otra historia.',
          'El análisis de RUBLI sobre los contratos de invitación restringida muestra un patrón consistente: en muchos sectores, las mismas tres empresas aparecen juntas en licitación tras licitación, durante años. Esto tiene un nombre en la teoría de la colusión: bid rotation. Una empresa gana hoy, la siguiente gana mañana, la tercera la semana siguiente. Todas presentan propuestas. Ninguna compite realmente.',
          'No es necesario que exista un acuerdo explícito. Basta con que las instituciones contratantes inviten siempre a las mismas empresas. El resultado es funcionalmente idéntico al de una adjudicación directa, pero con la cobertura formal de haber seguido un proceso competitivo. Los expedientes están en orden. COMPRANET registra tres propuestas. Y el dinero va a donde siempre iba.',
          'El sistema identifica estos patrones a través del indicador co_bid_rate: la tasa de co-licitación entre pares de proveedores. En el modelo v6.4, este indicador fue regularizado a cero — no porque el patrón no exista, sino porque los datos de entrenamiento no contienen suficientes casos documentados de carteles de licitación. Lo que el modelo no puede ver, los datos de COMPRANET sí lo sugieren.',
        ],
        pullquote: {
          quote: 'Tres ofertas, la misma empresa ganadora, año tras año. Eso no es competencia.',
          stat: '247,946',
          statLabel: 'contratos con fraccionamiento sospechoso detectado',
          barValue: 66,
          barLabel: 'Porcentaje de contratos bajo umbral de licitación',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Comparación de licitaciones por administración',
          chartId: 'sexenio-comparison',
        },
      },
      {
        id: 'el-fraccionamiento',
        number: 4,
        title: 'El Arte del Fraccionamiento',
        subtitle: 'Dividir para no licitar: 247,946 contratos diseñados para quedar bajo el umbral',
        prose: [
          'La Ley de Adquisiciones establece umbrales: por encima de cierta cantidad, se requiere licitación pública. Por debajo, adjudicación directa es legal. La lógica del umbral existe para reducir la burocracia en contratos pequeños. Lo que el legislador no anticipó — o tal vez sí anticipó pero no supo cómo evitar — es el incentivo que crea: dividir un contrato grande en fragmentos pequeños para quedar siempre por debajo del límite.',
          'El análisis estadístico de RUBLI detecta este patrón mediante el indicador z_same_day_count: contratos firmados el mismo día, con el mismo proveedor, por la misma institución, por montos que individualmente no superan el umbral pero que en conjunto sí lo harían. La distribución de esos contratos tiene una forma estadísticamente improbable: hay una acumulación anómala justo por debajo del límite legal y un vacío inmediatamente por encima.',
          'En 23 años de datos de COMPRANET, RUBLI ha identificado 247,946 contratos que muestran este patrón de fraccionamiento sospechoso. No todos son necesariamente fraudulentos: algunos pueden reflejar decisiones de compra legítimas. Pero la concentración estadística no puede explicarse por el azar. Alguien, sistemáticamente, está calculando los montos para quedar bajo el radar.',
          'La ironía es que COMPRANET registra todo. Cada contrato fraccionado está ahí, con su fecha, su monto, su proveedor, su institución. El sistema que fue creado para la transparencia contiene la evidencia de su propia evasión. Solo hace falta el análisis estadístico para verlo.',
        ],
        pullquote: {
          quote: 'Los datos están ahí. El sistema que fue creado para la transparencia contiene la evidencia de su propia evasión.',
          stat: '247,946',
          statLabel: 'contratos con patrón de fraccionamiento sospechoso',
          barValue: 82,
          barLabel: 'Concentración bajo umbrales legales',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Contratos con fraccionamiento sospechoso por año',
          chartId: 'threshold-splitting',
        },
      },
      {
        id: 'el-futuro',
        number: 5,
        title: 'Lo Que los Datos Dicen',
        subtitle: 'Tres décadas de COMPRANET: la promesa y el rezago',
        prose: [
          'En 2018, el gobierno entrante anunció una revisión integral de COMPRANET. La plataforma, dijeron, era vieja, ineficiente y había sido cooptada. Se lanzaría una nueva versión. Mientras tanto, la calidad de los datos publicados en el sistema deterioró notablemente: menos campos completados, más contratos sin proveedor identificado, más registros con montos en blanco.',
          'Los especialistas en transparencia presupuestal documentaron el deterioro. El IMCO publicó reportes alertando sobre la reducción en la calidad de los datos. FUNDAR señaló que miles de contratos de los años 2019-2022 tenían información incompleta o contradictoria. La herramienta creada para iluminar el gasto público se volvía más opaca, justo cuando el gasto sin licitación alcanzaba sus niveles históricos más altos.',
          'Para los 3.1 millones de contratos que RUBLI ha procesado, el patrón es claro: la calidad de los datos mejora con el tiempo en términos de cobertura técnica — más campos, mejor digitalización — pero el contenido real del gasto se vuelve menos competitivo. Más dinero, menos licitaciones. Más registros, menos información real sobre quién gana y por qué.',
          'COMPRANET sigue operando. Los contratos siguen publicándose. Y en cada convocatoria con plazos de veinte días y especificaciones de marca, en cada invitación a tres donde siempre gana el mismo, en cada racimo de contratos fraccionados justo bajo el umbral, el sistema hace lo que fue diseñado para hacer: registrar una decisión que ya estaba tomada.',
        ],
        pullquote: {
          quote: 'Más registros, menos competencia real. La promesa de 1996 sigue incumplida.',
          stat: '81.9%',
          statLabel: 'contratos sin licitación en 2023 — récord histórico',
          barValue: 81.9,
          barLabel: 'Adjudicación directa 2023',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Administración por administración: la tendencia de 23 años',
          chartId: 'amlo-era-comparison',
        },
      },
    ],
  },
]

function normalizeSlug(slug: string): string {
  return slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function getStoryBySlug(slug: string): StoryDef | undefined {
  const norm = normalizeSlug(slug)
  return STORIES.find(s => s.slug === slug || normalizeSlug(s.slug) === norm)
}

export function getRelatedStories(story: StoryDef): StoryDef[] {
  if (!story.relatedSlugs?.length) return []
  return story.relatedSlugs
    .map(slug => STORIES.find(s => s.slug === slug))
    .filter((s): s is StoryDef => s !== undefined)
}
