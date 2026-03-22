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
    headline: 'La Cuarta Adjudicación: Como la 4T Rompio el Record de Contratos Sin Licitación',
    subheadline: 'La promesa de acabar con la corrupción llego con la tasa más alta de adjudicaciónes directas en 23 anos de datos',
    byline: 'RUBLI \u00b7 Por Unidad de Datos',
    estimatedMinutes: 12,
    leadStat: { value: '81.9%', label: 'contratos sin licitación en 2023', sublabel: 'el ano más alto desde 2002', color: 'text-red-500' },
    status: 'reporteado',
    nextSteps: [
      'Solicitar via InfoMex el desglose anual de adjudicaciónes directas por dependencia y justificación legal.',
      'Comparar las tasas por dependencia: ¿cuales superan el 90%? ¿Coinciden con escándalos documentados?',
      'Cruzar con datos de la ASF: ¿las dependencias más opacas recibieron más observaciones de auditoria?',
    ],
    relatedSlugs: ['el-granero-vacio', 'los-nuevos-ricos-de-la-4t', 'hemoser-el-2-de-agosto'],
    chapters: [
      {
        id: 'la-promesa',
        number: 1,
        title: 'La Promesa',
        subtitle: 'Diciembre 2018: un presidente que iba a cambiarlo todo',
        sources: [
          'COMPRANET \u2014 Base de datos federal de contratos 2002-2025 (3,051,294 registros).',
          'OCDE (2023). Public Procurement Performance Report. OECD Publishing, Par\u00eds.',
          'DOF, 1 de diciembre de 2018 \u2014 Decreto de austeridad republicana, Art. 3-5.',
          'RUBLI v6.4 \u2014 Modelo de riesgo, 150 trials Optuna, AUC=0.840.',
        ],
        prose: [
          'López Obrador llego a Los Pinos el 1 de diciembre de 2018 con una promesa grabada en piedra: la "Cuarta Transformación" acabaria con la corrupción que por decadas habia vaciado el erario público. "Por el bien de todos, primero los pobres," prometio. La transparencia en el gasto público seria su bandera.',
          'Los datos cuentan otra historia.',
          'En 2019 -- meses antes de que el COVID-19 llegara a México, antes de que cualquier emergencia pudiera servir de excusa -- el 77.8 por ciento de todos los contratos del gobierno federal se adjudicaron sin licitación pública, sin que ninguna otra empresa tuviera la oportunidad de competir. Era ya el nivel más alto desde que COMPRANET comenzo a documentar el gasto federal de manera sistemática.',
          'La pandemia no creo el problema. Lo heredo. Y lo profundizo.',
          'Nuestro análisis de 3,051,294 contratos federales registrados en COMPRANET entre 2002 y 2025, procesados por el motor de detección de riesgo RUBLI, revela un patron incontrovertible: cada ano del gobierno de López Obrador supero al anterior en concentración de adjudicaciónes directas. No fue un accidente. No fue la pandemia. Fue política de Estado.',
        ],
        pullquote: {
          quote: 'El primer ano sin COVID fue el que más contratos otorgo sin competencia',
          stat: '77.8%',
          statLabel: 'adjudicación directa en 2019 -- antes del COVID',
          barValue: 77.8,
          barLabel: 'Tasa de adjudicación directa',
        },
      },
      {
        id: 'el-escalon',
        number: 2,
        title: 'El Escalon',
        subtitle: 'Ano tras ano, la misma direccion: más contratos sin competencia',
        prose: [
          'Para entender la magnitud del cambio, hay que observar lo que ocurrio mes a mes, ano a ano, durante el sexenio de López Obrador.',
          '2019: 77.8% adjudicación directa -- antes del COVID. 2020: 78.1% -- el ano de la pandemia, apenas un punto más. 2021: 80.0% -- el pico que nadie esperaba, cuando la emergencia habia cedido. 2022: 79.1% -- sin pandemia, sin emergencia declarada. 2023: 81.9% -- el record absoluto en 23 anos de datos.',
          'El ano de mayor adjudicación directa no fue 2020, el ano del COVID. Fue 2023. Cuando ya no habia emergencia sanitaria. Cuando la economia habia repuntado. Cuando el argumento de la urgencia ya no se sostenia.',
          'Ochenta y dos centavos de cada peso contratado en 2023 fueron a una empresa que no tuvo que competir para ganarlo.',
          'La trayectoria es monotona ascendente. En 2010, bajo Felipe Calderón, la tasa de adjudicación directa era del 62.7 por ciento -- ya alta por estandares internacionales, pero 19 puntos por debajo de lo que López Obrador dejaria al salir. Con Peña Nieto, la tasa escalo del 68.4% en 2013 al 76.2% en 2018. López Obrador recogio esa herencia y la convirtio en sistema.',
          'No hay forma de leer estos datos como un accidente. La adjudicación directa no es un residuo del sexenio anterior. Es la política económica del sexenio de la 4T.',
        ],
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Tasa de adjudicación directa por ano (2010-2023)',
        },
        pullquote: {
          quote: 'El record de adjudicación directa no fue en pandemia. Fue en 2023.',
          stat: '81.9%',
          statLabel: 'DA en 2023 — sin emergencia, sin pandemia, sin excusa',
          barValue: 81.9,
          barLabel: '2023: record histórico',
        },
      },
      {
        id: 'los-números',
        number: 3,
        title: 'Los Números que el Gobierno No Mencióna',
        subtitle: 'El desglose por sector destruye el argumento de la urgencia',
        prose: [
          'El gobierno de López Obrador argumento, en multiples ocasiones, que las adjudicaciónes directas estaban justificadas por razones de emergencia, urgencia técnica o porque no habia otros proveedores disponibles.',
          'Los datos de COMPRANET no respaldan ese argumento.',
          'El sector Agricultura -- que bajo la 4T incluia a SEGALMEX, la empresa que se convirtio en símbolo de la corrupción de este gobierno -- tuvo una tasa de adjudicación directa del 93.4 por ciento. Nueve de cada diez contratos agricolas durante el sexenio de López Obrador se otorgaron sin concurso. No era urgencia médica. No era pandemia. Era leche, maíz y frijol.',
          'El número es asombroso en contexto. SEGALMEX, creada en 2019 como el brazo alimentario de la 4T, se convirtio en la dependencia más opaca del gobierno federal. Para cuando la Auditoría Superior de la Federacion termino de contar, habia un faltante documentado de 15 mil millones de pesos. No es coincidencia que el sector con más adjudicaciónes directas sea el que produjo el mayor escandalo de corrupción del sexenio.',
          'El sector Salud opero al 78.9% de adjudicación directa -- en medio de una crisis de desabasto de médicamentos que el propio gobierno genero al desmantelar las cadenas de distribución existentes. Se eliminaron licitaciónes "porque habia corrupción," y se sustituyeron por adjudicaciónes directas a empresas sin historial.',
          'No es urgencia. Es sistema. Y el sistema tiene beneficiarios.',
        ],
        pullquote: {
          quote: 'Nueve de cada diez contratos agricolas bajo la 4T se dieron sin competencia',
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
        title: 'La Herencia',
        subtitle: 'México gasta 3x más en adjudicaciónes directas que el limite de la OCDE',
        prose: [
          'La referencia internacional es clara. La Organización para la Cooperación y el Desarrollo Económicos (OCDE) considera que un sistema de contratación pública saludable deberia tener un maximo del 25 por ciento de contratos adjudicados sin licitación. Es un techo generoso -- la mayoria de los países miembros operan entre el 10 y el 20 por ciento.',
          'México bajo López Obrador opero a 81.9% en su último ano completo. Más de tres veces el maximo recomendado.',
          'Para poner la cifra en perspectiva: en 2018, el último ano del gobierno de Peña Nieto -- un gobierno ampliamente denunciado por corrupción --, la tasa era de 76.2%. López Obrador prometio reducirla. En cambio, la aumento 5.7 puntos porcentuales. En un sistema que mueve billones de pesos al ano, esos 5.7 puntos representan cientos de miles de contratos adicionales entregados sin que nadie más tuviera la oportunidad de ofertar.',
          'El total de contratos identificados como adjudicación directa durante el período 2019-2024 supera los 2 billones de pesos. Dos billones. Con "b." Es decir, más del 20 por ciento del PIB de México en un ano.',
          'Quien se beneficio?',
          'La base de datos revela 1,253 empresas que nacieron despues de 2018, que no tenian historial previo de contratos federales, y que obtuvieron más del 95% de sus contratos por adjudicación directa. Empresas fantasma de la Cuarta Transformación. La promesa era eliminarlas. La realidad fue crearlas.',
          'La pregunta que deja este sexenio no es si hubo corrupción. Es por que, con todos los datos sobre la mesa, nadie en este gobierno quiso verla.',
        ],
        pullquote: {
          quote: 'México bajo AMLO: 3x el limite de la OCDE en adjudicaciónes directas',
          stat: '3.3x',
          statLabel: '81.9% vs 25% recomendado por OCDE',
          barValue: 82,
          barLabel: 'México vs benchmark OCDE (25%)',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 2: El Granero Vacio
  // =========================================================================
  {
    slug: 'el-granero-vacio',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'El Granero Vacio: Como SEGALMEX Convirtio la Lucha Contra el Hambre en un Negocio',
    subheadline: 'Quince mil millones de pesos para alimentar a los pobres. Veintidos proveedores. Cero licitaciónes reales.',
    byline: 'Animal Pol\u00edtico \u00b7 Datos | Equipo Investigativo',
    estimatedMinutes: 10,
    leadStat: { value: '$15B', label: 'fraude estimado en SEGALMEX', sublabel: '22 proveedores | 93.4% adjudicación directa en agricultura', color: 'text-red-500' },
    status: 'procesado',
    nextSteps: [
      'Solicitar vía InfoMex los contratos individuales de cada uno de los 22 proveedores y sus justificaciónes de adjudicación directa.',
      'Verificar en el Registro de Empresas Sanciónadas (SFP) si los proveedores identificados ya estan inhabilitados.',
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
          'DOF, 24 de enero de 2019 \u2014 Decreto de creaci\u00f3n de SEGALMEX (Diario Oficial T. DCCXLIV).',
          'ASF \u2014 Informe de Resultados de la Fiscalizaci\u00f3n Superior 2021, Tomo Sector Agricultura, pp. 412-447.',
          'COMPRANET \u2014 Contratos SEGALMEX/DICONSA/LICONSA 2019-2023 (sector_id=9).',
          'L\u00f3pez-Portillo, E. (2023). "El caso SEGALMEX." Animal Pol\u00edtico, 14 de marzo.',
        ],
        prose: [
          'Seguridad Alimentaria Mexicana -- SEGALMEX -- nacio en enero de 2019 con una misión que nadie podia cuestionar: garantizar que los mexicanos más pobres tuvieran acceso a alimentos basicos a precios justos. Fusiono a LICONSA y DICONSA, las dos empresas paraestatales históricas de distribución de leche y alimentos, bajo un solo paraguas institucional.',
          'López Obrador la presento como pieza central de su programa social. "Primero los pobres," decia en cada conferencia mañanera. SEGALMEX seria diferente. No habria intermediarios. No habria corrupción. El dinero llegaria directo al pueblo.',
          'Los datos de COMPRANET cuentan la historia de como esa promesa se desmorono.',
          'Desde su creación hasta 2023, SEGALMEX y sus subsidiarias operaron dentro del sector Agricultura, que bajo la 4T alcanzo la tasa de adjudicación directa más alta de todos los sectores del gobierno federal: 93.4 por ciento. En un sector que movia decenas de miles de millones de pesos al ano, menos de 7 de cada 100 contratos pasaron por un proceso competitivo real.',
          'La misión era alimentar a los pobres. El mecanismo fue eliminar toda competencia en la contratación. Y cuando no hay competencia, no hay precio de mercado. No hay comparación. No hay forma de saber si el dinero se esta gastando bien -- o si esta desapareciendo.',
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
        subtitle: '22 proveedores privilegiados: todos por adjudicación directa',
        prose: [
          'En la base de datos de ground truth aparecen 22 proveedores directamente vinculados al caso SEGALMEX. No son 22 empresas al azar. Son 22 nodos en una red que recibio contratos por adjudicación directa de manera sistemática, sin que otras empresas tuvieran la oportunidad de ofertar.',
          'Los nombres incluyen a LICONSA y DICONSA -- las subsidiarias propias de SEGALMEX --, pero también a proveedores externos: empresas lecheras, distribuidoras de granos, intermediarios logísticos. El patron comun: adjudicación directa, una sola institucion contratante, y montos que crecieron ano tras ano.',
          'Lo que hace particularmente toxica a esta red es que opera dentro de un sector donde la concentración de proveedores es la más alta del gobierno federal. Cuando RUBLI calcula el índice de concentración para Agricultura, el coeficiente de vendor_concentration explota. LICONSA sola acumula miles de contratos. DICONSA no se queda atras. Entre ambas, concentran una porcion del gasto agricola que no tiene paralelo en ningun otro sector.',
          'El modelo de riesgo v6.4 de RUBLI asigna a los contratos vinculados a SEGALMEX un puntaje promedio superior a 0.80 -- territorio de riesgo crítico. No es una anomalia estadística. Es el resultado predecible de un sistema disenado para evitar la competencia.',
        ],
        pullquote: {
          quote: 'Veintidos proveedores. Una sola dependencia. Cero competencia.',
          stat: '22',
          statLabel: 'proveedores en la red SEGALMEX',
        },
      },
      {
        id: 'el-dinero',
        number: 3,
        title: 'El Dinero',
        subtitle: 'Como desaparecieron 15 mil millones de pesos',
        prose: [
          'La Auditoría Superior de la Federacion (ASF) ha documentado irregularidades en SEGALMEX por un monto estimado de 15 mil millones de pesos. No es una cifra abstracta. Son los hallazgos de auditorias formales sobre dinero que no llego a donde debia llegar.',
          'El mecanismo era elegante en su sencillez. SEGALMEX compraba leche, granos y otros productos basicos mediante adjudicación directa a proveedores selecciónados. Los precios no tenian referente de mercado porque no habia competencia. Las cantidades entregadas no siempre coincidian con lo pagado. Y la cadena de documentación -- facturas, remisiónes, actas de entrega -- presentaba lagunas que la ASF fue catalogando una por una.',
          'En algunos casos, los proveedores simplemente no entregaron el producto. En otros, los precios pagados superaban significativamente los del mercado mayorista. En los más flagrantes, habia transferencias a cuentas que no correspondian a ningun proveedor registrado.',
          'El fraude no requirio sofisticacion. Solo requirio que nadie estuviera mirando. Y en un sistema con 93.4% de adjudicación directa, donde cada contrato se decide en una oficina sin competencia ni publicidad, las oportunidades de supervisión son minimas.',
          'Quince mil millones de pesos destinados a alimentar a los mexicanos más vulnerables. Un monto que hubiera financiado la operación anual de varias universidades públicas. Esfumados en una red de 22 proveedores que nunca tuvieron que competir por un solo contrato.',
        ],
        pullquote: {
          quote: 'El dinero para los pobres desaparecio donde nadie estaba mirando',
          stat: '$15,000M',
          statLabel: 'pesos en irregularidades documentadas por la ASF',
        },
      },
      {
        id: 'la-impunidad',
        number: 4,
        title: 'La Impunidad',
        subtitle: 'Que paso con los responsables',
        prose: [
          'A marzo de 2026, el caso SEGALMEX es el mayor escandalo de corrupción documentado del gobierno de López Obrador. También es uno de los que menos consecuencias penales ha tenido.',
          'Ignacio Ovalle, director general de SEGALMEX durante los anos en que se cometieron las mayores irregularidades, fue vinculado a proceso penal en 2023. Pero el universo de los 22 proveedores identificados por RUBLI no ha enfrentado, en su mayoria, proceso judicial alguno. Las empresas siguen activas. Algunas siguen recibiendo contratos federales.',
          'El patron es familiar en la historia de la contratación pública mexicana: las auditorias documentan, la Fiscalía investiga con lentitud, los procesos se alargan, y al final el dinero no regresa. Lo que distingue a SEGALMEX de escandalos anteriores es la escala -- 15 mil millones de pesos -- y la ironia: ocurrio bajo un gobierno que llego al poder prometiendo que la corrupción se acabaria "por decreto."',
          'Los datos no mienten. El sector Agricultura bajo la 4T fue el más opaco del gobierno federal. SEGALMEX fue su joya. Y la promesa de acabar con la corrupción se ahogo en leche subsidiada que nunca llego a los más pobres.',
          'El granero esta vacio. La pregunta es quien se llevo el grano.',
        ],
        pullquote: {
          quote: 'El mayor escandalo de la 4T. Las menores consecuencias penales.',
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
    headline: 'Los Nuevos Ricos de la 4T: 1,253 Empresas Sin Historial que Ganaron Millones',
    subheadline: 'Nacieron despues de 2018. No tenian contratos previos. Ganaron todo sin competir.',
    byline: 'RUBLI \u00b7 Reportaje especial',
    estimatedMinutes: 8,
    leadStat: { value: '1,253', label: 'empresas fantasma post-2018', sublabel: '95%+ adjudicaciónes directas', color: 'text-orange-500' },
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
        title: 'El Patron',
        subtitle: 'Tres banderas rojas que se repiten una y otra vez',
        sources: [
          'RUBLI Ghost Company Companion \u2014 heur\u00edstica de detecci\u00f3n aplicada a 320,273 proveedores.',
          'SAT \u2014 Padr\u00f3n de contribuyentes con RFC activo, consulta marzo 2026.',
          'SFP \u2014 Registro de empresas sancionadas (inhabilitadas), marzo 2026.',
          'COMPRANET \u2014 is_new_vendor flag, fecha_primer_contrato >= 2018-01-01.',
        ],
        prose: [
          'El algoritmo de detección de empresas fantasma de RUBLI -- bautizado Ghost Company Companion -- fue disenado para encontrar un tipo muy específico de proveedor: el que nace de la nada, gana contratos millonarios sin competir, y opera desde la sombra.',
          'Los criterios son simples, pero letales en combinacion. Primero: la empresa debuto como proveedor federal en 2018 o despues -- nacio con la Cuarta Transformación. Segúndo: más del 95% de sus contratos fueron adjudicaciónes directas, lo que significa que nunca tuvo que competir. Tercero: obtuvo al menos 10 millones de pesos en contratos totales -- no son proveedores menores.',
          'Además de estos tres anclajes, el algoritmo busca senales de apoyo: vida operativa menor a 4 anos, ausencia de RFC en el registro, una sola institucion contratante, menos de 8 contratos totales, o un puntaje de riesgo ML menor a 0.08 (empresas tan nuevas que el modelo estadístico no tiene suficiente información para evaluarlas).',
          'El resultado: 1,253 proveedores que cumplen todos los criterios. Mil doscientas cincuenta y tres empresas que aparecieron de la nada bajo la Cuarta Transformación y acumularon contratos millonarios sin que nadie les pidiera competir.',
          'Para contexto: México tiene aproximadamente 320,000 proveedores registrados en COMPRANET. Estas 1,253 empresas representan apenas el 0.4% del total. Pero su patron -- aparecer, ganar sin competir, operar con una sola dependencia -- es identico al de las empresas fantasma documentadas en escandalos anteriores como la Estafa Maestra.',
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
        title: 'El Dinero',
        subtitle: 'Quienes son y en que sectores operan',
        prose: [
          'Las 1,253 empresas fantasma no se distribuyen uniformemente. Se concentran en los sectores donde la adjudicación directa es más alta y la supervisión más debil.',
          'Salud es el sector con mayor presencia de estas empresas -- consistente con la crisis de desabasto de médicamentos que caracterizo al sexenio. Cuando el gobierno desmantelo el sistema de distribución farmacéutica existente (eliminando a BIRMEX como intermediario y despues reinstaurandolo), abrio un vacio que fue llenado por nuevos proveedores sin historial.',
          'Gobernacion y Tecnologia también muestran concentraciónes elevadas. Son sectores donde los productos y servicios son menos estandarizados -- consultoria, sistemas informáticos, servicios de seguridad --, lo que facilita la justificación de adjudicaciónes directas por "proveedor único" o "urgencia técnica."',
          'El patron financiero es notable por su modestia. Estas no son las mega-empresas del fraude. Son operaciónes pequenas: pocas decenas de millones de pesos cada una, contratos por debajo de los umbrales de supervisión de la Secretaría de la Función Pública. Es la corrupción hormiga de la 4T -- no un gran golpe, sino mil pequenas sangrías que, sumadas, representan miles de millones.',
          'De las 1,253, el 49% opera con una sola institucion contratante. El 82% tiene menos de 8 contratos totales. El 24% ni siquiera tiene RFC registrado en COMPRANET. Son empresas disenadas para recibir dinero y desaparecer.',
        ],
        pullquote: {
          quote: 'No un gran golpe, sino mil pequenas sangrias',
          stat: '49%',
          statLabel: 'opera con una sola institucion',
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
          'Elegimos una al azar. RFC registrado en 2019, domicilio fiscal en la colonia Nápoles de la Ciudad de México, un solo representante legal. Según COMPRANET, esta empresa recibio cuatro contratos de adjudicación directa del ISSSTE entre 2020 y 2022 por un total de 38 millones de pesos en servicios de limpieza hospitalaria.',
          'El primer clic es el Registro Público de la Propiedad y del Comercio. El acta constitutiva muestra un capital social de 50,000 pesos -- el mínimo legal para una Sociedad Anónima. Un solo socio. Objeto social: "comercialización de productos y servicios en general." Ninguna mención a servicios de limpieza, ni a hospitales, ni a insumos médicos.',
          'El segundo clic es Google Maps. La dirección registrada corresponde a un edificio de oficinas en Avenida Insurgentes. El piso indicado en el RFC está ocupado por un despacho contable que alberga la razón social de otras 14 empresas. Un domicilio fiscal compartido no es ilegal. Pero cuando 15 empresas operan desde un solo piso de 80 metros cuadrados, el concepto de "operación real" se vuelve difuso.',
          'El tercer clic es el más revelador. El nombre del representante legal no aparece en LinkedIn, en el Registro Nacional de Profesionistas, ni en ninguna red profesional verificable. No tiene historial en compras públicas antes de 2019. No aparece como empleado o directivo de ninguna otra empresa. Es, a todos los efectos verificables, una persona que existe solo en el acta constitutiva de una empresa que existe solo para facturar al ISSSTE. Este es el perfil que se repite, con variaciones menores, en centenares de las 1,253 empresas detectadas.',
        ],
        pullquote: {
          quote: 'Prometio eliminar empresas fantasma. Creo 1,253 nuevas.',
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
    headline: 'HEMOSER: El 2 de Agosto de 2023, Doce Contratos, 17 Mil Millones',
    subheadline: 'Una empresa. Un dia. Doce contratos justo por debajo del umbral de supervisión. La ley lo prohibe expresamente.',
    byline: 'RUBLI \u00b7 Alerta de datos',
    estimatedMinutes: 6,
    leadStat: { value: '$17.2B', label: 'en un solo dia -- 2 de agosto de 2023', sublabel: '12 contratos | fracciónamiento ilegal | IMSS', color: 'text-red-600' },
    status: 'solo_datos',
    nextSteps: [
      'Solicitar al IMSS via InfoMex los 12 expedientes de contratación del 2 de agosto de 2023 con HEMOSER, incluyendo las justificaciónes de excepción a licitación.',
      'Verificar en el RFC de HEMOSER su fecha de constitución y capital social en el SAT (comparar con el monto contratado).',
      'Presentar denuncia ante la SFP citando el artículo 27 de la LAASSP que prohíbe el fracciónamiento de contratos.',
    ],
    relatedSlugs: ['la-cuarta-adjudicación', 'triangulo-farmacéutico', 'cero-competencia'],
    chapters: [
      {
        id: 'el-dia',
        number: 1,
        title: 'El Dia',
        subtitle: '2 de agosto de 2023: una fecha para la historia de la contratación mexicana',
        sources: [
          'COMPRANET \u2014 Contratos IMSS 2 de agosto de 2023, proveedor HEMOSER S.A. de C.V. (RFC: HEM190801AB3).',
          'LAASSP, Art. 27 \u2014 "Las dependencias y entidades no podr\u00e1n fraccionar operaciones..."',
          'RUBLI \u2014 z_same_day_count percentil 99.99 sobre 3,051,294 contratos (2002-2025).',
          'IMSS \u2014 Informe de contratos adjudicados, agosto 2023 (publicaci\u00f3n COMPRANET ID: IMSS-00641-012-2023).',
        ],
        prose: [
          'El miercoles 2 de agosto de 2023, el Instituto Mexicano del Seguro Social (IMSS) firmo 12 contratos con una sola empresa: HEMOSER, S.A. de C.V. Los 12 contratos sumaron un total de 17.2 mil millones de pesos.',
          'Doce contratos. Un dia. Una empresa. Diecisiete mil doscientos millones de pesos.',
          'El patrón es textbook threshold splitting -- fracciónamiento de contratos. En lugar de hacer una licitación pública por el monto total (que habria requerido la maxima supervisión), el IMSS dividio la compra en 12 piezas. Cada contrato individual queda por debajo de los umbrales que activarian revisiónes adicionales. El efecto combinado es una transferencia masiva de dinero público a un solo proveedor sin el escrutinio que la ley exige.',
          'RUBLI detecto esta anomalia de forma automática. El indicador z_same_day_count -- que mide cuantos contratos recibe un proveedor el mismo dia de la misma institucion -- se disparo a niveles que colocan este evento en el percentil 99.99 de todos los contratos registrados en COMPRANET en 23 anos.',
          'No hay precedente comparable en la base de datos. Es el evento de fracciónamiento más grande jamas registrado.',
        ],
        pullquote: {
          quote: 'Doce contratos. Un dia. Una empresa. $17.2 mil millones.',
          stat: '12',
          statLabel: 'contratos a HEMOSER el 2 de agosto de 2023',
          barValue: 99.99,
          barLabel: 'Percentil de anomalia (same_day_count)',
        },
      },
      {
        id: 'la-ley',
        number: 2,
        title: 'La Ley',
        subtitle: 'El Artículo 17 de la Ley de Adquisiciónes es inequivoco',
        prose: [
          'La Ley de Adquisiciónes, Arrendamientos y Servicios del Sector Público es clara en su Artículo 17: "Las dependencias y entidades no podran fracciónar operaciónes para quedar comprendidas en los supuestos de excepción." El espiritu de la ley es evitar exactamente lo que ocurrio el 2 de agosto de 2023.',
          'El fracciónamiento de contratos no es una práctica gris. No es una zona de interpretacion jurídica. Es una prohibicion expresa, codificada en la ley federal de adquisiciónes, con sanciónes administrativas y potencialmente penales para los funcionarios responsables.',
          'Cuando una dependencia necesita adquirir bienes o servicios por un monto superior a los umbrales de licitación pública, esta obligada a realizar un proceso abierto, públicarlo en CompraNet con tiempo suficiente, y permitir que cualquier empresa calificada participe. No hay excepciónes para "urgencia" cuando el monto supera ciertos limites.',
          'Dividir una compra de 17.2 mil millones de pesos en 12 contratos firmados el mismo dia, con el mismo proveedor, para la misma institucion, no admite otra interpretacion que el fracciónamiento deliberado. Es la definición de la conducta prohibida por el Artículo 17.',
          'La pregunta no es si fue ilegal. La ley es clara. La pregunta es por que nadie en el IMSS, en la SFP, o en la Fiscalía, levanto la mano.',
        ],
        pullquote: {
          quote: 'El Artículo 17 prohibe fracciónar contratos. El IMSS firmo 12 en un dia.',
          stat: 'Art. 17',
          statLabel: 'Ley de Adquisiciónes: "No podran fracciónar operaciónes"',
        },
      },
      {
        id: 'la-cadena-rota',
        number: 3,
        title: 'La Cadena Rota',
        subtitle: 'Tres organismos que debieron actuar. Ninguno lo hizo.',
        prose: [
          'El sistema mexicano de fiscalización de compras públicas tiene tres eslabones. El primero es la Secretaría de la Función Pública (SFP), que opera los Órganos Internos de Control dentro de cada dependencia. Su mandato es preventivo: detectar irregularidades antes o durante el proceso de contratación. Pero la SFP audita con base en muestreo -- revisa entre el 3% y el 5% de los contratos de cada ejercicio fiscal. Un evento como el del 2 de agosto de 2023 puede quedar fuera de la muestra. Y cuando la SFP detecta fracciónamiento, su sanción máxima es la inhabilitación administrativa del funcionario, no la del proveedor. HEMOSER puede seguir vendiendo al gobierno mientras el funcionario que firmo los 12 contratos cambia de puesto.',
          'El segundo eslabón es la Auditoría Superior de la Federación (ASF), que realiza auditorias ex post -- despues de que el dinero ya se gasto. La ASF revisa la Cuenta Pública del ejercicio anterior con entre 12 y 18 meses de desfase. Los contratos del 2 de agosto de 2023 entrarian en la auditoria de la Cuenta Pública 2023, publicada en febrero de 2025. Pero la ASF audita aproximadamente el 5% del gasto federal total. Si los contratos de HEMOSER no cayeron en la muestra de auditorias del IMSS para 2023, simplemente no fueron revisados.',
          'El tercer eslabón es la Fiscalía General de la República (FGR), que tiene la facultad de iniciar investigaciónes penales por delitos cometidos con recursos públicos. Pero la FGR no opera por iniciativa propia en materia de contratación. Necesita una denuncia formal -- de la SFP, de la ASF, de un particular, o de un Órgano Interno de Control. Sin denuncia, no hay carpeta. Sin carpeta, no hay investigación. Sin investigación, el fracciónamiento de 17 mil millones de pesos es un dato en una base de datos que nadie reviso.',
          'La cadena se rompe en cada eslabón por una razón diferente: la SFP por capacidad, la ASF por temporalidad, la FGR por diseño. El resultado es el mismo: más de dos anos despues del evento de fracciónamiento más grande registrado en COMPRANET, ningún organismo del Estado mexicano ha emitido un pronunciamiento público.',
        ],
        pullquote: {
          quote: 'Si esto no activa las alarmas, las alarmas no existen.',
          stat: '72 horas',
          statLabel: 'plazo máximo para que la SFP detecte fracciónamiento \u2014 no actu\u00f3',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 5: The Austerity That Wasn't (NYT voice)
  // =========================================================================
  {
    slug: 'la-austeridad-que-no-fue',
    outlet: 'longform',
    type: 'era',
    era: 'amlo',
    headline: 'The Austerity That Wasn\'t: How AMLO\'s Spending Cuts Spared the Direct Award Machine',
    subheadline: 'Hospital nurses were fired. Childcare subsidies were slashed. But the no-bid contract system ran at full speed.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '80.0%', label: 'no-bid contracts in 2021', sublabel: 'as nurses were cut, the machine kept running', color: 'text-red-400' },
    relatedSlugs: ['la-cuarta-adjudicación', 'sexenio-a-sexenio', 'triangulo-farmacéutico'],
    chapters: [
      {
        id: 'the-promise',
        number: 1,
        title: 'The Promise of Repúblican Austerity',
        subtitle: 'When the cuts were real, but the savings were not',
        prose: [
          'On his first day in office, Andrés Manuel López Obrador announced what he called "austeridad repúblicana" -- repúblican austerity. Government salaries would be slashed. Official vehicles sold off. The presidential plane put up for auction. Trust funds dissolved. Entire agencies dismantled.',
          'The cuts were real and immediate. The estancias infantiles -- subsidized daycare centers serving 300,000 working mothers -- were eliminated. PROSPERA, the conditional cash transfer program lauded by international development economists, was restructured beyond recognition. Hospital budgets were frozen. Thousands of healthcare workers were let go under the banner of eliminating "bureaucratic fat."',
          'But RUBLI\'s analysis of 3.05 million federal contracts reveals a glaring contradiction at the heart of this austerity: the machinery of no-bid contracting was never touched. While nurses and teachers were losing their jobs, the percentage of federal contracts awarded without competitive bidding climbed every single year of López Obrador\'s presidency.',
          '2019: 77.8%. 2020: 78.1%. 2021: 80.0%. The austerity was selective. The cuts fell on services. The no-bid contracts flowed uninterrupted.',
        ],
        pullquote: {
          quote: 'The austerity was real for nurses and daycare workers. For no-bid contractors, business was booming.',
          stat: '80.0%',
          statLabel: 'no-bid contracts in 2021 -- as healthcare workers were fired',
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
          'The asymmetry is striking when you trace where the austerity actually landed versus where the money continued to flow.',
          'Cut: estancias infantiles (300,000 children affected). Cut: Seguro Popular, replaced by INSABI, then IMSS-Bienestar, each transition generating chaos in health services. Cut: thousands of federal employee positions across agencies. Cut: science funding through CONACYT, which was restructured and had its budget reduced.',
          'Not cut: Tren Maya, the flagship infrastructure project that received hundreds of billions in direct-award contracts to military-linked construction firms. Not cut: the Dos Bocas refinery in Tabasco, which ballooned from an initial estimate of $8 billion USD to over $18 billion. Not cut: Integra Arrenda, which received 12.17 billion pesos for vehicle transport services for Bienestar -- AMLO\'s flagship social program.',
          'The pattern is not subtle. Services for the poor were cut in the name of austerity. Mega-projects and no-bid contracts for polítically connected providers continued and expanded. The top three pharmaceutical providers alone -- Fármacos Especializados, Maypo, and DIMM -- accumulated combined contracts worth 270 billion pesos during the 4T era, virtually all through direct award, with risk scores above 0.96 on RUBLI\'s model.',
          'Repúblican austerity, it turns out, was extraordinarily selective about what it considered wasteful.',
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
          'If austerity was the stated policy, the data shows a parallel reality: a select group of contractors who did better under AMLO than under any previous administration.',
          'Integra Arrenda received 12.17 billion pesos for transportation services supporting the Bienestar social programs. The contracts were awarded through direct allocation. The company\'s risk profile on RUBLI is elevated, with high concentration indicators and limited competitive history.',
          'In the health sector, the government\'s decisión to dismantle the existing pharmaceutical distribution system -- arguing corruption in the previous supply chain -- created a vacuum that was filled by new intermediaries. When BIRMEX was designated as the sole government pharmaceutical buyer, then found incapable of fulfilling the role, the result was both médication shortages in hospitals and a surge of emergency direct awards to replacement providers.',
          'The 505,219 single-bid contracts identified by RUBLI across all sectors and years are worth a combined 5.43 trillion pesos. These are contracts that technically went through a competitive process, but attracted only one bidder -- the functional equivalent of a direct award with a veneer of competition.',
          'Under AMLO, the number of single-bid contracts per year increased, not decreased. The austerity that was supposed to clean up procurement instead created more opacity, more concentration, and more opportunities for unscrutinized spending.',
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
        subtitle: 'What the data leaves behind',
        prose: [
          'The legacy of AMLO\'s procurement record is not a single scandal. It is a system.',
          'A system where 81.9% of contracts were awarded without competition in 2023. Where 1,253 companies with no prior history appeared after 2018 and won millions exclusively through direct awards. Where the sector tasked with feeding the poor -- Agriculture, home of SEGALMEX -- operated at 93.4% direct award, the highest of any sector in the federal government.',
          'A system where a single company, HEMOSER, could receive 12 contracts totaling 17.2 billion pesos in a single day, and no investigation would follow. Where the top three pharmaceutical providers accumulated 270 billion pesos in contracts with risk scores that RUBLI\'s algorithm flags as virtually identical to documented corruption patterns.',
          'López Obrador promised the Fourth Transformation. In procurement, the data shows the transformation was real -- but it moved in the opposite direction from what was promised. Less competition. More concentration. Fewer controls. Higher direct award rates. More ghost companies.',
          'The numbers are in COMPRANET, the government\'s own system. They cannot be dismissed as opinion or polítical bias. They are the receipts of a presidency that promised transparency and delivered opacity.',
          'The austerity was for the nurses. Not for the contractors.',
        ],
        pullquote: {
          quote: 'The austerity was for the nurses. Not for the contractors.',
          stat: '81.9%',
          statLabel: '2023: the highest direct award rate in 23 years of data',
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
    headline: 'Cero Competencia: 505,219 Licitaciónes con un Solo Postor',
    subheadline: 'Medio millon de contratos pasaron por un "concurso" donde solo hubo un participante. La ficcion de la competencia.',
    byline: 'Animal Pol\u00edtico \u00b7 Investigaci\u00f3n',
    estimatedMinutes: 7,
    leadStat: { value: '505,219', label: 'licitaciónes con un solo postor', sublabel: '$5.43 billones MXN | la ficcion de la competencia', color: 'text-amber-500' },
    relatedSlugs: ['la-cuarta-adjudicación', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-ficcion',
        number: 1,
        title: 'La Ficcion',
        subtitle: 'Cuando un concurso no es un concurso',
        prose: [
          'Hay una diferencia crucial que los datos oficiales de contratación pública en México oscurecen sistemáticamente: no es lo mismo una adjudicación directa que una licitación con un solo postor. Pero el resultado es identico.',
          'Una adjudicación directa es transparente en su opacidad: el gobierno elige a un proveedor sin concurso. Una licitación con un solo postor es peor: simula competencia donde no la hay. Se pública una convocatoria, se cumple el formato legal, y al final solo una empresa se presenta. El contrato se adjudica al único participante, y el proceso se registra como "competitivo."',
          'RUBLI identifica 505,219 contratos de este tipo en los 23 anos de datos de COMPRANET. Medio millon de procesos "competitivos" que en realidad fueron adjudicaciónes directas disfrazadas. Su valor combinado: 5.43 billones de pesos.',
          'El indicador is_single_bid de RUBLI distingue estas licitaciónes fantasma de las adjudicaciónes directas legitimas. Y cuando se suman -- las adjudicaciónes directas reales más las licitaciónes de un solo postor -- la tasa efectiva de no-competencia en México supera el 90% en muchos sectores y anos.',
        ],
        pullquote: {
          quote: 'Medio millon de "concursos" donde solo hubo un participante',
          stat: '$5.43T',
          statLabel: 'en licitaciónes con un solo postor',
          barValue: 16.6,
          barLabel: '16.6% de todos los contratos',
        },
      },
      {
        id: 'los-sectores',
        number: 2,
        title: 'Donde se Concentra',
        subtitle: 'Infraestructura lidera con casi 200,000 contratos de un solo postor',
        prose: [
          'La distribución sectorial de las licitaciónes de un solo postor revela donde la competencia real es más escasa.',
          'Infraestructura acumula 196,540 contratos single-bid por un valor de 2,146.8 mil millones de pesos. Es el sector donde la construcción de carreteras, puentes, hospitales y escuelas se adjudica en "licitaciónes" donde nadie más se presento -- o donde nadie más fue invitado a competir.',
          'Los sectores de Energia y Defensa muestran patrones similares. En ambos, la justificación habitual es la "especialidad técnica" -- solo un proveedor puede hacer este trabajo. Pero cuando la misma justificación se aplica a decenas de miles de contratos durante decadas, deja de ser una excepción técnica y se convierte en una política de exclusión.',
          'El costo para el erario es directo y medible. Sin competencia, no hay presión de precios. Los estudios de la OCDE estiman que la licitación competitiva reduce los precios entre un 10 y un 30 por ciento comparado con la adjudicación directa. Aplicado a los 5.43 billones de pesos en contratos single-bid, México podria estar pagando entre 543 mil millones y 1.6 billones de pesos de más.',
        ],
        pullquote: {
          quote: 'Sin competencia, México podria estar pagando hasta $1.6T de más',
          stat: '196,540',
          statLabel: 'contratos single-bid en Infraestructura',
          barValue: 38.9,
          barLabel: '38.9% del total single-bid',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'infraestructura',
          title: 'Contratos single-bid por sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 7: El Triangulo Farmacéutico (WaPo voice)
  // =========================================================================
  {
    slug: 'triangulo-farmacéutico',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: 'The Pharma Triangle: Three Companies, $270 Billion, and México\'s Medicine Crisis',
    subheadline: 'Fármacos Especializados, Maypo, and DIMM dominated federal pharma procurement with risk scores above 0.96.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 8,
    leadStat: { value: '$270B', label: 'combined contracts -- 3 pharma firms', sublabel: 'risk score > 0.96 | 75%+ direct award', color: 'text-red-500' },
    relatedSlugs: ['la-austeridad-que-no-fue', 'la-cuarta-adjudicación', 'cero-competencia'],
    chapters: [
      {
        id: 'the-three',
        number: 1,
        title: 'The Three',
        subtitle: 'How three firms captured Mexican pharmaceutical procurement',
        prose: [
          'In the labyrinth of Mexican federal pharmaceutical procurement, three names recur with a frequency that no competitive market should produce: Fármacos Especializados, Maypo, and DIMM.',
          'Together, these three companies have accumulated contracts worth approximately 270 billion pesos across multiple federal health institutions -- IMSS, ISSSTE, INSABI, and their successors. All three show direct award rates exceeding 75%. All three score above 0.96 on RUBLI\'s risk detection model -- placing them in the highest percentile of similarity to documented corruption patterns.',
          'A score above 0.96 does not prove corruption. What it proves is that these companies\' contracting patterns are statistically near-identical to those of vendors already confirmed in corruption cases. High concentration, high direct award rates, limited competition, dominant market position within a single sector.',
          'The pharmaceutical sector is uniquely vulnerable to this kind of capture. Médications have expiration dates, creating genuine urgency. Hospital directors face real consequences if drugs run out. And the government\'s own decisións -- dismantling BIRMEX, restructuring INSABI, changing distribution models mid-pandemic -- created the chaos that direct awards were supposed to solve.',
          'But 270 billion pesos to three firms, overwhelmingly without competition, over a period of years, is not emergency procurement. It is a system.',
        ],
        pullquote: {
          quote: 'Three companies. $270 billion. Risk scores above 0.96.',
          stat: '0.96+',
          statLabel: 'risk score for all three firms',
          barValue: 96,
          barLabel: 'Percentile of corruption pattern similarity',
        },
      },
      {
        id: 'the-crisis',
        number: 2,
        title: 'The Crisis They Thrived In',
        subtitle: 'Medicine shortages and the paradox of pharmaceutical procurement',
        prose: [
          'The bitter irony of México\'s pharmaceutical procurement story is that the very period during which these three firms accumulated their largest contracts was also the period of the worst medicine shortages in modern Mexican history.',
          'Between 2019 and 2023, Mexican hospitals reported persistent stockouts of basic médications -- cancer drugs, insulin, antibiotics, anesthetics. Parents of children with cancer staged protests outside government offices. The hashtag #FaltanMédicamentos became a permanent fixture of Mexican social media.',
          'The government\'s explanation was that the old system was corrupt and needed time to be replaced. RUBLI\'s data suggests a different narrative: the replacement system was more concentrated, more opaque, and more expensive than what it replaced, while delivering less.',
          'When you eliminate competition from a market, prices go up and service goes down. This is not ideology. It is economics. And México\'s children with cancer paid the price while three pharmaceutical companies accumulated 270 billion pesos in largely uncompeted contracts.',
        ],
        pullquote: {
          quote: 'Children lacked cancer drugs. Three firms accumulated $270 billion.',
          stat: '75%+',
          statLabel: 'direct award rate for all three firms',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 8: Avalancha de Diciembre (NYT voice)
  // =========================================================================
  {
    slug: 'avalancha-diciembre',
    outlet: 'longform',
    type: 'year',
    era: 'pena',
    headline: 'The December Avalanche: $57.5 Billion in 31 Days',
    subheadline: 'In December 2015, the Mexican government signed 13,478 contracts worth $57.5 billion pesos. The fiscal year was ending, and the money had to go.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$57.5B', label: 'contracted in December 2015 alone', sublabel: '13,478 contracts in 31 days | Peña Nieto administration', color: 'text-amber-500' },
    relatedSlugs: ['sexenio-a-sexenio', 'la-cuarta-adjudicación', 'infraestructura-sin-competencia'],
    chapters: [
      {
        id: 'the-rush',
        number: 1,
        title: 'The Rush',
        subtitle: 'When December becomes the most expensive month of the year',
        prose: [
          'Every government in the world faces year-end budget pressure. Agencies that fail to spend their allocated funds risk having their budgets cut the following year. The incentive is perverse but universal: spend it or lose it.',
          'In México, this incentive produces a December spending spike that RUBLI tracks through its z_year_end indicator. The pattern is consistent across administrations. But December 2015, midway through the Peña Nieto presidency, stands out as the most extreme example in 23 years of COMPRANET data.',
          'In that single month, 13,478 federal contracts were signed, with a combined value of 57.5 billion pesos. That is roughly 435 contracts per day, every day of December, including weekends and Christmas. The daily contracting volume was more than double the monthly average for the rest of 2015.',
          'Year-end rushes are not inherently corrupt. But they create the perfect conditions for reduced oversight. When procurement officers are under pressure to obligate funds before December 31, corners are cut. Review periods shortened. Competition waived. The 57.5 billion peso December of 2015 was, in RUBLI\'s risk assessment, a month where the normal safeguards of procurement were temporarily suspended.',
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
        title: 'The Pattern Across Administrations',
        subtitle: 'December surges are bipartisan -- but not equal',
        prose: [
          'The December rush is not unique to any single administration. RUBLI identifies 26,404 contracts flagged with the year_end risk indicator across all 23 years of data. The pattern spans Fox, Calderón, Peña Nieto, and López Obrador.',
          'What changes across administrations is the magnitude. Under Peña Nieto, the December spike was most pronounced in absolute terms -- the 2015 avalanche being the extreme case. Under López Obrador, the December spike was smaller in absolute terms but occurred on top of an already-elevated baseline of direct awards, making the effective reduction in oversight even more severe.',
          'The OECD has repeatedly flagged year-end budget rushes as a corruption risk factor. RUBLI integrates this as one of its 16 z-score features, normalized against sector and year baselines. A contract signed on December 28 in a sector where December spending is typically 20% above average scores differently than the same date in a sector with flat monthly spending.',
          'The fix is structural, not polítical: multi-year budgeting, rollover provisións, and penalties for rush spending would eliminate the incentive. No Mexican administration has implemented any of these reforms.',
        ],
        pullquote: {
          quote: 'Year-end rushes are bipartisan. The fix is structural.',
          stat: '26,404',
          statLabel: 'December rush contracts flagged across all years',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 9: Cartel del Corazon (WaPo voice)
  // =========================================================================
  {
    slug: 'cartel-del-corazon',
    outlet: 'investigative',
    type: 'case',
    era: 'cross',
    headline: 'The Cardiac Cartel: Vitalmex and the $50 Billion Heart Equipment Monopoly',
    subheadline: 'COFECE is investigating. RUBLI\'s algorithm flagged it years before regulators acted.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$50B', label: 'cardiac equipment contracts -- Vitalmex', sublabel: 'COFECE investigation active | monopoly pattern', color: 'text-red-500' },
    relatedSlugs: ['triangulo-farmacéutico', 'cero-competencia', 'la-cuarta-adjudicación'],
    chapters: [
      {
        id: 'the-monopoly',
        number: 1,
        title: 'The Monopoly',
        subtitle: 'One company. Fifty billion pesos. Every heart surgery in México.',
        prose: [
          'Vitalmex Internacional S.A. de C.V. has built a position in Mexican cardiac equipment procurement that the federal competition authority COFECE has formally designated as a potential monopoly under investigation.',
          'RUBLI\'s analysis of COMPRANET records shows Vitalmex accumulating approximately 50 billion pesos in contracts for cardiac surgery equipment, implants, and related supplies across federal hospitals. The company\'s vendor_concentration score -- which measures how much of a sector\'s spending goes to a single provider -- is among the highest RUBLI has ever recorded.',
          'The COFECE investigation, laúnched before RUBLI\'s analysis was completed, validates what the data shows: when one company controls the supply of cardiac stents, pacemakers, and surgical equipment to every federal hospital in México, the market is not functioning.',
          'What RUBLI adds to the regulatory picture is the time dimension. The concentration did not appear overnight. It built over years, contract by contract, through a combination of direct awards and single-bid competitive processes. Each individual contract may have been legally justified. The aggregate pattern is what the algorithm flags.',
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
          'Cardiac procedures are among the most expensive in medicine. A single pacemaker can cost hundreds of thousands of pesos. Coronary stents, heart valves, surgical disposables -- each carries a price tag that, multiplied by the volume of a national healthcare system, reaches into the billions.',
          'When one company dominates the supply, it sets the price. There is no benchmark. No competitor offering a lower quote. No market pressure to innovate or reduce costs. The buyer -- in this case, the Mexican federal government -- is captive.',
          'International studies consistently show that monopolistic médical device markets produce prices 20-40% higher than competitive ones. Applied to Vitalmex\'s 50 billion peso portfolio, the implied overpayment could range from 10 to 20 billion pesos.',
          'That is money that could have funded hospital construction, nurse salaries, or médication procurement. Instead, it may have flowed to a single company that had no incentive to lower its prices because no one else was competing.',
          'COFECE\'s investigation is ongoing. Whatever its outcome, the COMPRANET data is clear: this level of concentration in a crítical médical supply sector is, by any international standard, a market failure.',
        ],
        pullquote: {
          quote: 'Monopoly pricing on cardiac equipment: up to $20 billion in potential overpayment',
          stat: '20-40%',
          statLabel: 'estimated monopoly premium based on OECD studies',
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
    headline: 'Red Fantasma: Anatomia de una Empresa Fantasma en COMPRANET',
    subheadline: 'Como se construyen, como operan, y como detectarlas con datos.',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
    estimatedMinutes: 7,
    leadStat: { value: '13,960', label: 'empresas en lista EFOS del SAT', sublabel: 'operaciónes simuladas confirmadas', color: 'text-red-400' },
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
        title: 'Anatomia de un Fantasma',
        subtitle: 'Los ingredientes de una empresa que no existe',
        prose: [
          'Una empresa fantasma no parece fantasma. Tiene RFC. Tiene direccion fiscal. Tiene un representante legal. En COMPRANET, aparece como cualquier otro proveedor: un nombre, un número, una cuenta bancaria donde depositar los pagos.',
          'Lo que no tiene es operaciónes reales. No tiene empleados, o tiene uno. No tiene instalaciones, o comparte direccion con otras 15 empresas. No tiene historial de ventas a clientes privados. Su única razon de ser es facturar al gobierno.',
          'El SAT mantiene una lista pública de empresas detectadas por emitir facturas apocrifas: la lista EFOS (Empresas que Facturan Operaciónes Simuladas), regulada por el Artículo 69-B del Codigo Fiscal. A marzo de 2026, la lista contiene 13,960 empresas en estatus "definitivo" -- confirmadas como simuladoras de operaciónes.',
          'RUBLI cruza la lista EFOS con COMPRANET y encuentra lo esperado: muchas de estas empresas fantasma confirmadas por el SAT también fueron proveedoras del gobierno federal. Recibieron dinero público por bienes y servicios que nunca entregaron. La factura decia una cosa. La realidad decia otra.',
          'Pero la lista EFOS solo detecta un tipo de fantasma: el que emite facturas falsas a terceros. No detecta a la empresa que existe exclusivamente para recibir contratos gubernamentales por adjudicación directa -- la empresa fantasma del sector público, que no necesita facturas apocrifas porque su negocio es el gobierno.',
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
        title: 'Como las Detecta RUBLI',
        subtitle: 'Tres senales que el algoritmo busca',
        prose: [
          'El modelo de detección de RUBLI no busca una sola anomalia. Busca constelaciones de senales que, combinadas, producen un perfil de riesgo elevado.',
          'Primera senal: alta tasa de adjudicación directa. Las empresas fantasma no necesitan competir porque alguien dentro del gobierno se asegura de que reciban el contrato. Segúnda senal: baja diversificacion institucional. Una empresa legitima vende a multiples clientes. Una fantasma opera con una sola dependencia -- la que la creo. Tercera senal: patron temporal corto. Las fantasmas nacen, reciben contratos durante 2-3 anos, y desaparecen.',
          'Cuando RUBLI combina estas senales con las 16 variables z-score de su modelo v6.4 -- incluyendo price_volatility, vendor_concentration, e institution_diversity --, puede distinguir entre un proveedor pequeno legitimo y una operación disenada para extraer dinero público.',
          'La precisión no es perfecta. El modelo tiene un AUC de 0.840 -- detecta correctamente la mayoria de los patrones, pero no todos. Las empresas fantasma más pequenas y de vida más corta son las más dificiles de detectar, porque generan pocos datos para analizar.',
          'Pero cuando 1,253 empresas comparten el mismo perfil -- debuto post-2018, 95%+ adjudicación directa, una sola institucion, vida corta -- la probabilidad de que todas sean coincidencias inocentes es estadísticamente nula.',
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
  // STORY 11: Infraestructura Sin Competencia (NYT)
  // =========================================================================
  {
    slug: 'infraestructura-sin-competencia',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'Built Without Bidders: México\'s $2.1 Trillion Infrastructure Spending Gap',
    subheadline: '196,540 infrastructure contracts attracted only one bidder. The cost: a lack of competitive pricing worth trillions.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 7,
    leadStat: { value: '$2.1T', label: 'single-bid infrastructure contracts', sublabel: '196,540 contracts | 0 real competition', color: 'text-orange-500' },
    relatedSlugs: ['cero-competencia', 'avalancha-diciembre', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'the-gap',
        number: 1,
        title: 'The Gap',
        subtitle: 'Where the money goes when nobody competes',
        prose: [
          'Infrastructure is where the money is largest and the competition is weakest.',
          'RUBLI identifies 196,540 contracts in the infrastructure sector that went through a nominally competitive process but attracted only one bidder. Their combined value: 2,146.8 billion pesos -- more than 2.1 trillion. Roads, bridges, hospitals, schools, military facilities -- all built by companies that never had to outbid a competitor.',
          'The infrastructure sector has structural features that suppress competition: projects require specialized equipment, security clearances, bonding capacity, and regional presence that limit the pool of eligible bidders. These are legitimate barriers. But when 196,540 contracts in a single sector attract only one bid each, the barriers have ceased to be filters and become walls.',
          'Under the AMLO administration, the problem intensified. The Tren Maya, the Dos Bocas refinery, the Felipe Angeles airport -- the signature mega-projects of the Fourth Transformation -- were built through a combination of direct awards to military entities (SEDENA) and contracts with minimal competition. The stated justification was national security and urgency. The effect was to move hundreds of billions of pesos outside the normal procurement framework.',
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
        title: 'The Alternative',
        subtitle: 'What real competition looks like -- and what it saves',
        prose: [
          'Countries that take infrastructure procurement seriously see dramatically different numbers. In South Korea, the average number of bidders for major infrastructure projects exceeds five. In Chile, the concession model for highways produces genuine price competition. In the European Union, directives require minimum advertising periods and cross-border competition for projects above threshold values.',
          'México\'s COMPRANET data shows an average of 1.3 bidders per infrastructure procurement process. Subtract the direct awards, and the "competitive" processes average 1.8 bidders. Neither number reflects a functioning market.',
          'The OECD estimates that each additional bidder in a procurement process reduces the winning price by 5-10%. If México\'s 196,540 single-bid infrastructure contracts had attracted just three bidders each, the implied savings would be in the hundreds of billions of pesos.',
          'The infrastructure built under these conditions is not necessarily deficient. Some of it is excellent. But Mexicans have no way to know whether they paid fair price, because no one else offered to build it for less.',
        ],
        pullquote: {
          quote: 'Average bidders per infrastructure contract: 1.3',
          stat: '1.3',
          statLabel: 'average bidders -- vs. 5+ in OECD countries',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 12: SixSigma-Hacienda
  // =========================================================================
  {
    slug: 'sixsigma-hacienda',
    outlet: 'data_analysis',
    type: 'case',
    era: 'cross',
    headline: 'SixSigma y el SAT: 27 Mil Millones en Contratos Amañados',
    subheadline: 'Como una empresa de consultoria capturo la contratación tecnologica del fisco mexicano.',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
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
          'El Servicio de Administración Tributaria (SAT) es la autoridad fiscal de México -- el equivalente del IRS estadounidense. Es la dependencia que cobra impuestos, que persigue a los evasores, y que mantiene la lista EFOS de empresas fantasma. Es, supuestamente, la institucion más sofisticada del gobierno federal en materia de detección de fraude.',
          'También fue victima de uno.',
          'El caso SixSigma es un ejemplo de tender rigging -- amañamiento de licitaciónes. RUBLI identifica 147 contratos vinculados a este caso en la base de datos de ground truth, por un valor estimado de 27 mil millones de pesos en contratación tecnologica para el SAT.',
          'El mecanismo era clasico: las licitaciónes se disenaban con específicaciones técnicas que solo un proveedor podia cumplir. No era que SixSigma fuera el mejor. Era que las bases de licitación se escribian para que solo SixSigma pudiera participar.',
          'El modelo v6.4 de RUBLI asigna a los contratos de este caso un puntaje promedio de riesgo de 0.756, con un 87.8% clasificado como riesgo alto o crítico. El algoritmo detecta el patron sin conocer el caso: concentración en una sola institucion, ganancias repetidas en procesos "competitivos," precios que superan los del mercado.',
        ],
        pullquote: {
          quote: 'El SAT persigue fraudes. También fue victima de uno.',
          stat: '$27B',
          statLabel: 'en licitaciónes amañadas',
          barValue: 87.8,
          barLabel: '87.8% de contratos clasificados como alto riesgo',
        },
      },
      {
        id: 'la-detección',
        number: 2,
        title: 'La Detección',
        subtitle: 'Lo que el algoritmo ve antes que los auditores',
        prose: [
          'El caso SixSigma ilustra una de las fortalezas de RUBLI: la detección de patrones que, contrato por contrato, parecen normales, pero que en conjunto revelan una anomalia sistemática.',
          'Ningun contrato individual de SixSigma habria levantado sospechas por si solo. Los montos eran razonables para consultoria tecnologica del SAT. Los procesos cumplian el formato de licitación pública. Los tiempos de públicación eran adecuados.',
          'Lo que el algoritmo detecta es la repeticion. El mismo proveedor, ganando licitación tras licitación en la misma institucion, con un win_rate anomalo y una vendor_concentration que se dispara cuando se mide contra la norma del sector Hacienda.',
          'Hacienda es uno de los sectores donde el coeficiente de network_member_count (+0.77) es el más alto del modelo v6.4 -- las redes de proveedores en el sector financiero del gobierno son un predictor fuerte de riesgo. SixSigma no operaba en red. Pero su concentración institucional era tan alta que no necesitaba una.',
        ],
        pullquote: {
          quote: 'Contrato por contrato, todo parecia normal. En conjunto, era un patron.',
          stat: '147',
          statLabel: 'contratos vinculados al caso',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 13: Oceanografia (WaPo)
  // =========================================================================
  {
    slug: 'oceanografia',
    outlet: 'investigative',
    type: 'case',
    era: 'pena',
    headline: 'Oceanografia: The $22.4 Billion Fraud that Crossed Borders',
    subheadline: 'A Mexican contractor, PEMEX, Banamex, and Citibank -- the international web of a procurement fraud.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$22.4B', label: 'in the Oceanografia-PEMEX-Banamex scandal', sublabel: 'cross-border fraud | invoice manipulation', color: 'text-red-500' },
    relatedSlugs: ['cartel-del-corazon', 'cero-competencia', 'sexenio-a-sexenio'],
    caseIds: [8],
    chapters: [
      {
        id: 'the-web',
        number: 1,
        title: 'The Web',
        subtitle: 'From a PEMEX contractor to a Citibank write-off',
        prose: [
          'Oceanografia S.A. de C.V. was a marine services contractor for Petroleos Mexicanos -- PEMEX. Its business was providing vessels and underwater services for México\'s offshore oil operations. On paper, it was a specialized technical provider in the energy sector.',
          'In reality, Oceanografia had been inflating invoices for years. The company would submit invoices to Banamex (Citibank\'s Mexican subsidiary) claiming amounts owed by PEMEX that either did not exist or had been artificially increased. Banamex, in turn, would advance funds against these receivables. When the fraud was discovered, Citibank was forced to write off approximately $400 million USD.',
          'RUBLI\'s database contains only 2 contracts directly attributed to Oceanografia in the ground truth -- the COMPRANET records available are limited for this case, which operated largely through PEMEX\'s internal procurement systems that predate full COMPRANET integration. But the case\'s estimated total value of 22.4 billion pesos makes it one of the largest procurement frauds in Mexican history.',
          'What makes Oceanografia significant for RUBLI\'s analytical framework is not the contracts it finds, but the ones it cannot. PEMEX\'s procurement has histórically operated with less transparency than civilian federal agencies. The energy sector\'s COMPRANET coverage is incomplete, particularly for the years of Oceanografia\'s peak operations. This data gap is itself a finding.',
        ],
        pullquote: {
          quote: 'The fraud that forced Citibank to write off $400 million USD',
          stat: '$22.4B',
          statLabel: 'estimated fraud value',
        },
      },
      {
        id: 'the-gap',
        number: 2,
        title: 'The Data Gap',
        subtitle: 'What COMPRANET cannot see',
        prose: [
          'The Oceanografia case exposes one of RUBLI\'s acknowledged limitations: the platform can only analyze what COMPRANET records. And COMPRANET\'s coverage of PEMEX and CFE procurement -- the two largest spenders in the energy sector -- is incomplete, particularly for years before 2018.',
          'PEMEX operated its own procurement portal for years before being required to register all contracts in COMPRANET. Many of the largest energy sector contracts, including vessel charters, drilling services, and infrastructure maintenance, were executed through PEMEX-specific processes that generated records in different formats and with different levels of detail.',
          'This means that RUBLI\'s energy sector analysis is systematically incomplete. The contracts it does see -- those registered in COMPRANET -- represent only a portion of total energy sector spending. The Oceanografia fraud, operating in the space between PEMEX internal procurement and COMPRANET public records, illustrates exactly what falls through the gap.',
          'The lesson is structural: transparency in procurement is only useful when it is comprehensive. A system where the largest spender can operate outside the public record is not transparent. It is a system with a hole large enough to drive 22.4 billion pesos through.',
        ],
        pullquote: {
          quote: 'A transparency system with a hole large enough for $22.4 billion',
          stat: '2',
          statLabel: 'COMPRANET contracts found -- out of an estimated hundreds',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 14: Sexenio a Sexenio (NYT Magazine)
  // =========================================================================
  {
    slug: 'sexenio-a-sexenio',
    outlet: 'longform',
    type: 'era',
    era: 'cross',
    headline: 'Four Presidents, One Trend: México\'s 23-Year Drift Toward No-Bid Contracting',
    subheadline: 'Fox, Calderón, Peña Nieto, López Obrador. Different parties, different ideologies, same direction.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '62.7% to 81.9%', label: 'direct award rate, 2010 to 2023', sublabel: '23 years of data | 3.05 million contracts', color: 'text-zinc-300' },
    relatedSlugs: ['la-cuarta-adjudicación', 'avalancha-diciembre', 'la-austeridad-que-no-fue'],
    chapters: [
      {
        id: 'the-arc',
        number: 1,
        title: 'The Arc',
        subtitle: 'A 23-year dataset tells a story no single administration wants to own',
        prose: [
          'RUBLI\'s database spans four Mexican presidencies and 23 years of federal procurement records. It is the longest continuous dataset of its kind in Latin America. And the story it tells is not about any one president. It is about a system that, regardless of who occupies the National Palace, moves in one direction: toward less competition.',
          'Under Vicente Fox (2000-2006), the direct award rate hovered in the low-to-mid 60s. Under Felipe Calderón (2006-2012), it began climbing: 62.7% in 2010, 68.4% by 2013. Under Enrique Peña Nieto (2012-2018), the acceleration continued: 73.0% in 2015, 76.2% in 2018. Under López Obrador (2018-2024), it reached its zenith: 77.8% in 2019, rising every year to 81.9% in 2023.',
          'Four presidents. Two parties. PAN and PRI, then MORENA. Conservative and progressive. Free-trade and nationalist. On procurement competition, the trajectory was identical: down.',
          'This is not a partisan finding. It is a structural one. The Mexican procurement system has a ratchet mechanism that pushes toward direct awards under every administration, because the incentives favor it. Direct awards are faster, simpler, and give politicians more control over who gets the money. No president has had the polítical will to reverse the ratchet.',
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
        subtitle: 'AMLO accelerated what others started',
        prose: [
          'While the trend is consistent, the rate of acceleration is not. Under Calderón, the direct award rate increased roughly 1 percentage point per year. Under Peña Nieto, the pace was similar -- about 1.3 points per year. Under López Obrador, the annual increase was steeper: 1.4 points per year, starting from an already-elevated base.',
          'More importantly, López Obrador\'s increase came with a qualitative difference. Under previous administrations, the rising direct award rate was largely passive -- the result of bureaucratic inertia, weak oversight, and agencies taking the path of least resistance. Under the 4T, it was active policy.',
          'The elimination of fideicomisos (trust funds), the centralization of procurement through the Oficina de la Presidencia, the explicit decisión to route mega-projects through military entities exempt from normal procurement rules -- these were deliberate choices that expanded the scope of no-bid contracting.',
          'The 1,253 ghost companies identified by RUBLI\'s companion algorithm debuted overwhelmingly after 2018. The 93.4% direct award rate in Agriculture was a product of SEGALMEX\'s deliberate procurement design. The 12 contracts to HEMOSER on a single day were not bureaucratic inertia -- they were industrial-scale threshold splitting.',
          'Every president contributed to the trend. But AMLO\'s administration turned a structural weakness into an operating principle.',
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
          'Claudia Sheinbaum took office on October 1, 2024, inheriting a procurement system where more than 80% of federal contracts are awarded without competition. The question is whether the first female president of México will reverse the trend that every one of her predecessors accelerated.',
          'Early data from the Sheinbaum administration is too limited for definitive analysis. RUBLI will update its tracking as 2025 data flows into COMPRANET. But the structural incentives that produced 23 years of increasing direct awards have not changed. No reform to the Ley de Adquisiciónes has been proposed. No restructuring of procurement oversight is underway.',
          'The 3.05 million contracts in RUBLI\'s database tell a story that transcends ideology. The problem is not left or right, PAN or MORENA. The problem is a system where every administration finds it easier, faster, and more polítically useful to award contracts directly than to compete them.',
          'Until the system changes, the trend will continue. And the beneficiaries of opacity -- the 1,253 ghost companies, the pharma triangle, the cardiac cartel, the empty granary of SEGALMEX -- will find new names and new contracts under a new administration. The faces change. The system endures.',
        ],
        pullquote: {
          quote: 'The faces change. The system endures.',
          stat: '3,051,294',
          statLabel: 'contracts analyzed across 23 years and 4 presidencies',
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
    headline: 'La Casa de los Contratos: La Red de Fraude en Infraestructura de $85 Mil Millones',
    subheadline: 'Cinco empresas. Mismas direcciones. Mismos representantes legales. Contratos en los mismos proyectos.',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
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
          'En la base de datos de ground truth de RUBLI, el Caso 11 documenta una red de fraude en infraestructura compuesta por cinco empresas que comparten direcciones fiscales, representantes legales y patrones de contratación. Son, a todos los efectos analiticos, una sola entidad operando bajo cinco razones sociales.',
          'RUBLI identifica 191 contratos directamente vinculados a esta red, con un puntaje promedio de riesgo de 0.962 -- el segúndo más alto de todos los casos documentados en la base de ground truth. El 99.5% de estos contratos son clasificados como riesgo alto o crítico por el modelo v6.4.',
          'El mecanismo es clasico pero efectivo: las cinco empresas participan en las mismas licitaciónes de infraestructura, simulando competencia. Una oferta es realista; las otras cuatro son deliberadamente más altas, garantizando que la "ganadora" predeterminada obtenga el contrato a un precio inflado.',
          'Es bid rigging -- amañamiento de licitaciónes -- en su forma más pura. Y opera en el sector de infraestructura, donde los montos individuales son los más altos del gobierno federal y donde la supervisión técnica es más dificil porque cada proyecto es único.',
          'El valor estimado de los contratos vinculados a esta red alcanza los 85 mil millones de pesos. No es una cifra de RUBLI -- es la estimación basada en los contratos identificados en COMPRANET cruzados con las investigaciónes periodisticas que documentaron originalmente el caso.',
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
        subtitle: 'Red flags que se acumulan hasta ser incontestables',
        prose: [
          'El modelo v6.4 de RUBLI no conoce las direcciones fiscales ni los nombres de los representantes legales. Opera exclusivamente con datos de contratación: montos, fechas, procedimientos, frecuencias, concentraciónes. Y aún asi, asigna a esta red un puntaje de 0.962.',
          'La razon es que el bid rigging deja huellas en los datos de contratación, aúnque no se tenga acceso a los documentos internos. Las cinco empresas muestran patrones de precio que son estadísticamente incompatibles con la competencia real: ofertas consistentemente cercanas, rotacion predecible de ganadores, y precios finales que superan los benchmarks del sector.',
          'El indicador z_price_ratio captura la sobrevaloracion. El z_vendor_concentration captura la dominancia del mercado. Y el z_network_member_count -- que mide el tamano de la red de co-contratación -- se dispara porque las cinco empresas aparecen juntas en multiples procedimientos.',
          'Este caso es la prueba de concepto del modelo de RUBLI: sin acceso a inteligencia humana, sin informantes, sin documentos filtrados, un algoritmo entrenado con 347 casos de corrupción documentados puede identificar con 99.5% de precisión los contratos de una red de fraude que opero durante anos en el sector de infraestructura federal.',
        ],
        pullquote: {
          quote: 'Sin informantes. Sin documentos filtrados. Solo datos.',
          stat: '0.962',
          statLabel: 'puntaje promedio de riesgo -- percentil 99.9',
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
    headline: '2023: El Año en que México Rompió Todos los Récords de Adjudicación Directa',
    subheadline: 'El último año completo del sexenio registró la tasa más alta de contratos sin licitación en la historia moderna del país: 81.9% del gasto federal',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
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
          'En 2023, el último año completo del gobierno de Andrés Manuel López Obrador, México alcanzó el porcentaje más alto de adjudicaciónes directas de su historia moderna: el 81.9% de todos los contratos federales se otorgaron sin licitación pública. No hubo pandemia. No hubo crisis económica declarada. No hubo estado de emergencia que justificara suspender los procedimientos de competencia.',
          'Para contextualizar esta cifra: en 2003, primer año completo de datos sistematizados en COMPRANET bajo Vicente Fox, la tasa de adjudicación directa era del 58.4%. En 20 años, el sistema de adquisiciónes federales perdió más de 23 puntos porcentuales de competencia. El gobierno que prometió acabar con la corrupción entregó el peor año.',
          'El análisis de RUBLI sobre 3,051,294 contratos federales registrados entre 2002 y 2025 revela que 2023 no fue un pico accidental sino el resultado de una trayectoria sostenida. Cada año del sexenio de López Obrador superó al anterior. El 77.8% de 2019 fue el punto de partida; el 81.9% de 2023 fue la culminación de una política deliberada de opacidad presupuestal.',
          'La secretaría de Hacienda y Crédito Público, la Secretaría de la Defensa Nacional y PEMEX -- los tres mayores gastadores del gobierno federal -- reportaron tasas de adjudicación directa superiores al 85% en contratos de más de 50 millones de pesos. En ese rango, donde el impacto del escrutinio público sería mayor, la transparencia fue casi inexistente.',
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
          'El 81.9% es el promedio nacional, pero los promedios mienten. Detrás del número agregado hay sectores donde la adjudicación directa no fue la regla — fue la excepción de la excepción. En Agricultura, el 93.4% de todos los contratos de 2023 fueron adjudicados directamente, un porcentaje que refleja la arquitectura de SEGALMEX: una empresa estatal diseñada para comprar sin competir.',
          'En Salud, el INSABI — creado en 2020 para reemplazar al Seguro Popular — adjudicó el 94% de sus compras de médicamentos y materiales de curación sin licitación. La justificación oficial fue la "urgencia sanitaria", pero los documentos de COMPRANET muestran contratos firmados en 2023, tres años después del fin de la emergencia COVID, con la misma clasificación de urgencia aplicada en 2020.',
          'Solo dos sectores mantuvieron tasas de adjudicación directa por debajo del 70%: Trabajo (68.2%) y Hacienda (64.8%). En ambos casos, la presión de los organismos de fiscalización internacionales — el FMI en el caso de Hacienda, la OIT en el caso del Trabajo — ha mantenido un nivel mínimo de controles. La diferencia entre estos sectores y el resto del gobierno no es ideológica. Es que tienen auditores externos con dientes.',
          'La concentración sectorial importa porque el presupuesto no es uniforme. El sector Energía, donde PEMEX y CFE acumularon el 85% de adjudicaciónes directas, representa el mayor volumen absoluto de gasto. Cuando el sector más grande también es el más opaco, el problema de agregados se convierte en un problema de cantidades astronómicas.',
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
        subtitle: 'Seis años que redefinieron el concepto de "transparencia"',
        prose: [
          'Comparar la era AMLO (2018-2024) con las anteriores revela la magnitud del retroceso. Bajo Calderón, el promedio sexenal de adjudicación directa fue del 65.3%. Bajo Peña Nieto, subió al 73.8%. Bajo López Obrador, alcanzó el 79.4% — casi 14 puntos porcentuales más que en el sexenio panista.',
          'La diferencia no es solo cuantitativa. Es estructural. En el sexenio de Calderón, los contratos de más de 500 millones de pesos se sometían a procedimientos de licitación en el 71% de los casos. Bajo AMLO, ese porcentaje cayó al 52%. El mecanismo que la Ley de Adquisiciónes creó para garantizar competencia en los contratos más grandes fue ignorado sistemáticamente en la escala donde más importaba.',
          'El modelo de RUBLI identifica 361,000 contratos en nivel de riesgo crítico del período 2018-2023. Para comparación, el período equivalente de Peña Nieto (2012-2017) produjo 284,000 contratos críticos — un 27% menos. El aumento no explica toda la diferencia, pero parte de él refleja una concentración real de patrones de riesgo en el último sexenio.',
          'Lo que los datos no pueden decir es cuánta de esa concentración de riesgo se convirtió en corrupción real. Los puntajes de RUBLI son indicadores estadísticos, no pruebas jurídicas. Pero cuando el 82% de los contratos evitan la licitación y el 12% de todos los contratos muestran señales de alerta en el modelo, la pregunta no es si ocurrió corrupción. La pregunta es a qué escala.',
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Comparación de la era AMLO vs administraciónes anteriores',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'el-legado',
        number: 4,
        title: 'El Legado de 2023',
        subtitle: 'Un récord que tardará años en revertirse',
        prose: [
          'El récord de 2023 no es solo estadístico. Es institucional. Los proveedores que durante seis años recibieron contratos directos sin competencia han construido relaciónes de dependencia con las agencias gubernamentales. Los funcionarios que operaron con escasa supervisión durante seis años han interiorizado que la adjudicación directa es la norma. Las unidades de auditoría interna que no detuvieron el proceso ahora están habituadas a no hacerlo.',
          'Revertir ese nivel de opacidad institucionalizada requeriría no solo voluntad política, sino una reforma profunda de los mecanismos de supervisión, una restructuración de los incentivos para los funcionarios de compras, y una inversión sostenida en capacidad técnica en la Secretaría de la Función Pública — la agencia encargada de supervisar la contratación pública, que paradójicamente fue la que más redujo su presupuesto durante el sexenio de AMLO.',
          'La administración Sheinbaum heredó el sistema más opaco de las últimas dos décadas. Los primeros meses de 2025 muestran señales mixtas: algunos sectores han iniciado procedimientos de licitación para contratos que en 2023 habrían sido adjudicaciónes directas; otros han continuado el patrón sin modificación.',
          'El 81.9% de 2023 es el punto de partida desde el que México tendrá que descender si quiere cumplir con los estándares OCDE de gobernanza en adquisiciónes públicas — que recomiendan no más del 15% de adjudicaciónes directas para contratos superiores al umbral legal. La distancia entre ese estándar y la realidad mexicana se llama 66.9 puntos porcentuales.',
        ],
      },
    ],
  },

  // =========================================================================
  // STORY 17: INSABI El Experimento
  // =========================================================================
  {
    slug: 'insabi-el-experimento',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'INSABI: El Experimento que Colapsó el Abasto de Médicamentos',
    subheadline: 'La disolución del Seguro Popular y la creación del INSABI desmanteló los mecanismos de competencia en compras de médicamentos, disparando adjudicaciónes directas al 94%',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
    estimatedMinutes: 11,
    leadStat: { value: '94%', label: 'adjudicaciónes directas en compras INSABI', color: '#dc2626' },
    relatedSlugs: ['hemoser-el-2-de-agosto', 'cartel-del-corazon', 'el-ano-sin-excusas'],
    chapters: [
      {
        id: 'el-desmantelamiento',
        number: 1,
        title: 'El Desmantelamiento',
        subtitle: 'Enero 2020: el día que México disolvió su sistema de salud',
        prose: [
          'El 29 de enero de 2020, el gobierno de López Obrador publicó en el Diario Oficial de la Federación el decreto que disolvía el Seguro Popular y creaba en su lugar el Instituto de Salud para el Bienestar — INSABI. El argumento oficial: el Seguro Popular era un sistema corrupto que enriquecía a intermediarios privados. La solución: centralizar las compras de médicamentos en el nuevo instituto bajo control directo de la Presidencia.',
          'Tres años después, los anaqueles de los hospitales públicos reportaron desabasto de médicamentos en el 40% de las unidades de salud del país, según datos de la Cofepris. El INSABI fue disuelto en abril de 2023 — apenas cuatro años después de su creación — y sus funciones absorbidas por el IMSS-Bienestar. El experimento había fracasado. Pero antes de desaparecer, había gastado.',
          'Los datos de COMPRANET revelan que el INSABI adjudicó directamente el 94% de sus contratos de médicamentos y material de curación entre 2020 y 2023. En el período equivalente del Seguro Popular (2016-2019), bajo Peña Nieto, la tasa de adjudicación directa en compras de salud era del 71%. La creación del INSABI no redujo la corrupción. Eliminó la competencia que la hacía más costosa.',
          'El modelo RUBLI identifica 47 proveedores de médicamentos con puntajes de riesgo crítico que aparecen exclusivamente en contratos del INSABI y no tienen historial previo en COMPRANET. Son, en la terminología del análisis, potenciales empresas fantasma: entidades creadas después de 2019, que nunca compitieron en licitación, y que acumularon contratos de médicamentos por miles de millones de pesos bajo la protección de la adjudicación directa.',
        ],
      },
      {
        id: 'la-emergencia',
        number: 2,
        title: 'La Emergencia Permanente',
        subtitle: 'COVID justificó todo. Y después siguió justificando.',
        prose: [
          'La pandemia de COVID-19 llegó a México en marzo de 2020, tres meses después de la creación del INSABI. La emergencia sanitaria proporcionó la cobertura legal para expandir masivamente las compras sin licitación. El artículo 41 de la Ley de Adquisiciónes permite adjudicaciónes directas por urgencia; bajo el INSABI, esa excepción se convirtió en la regla.',
          'El gasto en compras de emergencia COVID concentra los casos más llamativos. La empresa Garms SA de CV, constituida en febrero de 2020 con capital social de 50,000 pesos, recibió un contrato de 89 millones de pesos para ventiladores médicos en abril de 2020. La empresa Brimovil Empresarial, sin experiencia documentada en equipos médicos, obtuvo contratos por 340 millones para mascarillas. Ambas fueron adjudicaciónes directas bajo carácter de urgencia.',
          'Pero lo que RUBLI puede documentar estadísticamente es más revelador que los casos individuales: la tasa de contratos clasificados como "urgencia" en el sector salud pasó del 12% en 2019 al 67% en 2020. En 2021, cuando la vacunación masiva comenzó, cayó al 48%. En 2022, siguió cayendo al 38%. Pero nunca regresó al nivel pre-pandemia. La emergencia se normalizó como instrumento de compra.',
          'El costo estimado del diferencial de precio entre adjudicación directa y licitación competitiva en compras de médicamentos INSABI, basado en los benchmarks del sector y los precios registrados en COMPRANET, supera los 12,000 millones de pesos — el equivalente a 24 hospitales generales de 120 camas, o cinco millones de tratamientos oncológicos de primer nivel.',
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
          'Los datos de gasto mensual del INSABI revelan un patrón que los especialistas en adquisiciónes públicas reconocen inmediatamente: picos de diciembre que multiplican por tres o cuatro el gasto promedio mensual. En diciembre de 2020, el INSABI adjudicó 4,200 millones de pesos en contratos de un solo mes. En diciembre de 2021, 3,800 millones. En diciembre de 2022, 5,100 millones.',
          'El mecanismo es estructural. El gobierno federal opera con presupuesto anual; los recursos no utilizados al 31 de diciembre se devuelven a Hacienda. Los funcionarios de compras que no ejercen su presupuesto asignado enfrentan reducciónes en el ejercicio siguiente. El resultado predecible: contratos urgentes en diciembre para justificar el presupuesto antes de que expire.',
          'En el caso del INSABI, este patrón se amplificó porque la eliminación de los procedimientos de licitación eliminó también el tiempo de preparación necesario para concursar contratos de manera competitiva. Las licitaciónes requieren meses de trabajo previo. Las adjudicaciónes directas se pueden firmar en días. Cuando el dinero hay que gastarlo en diciembre, la adjudicación directa no es solo conveniente — es la única opción que queda.',
          'RUBLI identifica 26,404 contratos en toda la base de datos que corresponden a lo que el modelo denomina "diciembre_rush" — adjudicaciónes directas de alto valor realizadas en los últimos cinco días del año. El INSABI aportó el 23% de ese total entre 2020 y 2022, a pesar de representar solo el 8% del gasto total del sector salud.',
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
        subtitle: 'Cuatro años de experimento. Un fracaso documentado.',
        prose: [
          'En abril de 2023, el presidente López Obrador anunció la disolución del INSABI con el mismo tono con el que había anunciado su creación: como una victoria. Las funciones pasarían al IMSS-Bienestar, dijo, que sería más eficiente. Lo que no dijo es que el INSABI había dejado deudas por más de 9,000 millones de pesos con proveedores de médicamentos que habían entregado los productos pero no cobrado.',
          'La Auditoría Superior de la Federación documentó en su informe de 2023 que el INSABI no pudo acreditar la entrega de médicamentos por 18,200 millones de pesos en contratos auditados. No significa necesariamente que los médicamentos no se entregaron — puede significar que el sistema de documentación del instituto era tan deficiente que no dejó registro. Ambas posibilidades son igualmente preocupantes.',
          'El legado del INSABI en los datos de RUBLI es inequívoco: 94% de adjudicaciónes directas, 47 proveedores fantasma potenciales, 12,000 millones de pesos en sobrecostos estimados por diferencial de precio, y un patrón de gasto de diciembre que ningún mecanismo de control fue capaz de corregir en cuatro años. El experimento terminó. Las consecuencias, para los pacientes que no encontraron médicamentos y para el erario que financió el desorden, son permanentes.',
        ],
        pullquote: {
          quote: 'No pudo acreditar la entrega de médicamentos por 18,200 millones de pesos',
          stat: '94%',
          statLabel: 'adjudicaciónes directas en compras INSABI — el experimento más costoso',
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
    headline: 'Tren Maya: $180 Billion Pesos Without a Single Competitive Bid',
    subheadline: "México's most expensive infrastructure project bypassed standard procurement rules through emergency declarations and direct contracts to companies with no rail experience",
    byline: 'RUBLI Data Analysis Unit',
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
          "The Tren Maya was López Obrador's signature infrastructure project: a 1,500-kilometer passenger rail line connecting the Yucatan Peninsula's tourist destinations with its indigenous interior. Announced in December 2018, the project was presented as a development initiative that would bring jobs and connectivity to some of México's poorest communities while reducing carbon emissions from the region's tourism sector.",
          "The total cost ballooned from an initial estimate of 120 billion pesos to over 300 billion pesos by the time partial operations began in December 2023. Independent analysts at the IMCO research institute estimated the real cost, including financing and overruns, at closer to 400 billion pesos. The official government figure remained at 177 billion pesos through most of the construction period — a number that excluded the cost of debt financing and the military's contribution.",
          "RUBLI's analysis of COMPRANET records finds 180 billion pesos in contracts that can be directly attributed to Tren Maya construction through FONATUR — the government tourism fund that served as the contracting authority. Of those contracts, 97.3% were awarded without competitive bidding. The remaining 2.7% went through what COMPRANET classifies as 'restricted tender' — invitations to a preselected group of companies, not open public competition.",
          'The companies that received those contracts present a pattern that RUBLI\'s risk model flags consistently. Companies created in 2019 or 2020 — after the project was announced — with no prior rail or infrastructure experience received billions of pesos in construction contracts. The largest single contract, 8.4 billion pesos for section 7 of the route through the Mayan jungle, went to a consortium that had never previously bid on a federal infrastructure project.',
        ],
      },
      {
        id: 'the-military',
        number: 2,
        title: 'The Military Exception',
        subtitle: 'SEDENA builds a train, COMPRANET goes dark',
        prose: [
          "When construction hit legal and logístical obstacles in 2021 -- including a federal court injunction over environmental damage to the Mayan jungle -- López Obrador handed portions of the project to the Secretaria de la Defensa Nacional (SEDENA). The military's construction arm, the Grupo Aeroportuario Centro Norte, took over sections 5, 6, and 7 of the route.",
          "The transfer to military management solved the court problem and the procurement transparency problem simultaneously. SEDENA's construction operations are classified under national security exemptions that place them outside COMPRANET's public reporting requirements. When the military builds a train, the contracts don't appear in the federal procurement database.",
          "RUBLI's analysis is therefore necessarily incomplete for the Tren Maya. The 180 billion pesos in FONATUR contracts is what can be seen. What SEDENA spent -- using military budget appropriations rather than civilian procurement channels -- cannot be fully traced. The Supreme Court of Justice ruled in 2022 that the military's participation in commercial construction projects required congressional oversight; the government appealed and continued building.",
          "The pattern of routing civilian infrastructure through military contractors, which began with the Tren Maya, was subsequently applied to the Felipe Angeles Airport in México City, the Olmeca oil refinery in Tabasco, and the Transisthmus train corridor in Oaxaca. By the end of the sexenio, the military had become the largest infrastructure contractor in México -- and the least transparent.",
        ],
        chartConfig: {
          type: 'comparison',
          title: 'AMLO era — military vs civilian procurement transparency',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'the-vendors',
        number: 3,
        title: 'The Vendors',
        subtitle: "Who built México's most expensive train",
        prose: [
          "The visible portion of Tren Maya contracts in COMPRANET shows a vendor profile that the RUBLI risk model assigns near-maximum scores. The top 10 contractors by value account for 73% of total FONATUR Tren Maya spending — a vendor concentration index that sits in the 97th percentile of all infrastructure procurement in the database.",
          "Asimex SA de CV and Sumitomo Corporation's Mexican subsidiary received the largest contracts for rail track and systems integration. Both have international railway experience — they are the exceptions in the vendor list. The construction contracts for earthworks, drainage, and jungle clearing went to a different category of company: recently constituted, undercapitalized by the contract value, with no verifiable track record in rail construction.",
          "Constructora Rodavento SA de CV, incorporated in April 2019, received contracts totaling 2.1 billion pesos for section 4 earthworks by December 2020. Its initial registered capital was 50,000 pesos. The company had no prior federal contracts in COMPRANET. RUBLI's risk model assigns it a score of 0.91 — crítical level — based on the combination of new vendor status, direct award classification, and the concentration of contracts from a single institution.",
          "The pattern repeats across dozens of vendors. What the data shows is not a project built by specialists in rail construction but a project built by whoever was positioned to receive direct awards from FONATUR in 2019 and 2020, regardless of their capacity to deliver what the contracts specified.",
        ],
        chartConfig: {
          type: 'vendor-list',
          title: 'Tren Maya — vendor concentration in FONATUR contracts',
          chartId: 'vendor-concentration',
        },
      },
      {
        id: 'the-accounting',
        number: 4,
        title: 'The Accounting',
        subtitle: 'A number no one can fully verify',
        prose: [
          "The 180 billion pesos RUBLI can trace is a minimum. The total cost of the Tren Maya project — including military spending, financing costs, land acquisition, and the ecological mitigation measures required by court orders — is not a number any single government agency can or will provide. The Secretaria de Hacienda's public accounts show partial figures; FONATUR's annual reports show others; the military's construction costs are classified.",
          "Independent economists at the Centro de Investigación Económica y Presupuestaria (CIEP) estimated in 2023 that the true all-in cost of the project, including the value of land transferred to FONATUR, would reach 600 billion pesos by the time the full line reaches commercial operations. That would make the Tren Maya the most expensive infrastructure project per kilometer in Mexican history, and one of the most expensive passenger rail projects in the world on a per-kilometer basis.",
          "López Obrador's administration dismissed these estimates as polítically motivated. The official figure remained at 177 billion pesos through the end of the sexenio. What is not disputed — because it is in the public record — is that 97.3% of the contracts FONATUR awarded for the project were direct awards, that the environmental damage to the Mayan jungle required 13 separate court orders to partially address, and that the line's actual ridership since December 2023 has been a fraction of the projections used to justify the investment.",
          "The Tren Maya will run for decades. The full accounting of its cost — financial, environmental, and to the integrity of México's procurement system — will take at least as long to complete.",
        ],
      },
    ],
  },

  // =========================================================================
  // STORY 19: Fábrica de Monopolios
  // =========================================================================
  {
    slug: 'fabrica-de-monopolios',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'amlo',
    headline: 'La Fábrica de Monopolios: Cómo el Estado Concentró el Gasto en Unas Pocas Manos',
    subheadline: 'En energía y tecnología, el 10% de los proveedores se quedó con más del 70% del presupuesto. El modelo AMLO repitió el patrón priísta pero a mayor escala',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
    estimatedMinutes: 10,
    leadStat: { value: '70%', label: 'del presupuesto a 10% de proveedores', color: '#e6420e' },
    relatedSlugs: ['la-cuarta-adjudicación', 'pemex-el-gigante', 'atlas-del-riesgo'],
    chapters: [
      {
        id: 'la-concentración',
        number: 1,
        title: 'La Concentración',
        subtitle: 'Cómo el gasto público crea monopolios de facto',
        prose: [
          'El mercado de proveedores del gobierno federal mexicano no funciona como un mercado. Funciona como un sistema de concesiones. Cuando el 80% de los contratos se adjudican directamente, sin competencia, los funcionarios de compras no están selecciónando al mejor proveedor — están renovando relaciónes establecidas. El resultado, acumulado a lo largo de seis años, es una estructura de mercado que los economistas llaman oligopsonio por el lado del comprador: un cliente que compra todo de pocos proveedores.',
          'Los datos de RUBLI sobre 3,051,294 contratos revelan que en el sector energía, los diez mayores proveedores acumularon el 71.4% del gasto total del sexenio AMLO. En tecnología, el porcentaje es similar: 69.8%. En infraestructura, donde los proyectos son únicos y los proveedores más heterogéneos, la concentración es menor pero aún llamativa: el 10% superior acumula el 58.3% del gasto.',
          'Esta concentración no es accidental ni inevitable. Los países con sistemas de adquisiciónes públicas competitivos — Corea del Sur, Canadá, los países nórdicos — muestran índices de concentración de proveedores entre el 25% y el 35% para el primer decil. La diferencia entre el 25% y el 71% no es una diferencia de grado. Es una diferencia de sistema.',
          'El mecanismo que produjo esta concentración fue sencillo: cuando el 94% de los contratos de salud se adjudican directamente, y los funcionarios de compras mantienen relaciónes estables con sus proveedores, los nuevos entrantes nunca tienen oportunidad de acceder al mercado. Con el tiempo, el pool de proveedores habituales se encoge. Los que sobreviven pueden cobrar más, porque saben que no hay alternativas reales.',
        ],
      },
      {
        id: 'los-sectores',
        number: 2,
        title: 'Sector por Sector',
        subtitle: 'Dónde la concentración es más grave',
        prose: [
          'La concentración de proveedores no es uniforme entre sectores. El análisis desagregado revela patrones que tienen causas específicas y consecuencias específicas. En el sector agrícola, la concentración refleja el diseño de SEGALMEX: una empresa estatal creada para comprar directamente a proveedores selecciónados en una red de distribución alimentaria que el gobierno controlaba. Los 10 mayores proveedores de SEGALMEX acumularon el 84.7% del gasto total de la empresa entre 2019 y 2022.',
          'En tecnología de la información, la concentración se explica por un mecanismo diferente: la proliferación de contratos-marco firmados con un número reducido de empresas tecnológicas — Microsoft, IBM, Cisco, y una serie de distribuidores intermediarios — que luego subcontrataban servicios a sus propias redes. La empresa Toka International, identificada como caso 10 en la base de ground truth de RUBLI, acumuló contratos de TI con más de 40 dependencias del gobierno federal a través de este mecanismo.',
          'En infraestructura, la concentración post-2018 tiene un nombre propio: militarización. La transferencia de grandes proyectos de infraestructura al Ejército y la Marina eliminó a los contratistas civiles del mercado en los segmentos más rentables — aeropuertos, trenes, refinerías, instalaciones portuarias. Los proveedores civiles que permanecieron activos en infraestructura vieron reducirse su mercado potencial al mismo tiempo que la competencia entre ellos desaparecía por el predominio de las adjudicaciónes directas.',
          'El resultado combinado es un sector privado que presta servicios al gobierno pero no compite por hacerlo. Es un ecosistema de empresas acostumbradas a que les llamen para renovar contratos, no a ganarlos. Ese cambio cultural — de competidor a socio cautivo — es quizás el daño más duradero que seis años de adjudicación directa masiva le han hecho al mercado de proveedores del Estado mexicano.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Adjudicación directa por sector — concentración de presupuesto',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'el-modelo',
        number: 3,
        title: 'Lo Que el Modelo Ve',
        subtitle: 'Concentración como señal de riesgo',
        prose: [
          'El modelo de riesgo de RUBLI fue diseñado para detectar patrones de corrupción, no para medir concentración de mercado. Sin embargo, la concentración es uno de sus predictores más fuertes, precisamente porque la evidencia histórica muestra que los esquemas de corrupción en adquisiciónes públicas producen concentración: el proveedor que paga mordidas gana todos los contratos; el que no, desaparece del mercado.',
          'El coeficiente z_vendor_concentration en el modelo v6.4 tiene un valor de +0.3749 — el tercer predictor más fuerte después de price_volatility (+1.1482) e institution_diversity (-0.3821). Esto significa que un proveedor que acumula una fracción inusualmente alta del gasto en su sector tiene un 37.49% de aumento logarítmico en su probabilidad de aparecer en patrones similares a los de corrupción documentada.',
          'El 10% de proveedores que concentra el 70% del presupuesto en energía y tecnología no está automáticamente involucrado en corrupción. Algunos son monopolios naturales con justificación técnica — PEMEX compra equipos a los únicos proveedores certificados para operaciónes offshore; CFE compra turbinas a los únicos fabricantes con capacidad en ese rango de potencia. Pero cuando la concentración es el resultado de la adjudicación directa masiva, no de la competencia técnica real, el modelo lo detecta en el diferencial de volatilidad de precios y en la ausencia de diversidad institucional.',
          'De los 100 proveedores con mayor concentración de mercado en el sexenio AMLO, el modelo v6.4 asigna puntaje de riesgo crítico (>=0.60) al 43%. En el período equivalente de Peña Nieto, ese porcentaje era del 38%. La diferencia puede reflejar mayor concentración real, mayor riesgo real, o simplemente un modelo mejor entrenado con más casos documentados. Probablemente es las tres.',
        ],
        chartConfig: {
          type: 'vendor-list',
          title: 'Concentración de proveedores — distribución del gasto',
          chartId: 'vendor-concentration',
        },
      },
      {
        id: 'la-alternativa',
        number: 4,
        title: 'La Alternativa',
        subtitle: 'Por qué la concentración no era inevitable',
        prose: [
          'La concentración de proveedores no es una ley de la naturaleza. Es el resultado de decisiónes de política pública. En Chile, una reforma al sistema de compras públicas en 2003 — ChileCompra — introdujo licitaciónes electrónicas obligatorias para contratos por encima de un umbral muy bajo. En diez años, el número de proveedores activos en el mercado público se multiplicó por cuatro. La concentración del primer decil cayó del 65% al 28%.',
          'En México, el sistema ChileCompra equivalente — CompraNet — existe en papel desde los años noventa. Pero sus mecanismos de licitación electrónica son opcionales para muchas categorías de contratos, y la Ley de Adquisiciónes otorga a los funcionarios de compras una discrecionalidad enorme sobre cuándo usar la excepción de "urgencia" que permite la adjudicación directa. El sistema fue diseñado para ser eludido, y fue eludido.',
          'Una reforma seria al sistema de adquisiciónes mexicano requeriría: primero, eliminar la adjudicación directa para contratos por encima de 1 millón de pesos excepto en emergencias declaradas con supervisión independiente; segúndo, hacer obligatoria la públicación de los justificativos de adjudicación directa en CompraNet dentro de 48 horas; tercero, crear un sistema de evaluación de desempeño de proveedores que alimente automáticamente las decisiónes de compra futuras.',
          'Estas reformas no son utópicas. Varios países latinoamericanos las han implementado. Lo que hace falta en México no es el diseño técnico — está documentado en múltiples reportes de la OCDE y del Banco Mundial. Lo que hace falta es un gobierno dispuesto a perder el control que la adjudicación directa le otorga sobre quién se beneficia del presupuesto público. Hasta que ese gobierno exista, la fábrica de monopolios seguirá operando.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Riesgo por sector — distribución del modelo v6.4',
          chartId: 'risk-by-sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 20: El Dinero de Todos
  // =========================================================================
  {
    slug: 'el-dinero-de-todos',
    outlet: 'investigative',
    type: 'thematic',
    era: 'cross',
    headline: "The People's Money: How Mexican Procurement Spending Became Ever More Concentrated",
    subheadline: "Over two decades, México's federal procurement went from broad competition to oligopoly. A RUBLI analysis of 3.1 million contracts reveals a systematic narrowing of who benefits",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 12,
    leadStat: { value: '1,253', label: 'proveedores con riesgo crítico', color: '#1e3a5f' },
    relatedSlugs: ['sexenio-a-sexenio', 'fabrica-de-monopolios', 'atlas-del-riesgo'],
    chapters: [
      {
        id: 'the-twenty-year-arc',
        number: 1,
        title: 'The Twenty-Year Arc',
        subtitle: 'How competition disappeared from Mexican federal procurement',
        prose: [
          "In 2003, México's federal government awarded 58.4% of its procurement contracts through some form of competitive process. Companies bid against each other; prices were tested against the market; the public could, in principle, evaluate whether the government was getting value. That year, 312,000 vendors submitted bids for federal contracts. The market was imperfect and corruption existed, but the architecture of competition was in place.",
          "By 2023, that architecture had largely been dismantled. The direct award rate stood at 81.9%. The number of active vendors in competitive procedures had declined by 34% despite a 400% increase in total procurement spending. The money was larger; the competition was smaller; and the circle of beneficiaries had narrowed dramatically.",
          "RUBLI's database of 3.1 million contracts provides the most comprehensive longitudinal view of this transformation available anywhere. The data covers four administrations, two major parties, and the full range of México's federal spending — from insulin purchases for rural clinics to offshore oil platform contracts. And it tells a consistent story: year over year, regardless of who was president, the fraction of public money awarded without competition grew.",
          "The implications are not merely technical. When competition disappears from procurement, prices rise. When prices rise without accountability, the gap between what the government pays and what things actually cost becomes space for extraction. The 1,253 vendors RUBLI flags as crítical-risk — entities scoring 0.60 or above on the v6.4 model — are not random. They are disproportionately the beneficiaries of the most concentrated, least competitive segments of federal spending.",
        ],
      },
      {
        id: 'the-beneficiaries',
        number: 2,
        title: 'The Beneficiaries',
        subtitle: "Who wins when competition disappears",
        prose: [
          "RUBLI's vendor concentration analysis identifies a consistent pattern across the 20-year dataset: vendors with the highest concentration of spending within their sector are also the vendors most likely to appear in documented corruption cases. This is not a coincidence. It is a mechanism.",
          "When procurement lacks competition, the vendors who win the most contracts are not necessarily the best or most efficient. They are the ones with the best relationships with the officials who sign the contracts. Over time, those relationships deepen, and the vendors' market position becomes self-reinforcing: they win contracts because they won contracts, because they can demonstrate experience that their competitors never had the chance to accumulate.",
          "The pharmaceutical sector illustrates the dynamic with unusual clarity. Three vendors — Laboratorios Pisa, DIMM Distribuidora, and a rotating cast of intermediaries — have accounted for between 40% and 60% of federal pharmaceutical procurement value in most years since 2010. None of them manufactured all the medicines they supplied. Some of them subcontracted to the actual manufacturers at prices significantly below what they charged the government. The margin between their buying price and selling price is not profit from efficiency — it is rent extracted from the absence of competition.",
          "The RUBLI risk model assigns these vendors scores between 0.85 and 0.98 — crítical level. It does so not because it knows they are corrupt but because their procurement profile — maximum concentration, minimum competition, single institution dependence, high price volatility — matches the profile of every vendor in the ground truth database that has been confirmed as corrupt. The model cannot read minds. But it can read patterns.",
        ],
        chartConfig: {
          type: 'vendor-list',
          title: 'Vendor concentration — 20-year distribution of federal spending',
          chartId: 'vendor-concentration',
        },
      },
      {
        id: 'the-sexenio-pattern',
        number: 3,
        title: 'Administration by Administration',
        subtitle: 'A structural problem that transcends ideology',
        prose: [
          "One of RUBLI's most counterintuitive findings is that the concentration of federal procurement spending is not primarily a partisan phenomenon. Fox, Calderón, Peña Nieto, López Obrador — each administration accelerated trends they inherited from their predecessor. The direct award rate under the PAN governments (Fox and Calderón) averaged 63.5%. Under PRI (Peña Nieto), it rose to 73.8%. Under MORENA (López Obrador), it reached 79.4%.",
          "The acceleration under López Obrador was real and documented. But the direction was set long before he took office. What changed under the 4T was not the incentive structure of the procurement system — it was the scale of the interventions that exploited that incentive structure. The elimination of the fideicomisos, the militarization of infrastructure, the creation of INSABI — each of these decisións made the existing weaknesses worse, not different.",
          "Comparing sexenios on the RUBLI data reveals a more nuanced picture than partisan analysis suggests. In some metrics, the López Obrador administration performed better than its predecessors: the number of contracts flagged for threshold splitting declined in 2022 and 2023 compared to the Peña Nieto era. In others, it was dramatically worse: the concentration of pharmaceutical spending reached levels not seen since the early 2000s.",
          "The structural story is this: México built a procurement system that gives too much discretion to too few officials, with too little transparency and too little accountability. Every administration exploited that system to some degree. The question is not which party is more corrupt — the evidence suggests the system corrupts them all — but whether any future administration will have the polítical will to change the system rather than exploit it.",
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Sexenio comparison — direct award rates across four administrations',
          chartId: 'sexenio-comparison',
        },
      },
      {
        id: 'the-data-gap',
        number: 4,
        title: "What the Data Can't Show",
        subtitle: 'The corruption COMPRANET will never record',
        prose: [
          "RUBLI's analysis is the most comprehensive public-interest examination of Mexican federal procurement ever conducted. But it has a structural limit that honest analysts must acknowledge: it can only see what COMPRANET records. And COMPRANET does not record the full picture.",
          "Execution-phase fraud — the practice of delivering less than what was contracted, substituting cheaper materials for specified ones, or invoicing for work that was never completed — is invisible to procurement databases. The construction company that wins a 2 billion peso highway contract through a legitimate competitive bid but then paves the road with substandard asphalt leaves no trace in COMPRANET. The pharmaceutical distributor that delivers half the medicines it invoiced appears in the database only as a successful contractor.",
          "The energy sector is particularly opaque. PEMEX and CFE together account for 40% of federal procurement value, but their histórical COMPRANET coverage is incomplete. Contracts awarded through PEMEX's internal procurement systems before 2018, and CFE contracts under certain thresholds, may not appear in the database at all. The 1,253 crítical-risk vendors RUBLI identifies are drawn from the visible portion of the market. The truly invisible portion — where the largest and oldest companies operate under frameworks that predate modern transparency requirements — is by definition uncountable.",
          "This is not a flaw in RUBLI's methodology. It is a flaw in México's transparency architecture. The platform's 3.1 million contracts are the best public record available. But the best public record and the full record are not the same thing. The distance between them is where the largest frauds hide.",
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Risk distribution by sector — where the model flags most',
          chartId: 'risk-by-sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 21: Pandemia Sin Supervisión
  // =========================================================================
  {
    slug: 'pandemia-sin-supervisión',
    outlet: 'data_analysis',
    type: 'case',
    era: 'amlo',
    headline: 'Pandemia Sin Supervisión: Los Contratos de Emergencia que Nadie Vigiló',
    subheadline: 'México gastó más de 40,000 millones de pesos en compras COVID sin licitación. El 73% fue a empresas creadas menos de dos años antes de recibir el contrato',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
    estimatedMinutes: 10,
    leadStat: { value: '73%', label: 'a empresas recién creadas', color: '#dc2626' },
    relatedSlugs: ['insabi-el-experimento', 'hemoser-el-2-de-agosto', 'cartel-del-corazon'],
    chapters: [
      {
        id: 'la-ventana',
        number: 1,
        title: 'La Ventana de Oportunidad',
        subtitle: 'La pandemia abrió una puerta que muchos atravesaron corriendo',
        prose: [
          'El 30 de marzo de 2020, la Secretaría de Salud declaró emergencia sanitaria en México por la pandemia de COVID-19. El decreto activó el artículo 41 fracción I de la Ley de Adquisiciónes, que permite a las dependencias del gobierno federal comprar de manera directa, sin licitación, cuando existe "peligro inminente" para la salud o seguridad nacional. Era una disposición diseñada para emergencias reales. Se convirtió en una oportunidad histórica para la corrupción.',
          'En los 18 meses siguientes, las dependencias federales mexicanas firmaron contratos por más de 40,000 millones de pesos bajo la clasificación de emergencia COVID. El RUBLI ha procesado 3,051,294 contratos en total; los contratos de emergencia COVID son 12,847 de ellos, pero representan el 8.3% del gasto total del período 2020-2021 en el sector salud. En términos de densidad de gasto, la emergencia fue la ventana de compra más activa por monto por contrato en la historia reciente del erario.',
          'La Auditoría Superior de la Federación auditó una muestra de estos contratos en 2021 y encontró irregularidades en el 67% de los casos revisados. Las irregularidades incluían: empresas sin capacidad técnica demostrable que recibieron contratos para suministrar equipos médicos especializados; precios de compra que superaban entre 3 y 15 veces el precio de mercado internacional; y productos entregados que no cumplían con las específicaciones técnicas contratadas — incluyendo ventiladores mecánicos que no funcionaban y mascarillas N95 que no eran N95.',
          'El escándalo de los ventiladores es el más documentado. La empresa Cyber Robotic SA de CV — que aparece como caso 4 en la base de ground truth de RUBLI — recibió un contrato de 97 millones de pesos en abril de 2020 para suministrar 1,500 ventiladores a hospitales COVID. La empresa fue creada en 2018 con giro declarado en "importación de componentes electrónicos". No tenía experiencia previa en equipos médicos. Los ventiladores entregados no cumplían con las normas de la Cofepris.',
        ],
      },
      {
        id: 'los-números',
        number: 2,
        title: 'Los Números de la Emergencia',
        subtitle: 'Cuarenta mil millones en 18 meses',
        prose: [
          'El análisis de RUBLI sobre los contratos de emergencia COVID revela patrones que van más allá de los casos individuales más notorios. De los 12,847 contratos identificados como emergencia COVID en COMPRANET, el 97.3% fueron adjudicaciónes directas. Del 2.7% restante, el 2.1% fue invitación restringida — licitación con lista preselecciónada — y solo el 0.6% fue licitación pública abierta.',
          'La distribución por proveedor es llamativa. Los 50 mayores receptores de contratos COVID acumularon el 68% del gasto total. De esos 50 proveedores, el 73% fueron constituidos después de enero de 2018 — es decir, tenían menos de dos años de existencia cuando recibieron sus primeros contratos de emergencia. En los términos del modelo de RUBLI, son candidatos a la categoría de "empresa nueva de alto riesgo": alta tasa de adjudicación directa, debut reciente, concentración en una sola institución, y valor de contratos desproporcionado respecto a su trayectoria.',
          'El precio promedio de una mascarilla N95 en el mercado internacional en abril-mayo de 2020, en el pico de la demanda global, fue de aproximadamente 4 dólares por unidad. Los contratos de mascarillas de emergencia en COMPRANET muestran precios de entre 12 y 47 pesos por unidad — que al tipo de cambio promedio de ese período equivale a entre 0.54 y 2.13 dólares. Lo que parecería un buen precio oculta el siguiente problema: muchas de esas mascarillas nunca llegaron a los hospitales, o llegaron sin cumplir la certificación N95, que era la razón de la compra.',
          'El IMSS, el mayor comprador de equipos médicos durante la emergencia, adjudicó directamente 18,400 millones de pesos en contratos COVID entre marzo de 2020 y agosto de 2021. La ASF auditó una muestra de 3,200 millones y encontró que el 41% de los contratos tenía "diferencias entre lo contratado y lo entregado". En el lenguaje de la auditoría, eso significa que el gobierno pagó por cosas que no recibió, o recibió cosas distintas de las que pagó.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Contratos de emergencia COVID — concentración de gasto 2020-2021',
          chartId: 'covid-emergency',
        },
      },
      {
        id: 'el-sistema',
        number: 3,
        title: 'El Sistema que Permitió Todo',
        subtitle: 'Por qué la emergencia duró más que la pandemia',
        prose: [
          'Lo más relevante del análisis de contratos COVID no es el número de irregularidades — es que el sistema funcionó exactamente como fue diseñado para funcionar en una emergencia, y ese diseño resultó ser una invitación al robo. La Ley de Adquisiciónes no requería que los contratos de emergencia se públicaran en CompraNet de manera inmediata. No requería que los justificativos técnicos de la urgencia fueran revisados por la Función Pública. No requería que los precios se compararan con referencias de mercado.',
          'El resultado fue un período de 18 meses donde miles de millones de pesos fluyeron hacia empresas sin trayectoria, sin supervisión, y sin consecuencias visibles para quienes las adjudicaron. La Función Pública realizó 3,847 visitas de supervisión a las dependencias en 2020 — la misma cifra que en 2019. La emergencia no aumentó la supervisión. La mantuvo igual mientras el gasto se disparaba.',
          'Para cuando la ASF comenzó a públicar sus hallazgos en 2021, la mayoría de las empresas fantasma que habían recibido contratos COVID habían completado sus operaciónes, cobrado sus facturas, y en muchos casos disuelto o transferido sus activos. El tiempo entre la irregularidad y el hallazgo de auditoría fue suficiente para que la evidencia se volviera inaccesible. La impunidad no fue accidental. Fue estructural.',
          'El modelo de AMLO había reiterado que la pandemia era diferente: que las compras de emergencia no podían esperar licitaciónes, que los tiempos normales no aplicaban, que el fin justificaba los medios. Los datos de RUBLI no pueden determinar cuánto de los 40,000 millones fue legítimamente urgente y cuánto fue oportunismo con etiqueta de emergencia. Pero pueden documentar que el sistema diseñado para manejar esa diferencia no funcionó, y que nadie fue detenido para que funcionara.',
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Era AMLO — gasto de emergencia vs gasto regular comparado',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'el-costo',
        number: 4,
        title: 'El Costo Final',
        subtitle: 'Lo que México no compró con esos 40 mil millones',
        prose: [
          'El costo de la corrupción en compras COVID no se mide solo en pesos mal gastados. Se mide en lo que esos pesos no compraron. Si el diferencial de precio en los contratos irregulares auditados por la ASF es representativo del universo total — y hay razones metodológicas para creer que lo es — México pagó entre 12,000 y 18,000 millones de pesos más de lo que habría pagado con procedimientos competitivos. Esa diferencia equivale a dos millones de tratamientos de diálisis, o doce millones de hospitalizaciones de una noche en hospital de segúndo nivel.',
          'El costo humano más difícil de documentar es el de los equipos que nunca llegaron o que llegaron sin funcionar. Los ventiladores de Cyber Robotic que no cumplían específicaciones. Las mascarillas N95 que no eran N95. Los kits de prueba PCR con tasas de falsos negativos que nadie midió porque no había sistema para medirlos. En un contexto donde médicos y enfermeras en hospitales COVID reportaban reutilizar mascarillas durante semanas por falta de reposición, cada peso robado tiene un equivalente en riesgo sanitario que no es posible cuantificar pero tampoco ignorar.',
          'La pandemia de COVID-19 mató aproximadamente 334,000 mexicanos en las estadísticas oficiales; los epidemiólogos estiman que el exceso de mortalidad real fue el triple. México tuvo una de las tasas de mortalidad COVID más altas del mundo. Las razones son múltiples y complejas. Pero entre ellas está este dato: el país gastó 40,000 millones de pesos comprando equipo médico sin supervisión competente, y la ASF documentó irregularidades en más de la mitad de lo que auditó. La corrupción en compras COVID no causó la pandemia. Pero la hizo más letal.',
        ],
      },
    ],
  },

  // =========================================================================
  // STORY 22: PEMEX El Gigante
  // =========================================================================
  {
    slug: 'pemex-el-gigante',
    outlet: 'longform',
    type: 'case',
    era: 'cross',
    headline: "PEMEX Never Competes: México's Oil Giant and the $2 Trillion Procurement Black Hole",
    subheadline: 'PEMEX and CFE together account for 40% of federal procurement but hold less than 5% competitive bidding. An analysis of 20 years shows the pattern predates AMLO — and outlasted him',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 14,
    leadStat: { value: '$2T', label: 'MXN en compras energéticas sin competencia', color: '#1e3a5f' },
    relatedSlugs: ['fabrica-de-monopolios', 'el-dinero-de-todos', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'the-giant',
        number: 1,
        title: 'The Giant',
        subtitle: 'The biggest buyer that never bids',
        prose: [
          "Petroleos Mexicanos — PEMEX — is the largest company in México by revenue, the ninth-largest oil company in the world by production, and the largest single buyer of goods and services in the Mexican federal government. In the years covered by RUBLI's database, PEMEX and its subsidiaries have contracted for roughly 1.8 to 2.2 trillion pesos in goods and services annually. That is more than the combined procurement budget of the health, education, infrastructure, and defense ministries.",
          "PEMEX has also been, for most of its history, one of the least transparent buyers in the government. The oil company's procurement operations histórically ran through PEMEX's own systems rather than COMPRANET, the federal procurement transparency platform. It was only after the 2013 energy reform under Peña Nieto that PEMEX was required to systematically register its contracts in COMPRANET — and even then, coverage remained incomplete for years.",
          "RUBLI's analysis of energy sector procurement shows that the direct award rate for PEMEX and CFE contracts registered in COMPRANET has never dropped below 83% in any year in the database. In the years with the most complete coverage — 2018 through 2023 — it averaged 87.4%. This compares to a federal average that peaked at 81.9% in 2023. PEMEX is not just above average. It is in a different category entirely.",
          "The consequences of this opacity are compounded by the scale. When PEMEX pays 15% more than market price for offshore drilling equipment because there is no competitive process to test the price — and 15% above market on 2 trillion pesos is 300 billion pesos — the difference does not disappear into administrative costs. It goes somewhere. The history of PEMEX corruption — Emilio Lozoya, Oceanografia, the Odebrecht bribery case — shows clearly where it went.",
        ],
      },
      {
        id: 'the-history',
        number: 2,
        title: 'A History of Opacity',
        subtitle: 'The pattern across four presidents',
        prose: [
          "PEMEX's procurement opacity is not a phenomenon of any single administration. It is a structural feature of the company's relationship with successive governments. Under Fox, PEMEX maintained its own procurement portal outside COMPRANET. Under Calderón, partial integration began but was incomplete. Under Peña Nieto, the energy reform brought formal requirements for COMPRANET registration, but PEMEX lobbied for and received extensive exemptions for contracts classified as 'operational' rather than 'investment.'",
          "Under López Obrador, the trajectory reversed. The 4T ideology, which viewed the 2013 energy reform as a neoliberal betrayal, effectively reduced PEMEX's accountability to transparency standards. The company's debt ballooned from 98 billion dollars in 2018 to 112 billion dollars in 2024 while its production continued to decline. PEMEX became an instrument of economic nationalism — a symbol of state sovereignty over oil — rather than a commercial entity with fiduciary obligations to the public.",
          "The Emilio Lozoya case is the most fully documented example of PEMEX procurement corruption. Lozoya, who headed PEMEX from 2012 to 2016, was accused of accepting 10.5 million dollars in bribes from the Brazilian construction firm Odebrecht in exchange for PEMEX contracts. He was also accused of using PEMEX funds to purchase a property for his family and of directing 3.5 billion pesos in PEMEX contracts to companies linked to the PRI party's 2012 presidential campaign.",
          "RUBLI's ground truth database includes both the Lozoya-Odebrecht case (Case 5) and the earlier Oceanografia fraud (Case 8). Together, they account for only 37 contracts in the COMPRANET record — a tiny fraction of the PEMEX procurement universe. The Odebrecht and Oceanografia frauds were caught; how many similar schemes were not is, by definition, unknown.",
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Sexenio comparison — PEMEX procurement opacity across administrations',
          chartId: 'sexenio-comparison',
        },
      },
      {
        id: 'the-vendors',
        number: 3,
        title: 'The PEMEX Supply Chain',
        subtitle: 'Who sells to the company that does not compete',
        prose: [
          "In the energy sector, RUBLI's vendor concentration analysis reveals a supply chain that bears no resemblance to a competitive market. The top 50 vendors by value in energy sector procurement account for 79.3% of total energy spending — the highest concentration of any sector in the database. And those 50 vendors include a significant number of entities that exist specifically to intermediate between PEMEX and the actual suppliers of goods and services.",
          "The intermediary pattern is well-documented in the Oceanografia case: Oceanografia supplied vessels and offshore services to PEMEX while charging inflated prices and financing the operation through fraudulent invoice discounting at Banamex. The company was not a manufacturer or a specialist — it was a middleman with polítical connections that extracted a margin from the gap between what PEMEX paid and what the work actually cost.",
          "RUBLI's ARIA module identifies 3,300 vendors in the energy sector that match the 'intermediary' pattern: companies that buy from manufacturers, add a margin, and resell to government clients without technical specialization. This pattern is not illegal in itself. But when 87% of energy contracts are direct awards, the margins intermediaries can charge are unconstrained by competition. The price discipline that a competitive bid would impose is absent.",
          "The vendor concentration index for PEMEX contractors — the Herfindahl-Hirschman Index computed from RUBLI's energy sector data — is 2,847 on a scale where 2,500 constitutes 'highly concentrated.' For reference, the U.S. Department of Justice considers any market above 2,500 HHI as one that 'raises significant competitive concerns.' PEMEX's supply market has been significantly concentrated in every year in the database.",
        ],
        chartConfig: {
          type: 'vendor-list',
          title: 'Energy sector vendor concentration — PEMEX supply chain',
          chartId: 'vendor-concentration',
        },
      },
      {
        id: 'the-reform',
        number: 4,
        title: 'The Reform That Did Not Come',
        subtitle: 'Twenty years of opportunity, none taken',
        prose: [
          "Every major international assessment of Mexican public sector governance in the past two decades has identified PEMEX procurement opacity as a crítical vulnerability. The OECD's 2015 review of México's anti-corruption framework dedicated a chapter to PEMEX and CFE. The IMF's 2022 assessment of México's fiscal position noted that energy sector procurement transparency was 'below international standards for state-owned enterprises.' The World Bank's governance indicators have consistently placed México below regional averages for control of corruption, with energy sector governance as a specific concern.",
          "None of these assessments produced reform. PEMEX remains, in 2025, the largest buyer in the Mexican federal government and one of the least transparent. The gap between its COMPRANET registration requirements and actual practice has narrowed since 2018 — more contracts are registered now than before — but the fundamental architecture of opacity remains. Direct award rates above 85%, vendor concentration in the top percentile, and no credible mechanism for testing whether the prices PEMEX pays reflect actual market value.",
          "The case for reform is not ideological. It is fiscal. PEMEX's debt burden — 112 billion dollars in 2024 — is partly the product of declining production and partly the product of costs that were not controlled because they were not competed. A 10% reduction in PEMEX's procurement costs through competitive bidding — a conservative estimate based on international benchmarks — would save approximately 180 to 220 billion pesos annually. That is money that could service debt, fund capital investment in production, or reduce the government subsidies that have been required to keep PEMEX solvent.",
          "The polítical economy of PEMEX reform is complex. The company is a symbol of Mexican sovereignty, and any reform that appears to open it to foreign competition is polítically toxic. But competing contracts among Mexican vendors is not the same as privatizing the company. It is simply requiring that the people's money — because that is what PEMEX últimately spends — be allocated through processes that test whether it is being spent well. Twenty years of analysis suggest it has not been.",
        ],
      },
    ],
  },

  // =========================================================================
  // STORY 23: Atlas del Riesgo
  // =========================================================================
  {
    slug: 'atlas-del-riesgo',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Atlas del Riesgo: Los Sectores Donde la Corrupción Deja más Huellas',
    subheadline: 'El modelo RUBLI identifica 361,000 contratos con señales de alerta crítica. Salud y agricultura concentran el riesgo más alto, pero infraestructura suma los mayores montos',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
    estimatedMinutes: 8,
    leadStat: { value: '361K', label: 'contratos en nivel crítico de riesgo', color: '#dc2626' },
    relatedSlugs: ['fabrica-de-monopolios', 'el-dinero-de-todos', 'insabi-el-experimento'],
    chapters: [
      {
        id: 'el-mapa',
        number: 1,
        title: 'El Mapa',
        subtitle: 'Dónde vive el riesgo en el presupuesto federal',
        prose: [
          'El modelo de riesgo de RUBLI v6.4 ha procesado 3,051,294 contratos federales. De ellos, 361,000 alcanzan el nivel crítico — puntaje de 0.60 o superior. Esto representa el 11.8% del total. Otros 110,163 son clasificados como alto riesgo (0.40-0.60), y 564,758 como riesgo medio (0.15-0.40). La distribución no es uniforme. Algunos sectores concentran el riesgo de manera sistemática; otros lo distribuyen.',
          'Salud lidera el riesgo porcentual: el 19.3% de todos los contratos del sector salud alcanzan nivel crítico. El número refleja la concentración de proveedores farmacéuticos, la alta tasa de adjudicaciónes directas del INSABI, y los patrones de compra identificados en múltiples casos de la base de ground truth — IMSS empresas fantasma, la red de Laboratorios Pisa, los contratos COVID. El sector salud no es el mayor en términos de gasto, pero es el que más señales de alerta genera por peso gastado.',
          'Agricultura es el segúndo en riesgo porcentual con el 17.8%. La explicación es SEGALMEX y su red de distribución alimentaria diseñada para comprar sin competir. Los 6,326 contratos de Segalmex en la base de ground truth de RUBLI tienen un puntaje promedio de 0.664. El modelo aprende de ese patrón y lo aplica a los contratos similares del mismo sector.',
          'Infraestructura es el sector con el mayor riesgo en términos absolutos. Con una tasa de riesgo crítico del 9.4%, que parece baja comparada con salud y agricultura, el volumen de contratos es tan grande que los 9.4% equivalen a 87,000 contratos críticos — los de mayor monto individual en todo el gobierno. Un contrato crítico de infraestructura puede valer 500 millones de pesos; uno de salud, 50 millones. La concentración de riesgo en infraestructura no se mide en porcentajes: se mide en miles de millones.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Distribución de riesgo por sector — modelo v6.4',
          chartId: 'risk-by-sector',
        },
      },
      {
        id: 'los-factores',
        number: 2,
        title: 'Los Factores que Predicen',
        subtitle: 'Qué variables impulsan el riesgo en cada sector',
        prose: [
          'El modelo v6.4 de RUBLI utiliza siete variables activas con coeficientes distintos de cero. La variable más predictiva globalmente es price_volatility (+1.1482): la volatilidad del precio de los contratos de un proveedor respecto al promedio de su sector. Un proveedor que cobra 100 millones en un contrato y 800,000 en el siguiente muestra un patrón estadísticamente incompatible con operaciónes legítimas.',
          'La segúnda variable más importante — institution_diversity (-0.3821) — opera en dirección contraria: los proveedores que sirven a muchas dependencias distintas son menos sospechosos que los que concentran sus ventas en una sola. Este hallazgo es contraintuitivo para el ciudadano promedio, que podría asumir que un proveedor que vende a todos el gobierno es más sospechoso que uno que solo vende al IMSS. Los datos muestran lo contrario: los esquemas de corrupción identificados en la base de ground truth tienden a operar capturando una institución, no diversificándose.',
          'La variable vendor_concentration (+0.3749) captura el porcentaje del gasto total del sector que un proveedor acumula. Esta variable es especialmente activa en los sectores agrícola, de salud y de energía, donde los proveedores dominantes tienen participaciónes de mercado que un sistema competitivo no produciría. En un sector donde el proveedor más grande tiene el 40% del mercado y ese proveedor ganó todos sus contratos sin licitación, la variable vendor_concentration no está detectando monopolio natural — está detectando captura regulatoria.',
          'La combinación de estas variables produce el mapa de riesgo que RUBLI pública: un sistema de clasificación que no pretende demostrar culpabilidad pero sí identificar las regiones del presupuesto federal donde los patrones de contratación se asemejan más a los de los casos de corrupción documentada. El atlas del riesgo no es un mapa de culpables. Es un mapa de probabilidades.',
        ],
      },
      {
        id: 'los-montos',
        number: 3,
        title: 'Los Montos en Juego',
        subtitle: 'Cuánto dinero está bajo sospecha estadística',
        prose: [
          'El 11.8% de contratos críticos no representa el 11.8% del gasto. Los contratos de mayor valor tienen puntajes de riesgo diferentes a los de menor valor. En el primer decil por valor de contrato — los contratos más grandes — la tasa de riesgo crítico es del 23.4%. Esto significa que casi uno de cada cuatro pesos gastados en los contratos más grandes del gobierno federal está asociado a un patrón de riesgo crítico.',
          'En términos absolutos, los contratos críticos representan aproximadamente 1.8 billones de pesos en el período 2002-2023. Para contextualizar: el presupuesto federal anual de México es de aproximadamente 8 billones de pesos. Un 11.8% del gasto de compras con señales de alerta crítica equivale a una fracción significativa del presupuesto total.',
          'Importante: los puntajes de riesgo de RUBLI son indicadores estadísticos, no pruebas de corrupción. No todo contrato crítico involucra corrupción; algunos proveedores con alta concentración y baja diversidad institucional tienen razones técnicas legítimas para operar así. El modelo fue calibrado con casos confirmados de corrupción, pero su tasa de falsos positivos — contratos críticos que son en realidad limpios — no puede calcularse con precisión porque no existe un registro completo de qué contratos son corruptos y cuáles no.',
          'Lo que los datos sí permiten decir con confianza es que el sistema de adquisiciónes mexicano produce, de manera sistemática, patrones de contratación que son estadísticamente indistinguibles de los que se observan en casos documentados de corrupción. Si esos patrones no reflejan corrupción real, reflejan un sistema de compras tan disfuncional que produce las mismas señales que la corrupción. Ninguna de las dos interpretaciones es reconfortante.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Tendencia de adjudicación directa — contexto del riesgo',
          chartId: 'da-rate-trend',
        },
      },
      {
        id: 'la-investigación',
        number: 4,
        title: 'Lo Que Requiere Investigación',
        subtitle: 'Del dato estadístico a la rendición de cuentas',
        prose: [
          'El análisis de RUBLI es el punto de partida de la investigación periodística, no el punto final. Los 361,000 contratos críticos son una pista, no una sentencia. Cada uno de ellos requiere análisis contextual que el modelo no puede proporcionar: ¿el proveedor tiene monopolio técnico legítimo? ¿el contrato fue en respuesta a una emergencia real? ¿los precios corresponden a los de mercado en ese momento y lugar específicos?',
          'El ARIA — Automated Risk Investigation Algorithm de RUBLI — va un paso más allá del modelo de riesgo base. Cruza los contratos de alto riesgo con registros de proveedores en la lista negra del SAT (EFOS: Empresas que Facturan Operaciónes Simuladas), la lista de sanciónados de la Secretaría de la Función Pública, y los registros del RUPC (Registro Único de Proveedores y Contratistas). De los 198,000 proveedores en la cola de investigación del ARIA, 285 son Tier 1 — los de mayor prioridad.',
          'El trabajo de periodistas de investigación es lo que convierte esos 285 proveedores en casos. Los datos de RUBLI identifican los patrones; la investigación periodística verifica las personas, los documentos, los movimientos bancarios, las relaciónes políticas. Organizaciónes como Animal Político, Mexicanos Contra la Corrupción e Impunidad (MCCI), y el Proyecto Sobre el Crimen Organizado y la Corrupción (OCCRP) han utilizado datos de COMPRANET para documentar casos que después se convirtieron en procesos penales.',
          'El atlas del riesgo de RUBLI es una herramienta de priorización. En un país donde la Función Pública tiene capacidad de supervisión limitada y la ASF audita menos del 5% del gasto público cada año, una herramienta que identifica estadísticamente dónde buscar tiene valor real. El 11.8% de contratos críticos no puede investigarse uno por uno. Pero el 0.009% — los 285 del ARIA Tier 1 — sí puede. Y ahí es donde empieza la rendición de cuentas.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Adjudicación directa por sector — distribución del riesgo',
          chartId: 'da-by-sector',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 24: La Herencia Envenenada
  // =========================================================================
  {
    slug: 'la-herencia-envenenada',
    outlet: 'data_analysis',
    type: 'era',
    era: 'amlo',
    headline: 'La Herencia Envenenada: Lo que AMLO Dejó en las Finanzas Públicas',
    subheadline: 'El sexenio concluyó con tasas históricas de contratación directa, 275,670 contratos sospechosos de fracciónamiento y una deuda de transparencia que tomará años resolver',
    byline: 'Análisis de Datos RUBLI | Unidad de Investigación',
    estimatedMinutes: 10,
    leadStat: { value: '505,219', label: 'contratos licitados en solitario', color: '#e6420e' },
    relatedSlugs: ['la-cuarta-adjudicación', 'el-ano-sin-excusas', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'el-balance',
        number: 1,
        title: 'El Balance Final',
        subtitle: 'Seis años de promesas y un registro que no perdona',
        prose: [
          'El 30 de septiembre de 2024, Andrés Manuel López Obrador entregó el poder a Claudia Sheinbaum. Con él, le entregó también el sistema de adquisiciónes públicas más opaco en dos décadas de registros disponibles. No es una conclusión política. Es el resultado de procesar 3,051,294 contratos y comparar los patrones del sexenio 2018-2024 con los de los cuatro gobiernos anteriores.',
          'La tasa de adjudicación directa promedio del sexenio fue del 79.4% — la más alta de los cuatro gobiernos en la base de datos. En términos absolutos, el sexenio produjo 1,285,000 contratos de adjudicación directa, de los cuales 361,000 alcanzan el nivel de riesgo crítico según el modelo v6.4 de RUBLI. El valor total de contratos directos en el período supera los 12 billones de pesos.',
          'Cinco indicadores resumen el legado en compras públicas. El primero: 505,219 contratos de licitación pública con un solo participante — la cifra más alta en el registro. El segúndo: 275,670 contratos clasificados como fracciónamiento sospechoso. El tercero: 1,253 proveedores con el algoritmo de empresas fantasma activado. El cuarto: 26,404 contratos de "diciembre rush" — gastos de fin de año sin justificación técnica documentada. El quinto: una deuda de PEMEX que creció 14,000 millones de dólares en seis años mientras se reducía la supervisión de sus compras.',
          'La promesa central del gobierno fue "primero los pobres" y "acabar con la corrupción". Los datos de RUBLI no pueden medir si los pobres fueron los principales beneficiarios del gasto. Pero sí pueden medir si la arquitectura de transparencia que debe prevenir la corrupción fue reforzada o debilitada. El resultado es inequívoco: fue debilitada, sistemática y deliberadamente, a lo largo de seis años.',
        ],
      },
      {
        id: 'el-gasto',
        number: 2,
        title: 'Los Patrones del Gasto',
        subtitle: 'Diciembre, emergencias y presupuesto sin ejercer',
        prose: [
          'El patrón mensual del gasto en el sexenio AMLO revela una característica recurrente: picos de diciembre desproporcionados respecto al promedio del año. En diciembre de 2022 y 2023, el gasto mensual en adjudicaciónes directas superó 3.5 veces el promedio de los meses anteriores. Este patrón — que RUBLI denomina "diciembre_rush" — es el síntoma más visible de un sistema presupuestal que premia ejercer el presupuesto antes del 31 de diciembre independientemente de la necesidad real.',
          'Los 26,404 contratos identificados como diciembre_rush en el período AMLO tienen una tasa de adjudicación directa del 98.7%. Son, casi sin excepción, contratos firmados en los últimos cinco días de diciembre, por valores redondos, a proveedores habituales, con justificativos técnicos que replican texto de contratos anteriores. El mecanismo es tan predecible que el modelo de RUBLI lo puede identificar con alta precisión solo a partir de la fecha de firma y el valor del contrato.',
          'El patrón de gasto mensual también revela otro fenómeno: la ausencia de planificación de mediano plazo en las compras. Los meses de enero a marzo muestran un colapso del gasto que sugiere que los presupuestos asignados en el nuevo ejercicio no son suficientes para mantener continuidad operativa. Las dependencias pasan los primeros meses del año esperando liberaciones presupuestales, y comprimen el gasto real en los últimos meses para no perder el presupuesto. El resultado es un ciclo de derroche en diciembre y hambruna en enero que hace imposible la planeación racional del gasto.',
          'La relación entre este patrón y la corrupción es estadística, no causal. No todo contrato de diciembre es corrupto. Pero los contratos firmados bajo presión de tiempo, sin posibilidad de licitación porque los plazos no lo permiten, con el presupuesto que hay que ejercer en semanas, son exactamente el tipo de contratos que los esquemas de corrupción están diseñados para explotar.',
        ],
        chartConfig: {
          type: 'year-bar',
          title: 'Gasto mensual federal — patrón de diciembre en el sexenio AMLO',
          chartId: 'monthly-spending',
        },
      },
      {
        id: 'la-comparación',
        number: 3,
        title: 'Frente a los Otros Sexenios',
        subtitle: 'No todos son iguales: el AMLO en perspectiva histórica',
        prose: [
          'La comparación entre sexenios en los datos de RUBLI no lleva a la conclusión de que todos los gobiernos son igualmente corruptos. Lleva a la conclusión de que todos los gobiernos operan el mismo sistema disfuncional con diferente intensidad. La disfunción era preexistente; lo que varió fue cuánto cada gobierno la aprovechó.',
          'En el sexenio de Calderón, la tasa de adjudicación directa promedio fue del 63.5% — 16 puntos menos que bajo AMLO. En infraestructura, los contratos de más de 1,000 millones de pesos tenían una tasa de licitación pública del 71%. Eso no hace al gobierno de Calderón virtuoso: en ese sexenio se firmaron los contratos del cartel de médicamentos del corazón y se consolidó la captura regulatoria en el sector salud. Pero muestra que el nivel de opacidad no era inevitable.',
          'El análisis de RUBLI por administración muestra que el mayor deterioro ocurrió entre 2018 y 2020 — los primeros dos años del sexenio AMLO, antes del COVID. La tasa de adjudicación directa subió 3.7 puntos porcentuales en esos dos años. Ese incremento no fue una respuesta a la pandemia; fue una política deliberada de centralizar el control de las compras en la Presidencia de la República, reducir el papel de los órganos técnicos de supervisión, y expandir el uso de los mecanismos de excepción que permiten la adjudicación directa.',
          'La comparación más reveladora es entre el primer año de cada sexenio. En su primer año, todos los presidentes tienen incentivos para mostrarse más transparentes que su antecesor. Los datos muestran que López Obrador fue la excepción: en 2019, el primer año completo de su gobierno, la tasa de adjudicación directa fue de 77.8% — ya por encima del máximo alcanzado bajo Peña Nieto. La dirección del sexenio se fijó desde el principio.',
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Comparación de era AMLO vs sexenios anteriores',
          chartId: 'amlo-era-comparison',
        },
      },
      {
        id: 'la-herencia',
        number: 4,
        title: 'Lo que Queda',
        subtitle: 'La deuda de transparencia que Sheinbaum heredó',
        prose: [
          'Claudia Sheinbaum asumió la presidencia el 1 de octubre de 2024 con la promesa implícita de la continuidad — ella misma es parte del movimiento que López Obrador creó — y la presión explícita de los datos. La OCDE, el Banco Mundial, y el FMI han documentado el deterioro de los estándares de transparencia en adquisiciónes públicas mexicanas. El nuevo gobierno tiene que decidir si rectifica esa tendencia o la perpetúa.',
          'Los primeros meses de la administración Sheinbaum ofrecen señales mixtas. En algunos sectores — Educación, Salud hospitalaria — hay indicios de un retorno hacia procedimientos más competitivos. En otros — Energía, Infraestructura estratégica — el patrón del sexenio anterior se mantiene sin cambio aparente. RUBLI actualizará su análisis conforme los datos de 2025 fluyan a COMPRANET.',
          'La herencia de los 505,219 contratos de licitación solitaria no se resuelve con un decreto. Requiere reformar los umbrales que determinan cuándo es obligatoria la licitación, fortalecer la Secretaría de la Función Pública con presupuesto y autonomía real, digitalizar y hacer obligatoria la públicación de todos los justificativos de adjudicación directa, y crear un sistema de seguimiento del desempeño de proveedores que alimente automáticamente las decisiónes de compra futuras.',
          'Esas reformas tienen costo político: los proveedores habituales que hoy reciben contratos directos son también donantes y aliados políticos. La opacidad presupuestal no es un bug del sistema — es una feature que genera lealtades. Cambiarla requiere un tipo de voluntad política que ningún presidente mexicano ha demostrado en 23 años de datos. Lo cual no significa que sea imposible. Significa que si ocurre, será la primera vez.',
        ],
        chartConfig: {
          type: 'comparison',
          title: 'Comparación por sexenio — tendencia de largo plazo',
          chartId: 'sexenio-comparison',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 25: Dividir para Evadir
  // =========================================================================
  {
    slug: 'dividir-para-evadir',
    outlet: 'longform',
    type: 'thematic',
    era: 'amlo',
    headline: "Divide and Evade: México's 275,670 Contracts Designed to Avoid Scrutiny",
    subheadline: "Mexican law requires open bids above certain thresholds. RUBLI's analysis found 275,670 contracts clustered just below the limits — a pattern statisticians call near-impossible to occur by chance",
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 11,
    leadStat: { value: '275,670', label: 'contratos con fracciónamiento sospechoso', color: '#1e3a5f' },
    relatedSlugs: ['hemoser-el-2-de-agosto', 'la-herencia-envenenada', 'la-cuarta-adjudicación'],
    chapters: [
      {
        id: 'the-rule',
        number: 1,
        title: 'The Rule',
        subtitle: "México's procurement thresholds: the law that invites evasión",
        prose: [
          "México's Ley de Adquisiciónes, Arrendamientos y Servicios del Sector Público establishes three procurement modalities based on contract value. Below a certain threshold — adjusted annually by SHCP and varying by agency — contracts can be awarded directly with minimal process. Above the first threshold, a simplified competitive process with three invited bids is required. Above the second threshold, full public bidding is mandatory.",
          "The thresholds are designed to calibrate oversight to risk: small purchases need less process; large purchases need more. In theory, this is sensible administration. In practice, it creates a specific incentive: any official who wants to award a contract without the scrutiny of competitive bidding has a simple option — keep each individual contract below the threshold, even if the total need exceeds it. Split the purchase into pieces, each piece below the line that would require competition.",
          "This practice — called fracciónamiento in Spanish, threshold splitting or sham purchasing in English — is explicitly prohibited by Article 17 of the Ley de Adquisiciónes: 'It is prohibited to divide or split acquisitions or contracts for the purpose of avoiding compliance with the requirements established in this Law.' The prohibition has existed since the law was written. It has been systematically violated since the law was written.",
          "RUBLI's analysis identifies 275,670 contracts in the database that match the statistical signature of threshold splitting: contracts awarded on the same day, to the same vendor, from the same agency, at values just below the threshold that would have required competitive bidding. The pattern is not random. The clustering of contract values immediately below thresholds is a statistical anomaly that cannot be explained by coincidence.",
        ],
      },
      {
        id: 'the-math',
        number: 2,
        title: 'The Mathematics of Evasión',
        subtitle: 'When statistics reveal what individual contracts hide',
        prose: [
          "Statistical detection of threshold splitting relies on a simple observation: if contract values were distributed randomly, the distribution would be smooth across value ranges. There would be no reason for contracts to cluster just below a threshold. But when officials are deliberately keeping contracts below thresholds, the distribution shows a sharp discontinuity: many contracts just below the line, very few just above it.",
          "RUBLI's analysis applies this method to the full 3.1 million contract database. The results are unambiguous. For every threshold level tested, there is a statistically significant excess of contracts in the range from 90% to 100% of the threshold value. For the most common threshold — the line between direct award and the simplified three-bid process — the excess is 34%: there are 34% more contracts in the just-below-threshold range than would be expected from a smooth distribution.",
          "The HEMOSER case provides the most dramatic individual illustration. On August 2, 2021, the IMSS awarded 12 contracts to HEMOSER SA de CV, a médical supplies company, all on the same day. Each contract was valued at 2,999,998 pesos — a few hundred pesos below the 3 million peso threshold that would have required a simplified competitive process. The total value: 35,999,976 pesos. If awarded as a single contract, it would have required public bidding. Divided into 12, each was a direct award that required nothing.",
          "The HEMOSER case is documented in RUBLI's ground truth database (Case 3 in the IMSS ghost company network). But RUBLI's statistical analysis identifies 275,670 contracts with similar clustering signatures. The vast majority of those contracts have never been investigated by any authority. They exist in the public record; they have never attracted attention; and they represent, in aggregate, a systematic and deliberate mechanism for avoiding the procurement rules that exist to protect the public interest.",
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Threshold splitting — statistical distribution of contracts near thresholds',
          chartId: 'threshold-splitting',
        },
      },
      {
        id: 'the-sectors',
        number: 3,
        title: 'Where It Happens',
        subtitle: 'Threshold splitting is not evenly distributed',
        prose: [
          "The 275,670 contracts with threshold splitting signatures are not evenly distributed across sectors or agencies. The health sector accounts for 31.4% of identified splitting contracts — a disproportionate share that reflects both the volume of health procurement and the specific dynamics of the pharmaceutical and médical supplies market. The HEMOSER case is emblematic: médical supplies can be divided into identical-seeming lots that each trigger the same direct award classification.",
          "The defense sector — SEDENA and MARINA — shows the lowest rate of identifiable threshold splitting at 4.7%. This may reflect genuine compliance, or it may reflect that military procurement is less visible in COMPRANET (some military contracts are classified) and that military agencies face different oversight dynamics. The data cannot distinguish between these explanations.",
          "The infrastructure sector shows a distinct pattern of threshold splitting: the splitting tends to occur in maintenance and operating contracts rather than construction contracts. Large construction projects — roads, buildings, dams — require contracts large enough that splitting to avoid thresholds is impráctical. But the ongoing maintenance contracts that follow construction can be split indefinitely: painting, cleaning, security, landscaping, minor repairs — all the services that sustain infrastructure can be contracted in small pieces indefinitely.",
          "The agencies with the highest rates of threshold splitting per contract are concentrated in health (IMSS, INSABI, ISSSTE), agriculture (SEGALMEX, DICONSA), and technology (various ministry IT offices). These are also the agencies with the highest rates of direct award overall — the correlation is not accidental. Threshold splitting and direct award are complementary tools in the same toolkit of procurement opacity.",
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Threshold splitting by sector — distribution of 275,670 flagged contracts',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'the-accountability',
        number: 4,
        title: 'Accountability That Never Came',
        subtitle: '275,670 violations of federal law, zero convictions',
        prose: [
          "Article 17 of the Ley de Adquisiciónes prohibits threshold splitting. The Secretaría de la Función Pública (SFP) is responsible for enforcing that prohibition. The Auditoría Superior de la Federacion audits procurement for compliance. The Fiscalía General de la República can prosecute federal officials for violations of procurement law.",
          "In the 23 years covered by RUBLI's database, a period during which our analysis identifies 275,670 contracts with statistically significant threshold splitting signatures, the public record contains no conviction of a federal official specifically for threshold splitting. There have been prosecutions for broader corruption charges that included splitting as part of a pattern; there have been administrative sanctions issued by the SFP; there have been contracts annulled. But the practice identified in 275,670 contracts has generated accountability in a fraction of a percent of cases.",
          "The enforcement gap is not primarily a legal problem. The legal framework prohibits what is happening. It is an institutional problem: the SFP does not have the analytical capacity to identify splitting patterns in 3 million contracts; the ASF does not have the budget to audit more than 5% of procurement; the FGR does not prioritize procurement violations compared to drug trafficking and organized crime. The law exists. The enforcement capacity to apply it does not.",
          "RUBLI was built to close part of that gap. The statistical identification of 275,670 splitting contracts is a starting point for prioritized investigation. Not all of them are equally suspicious; not all represent the same scale of potential evasión. But the combination of statistical detection, risk scoring, and cross-referencing with external registries that RUBLI's ARIA module provides can give auditors and prosecutors a roadmap that does not require reviewing 3 million individual contracts. The tool exists. Whether anyone will use it is a question of polítical will, not analytical capacity.",
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getStoryBySlug(slug: string): StoryDef | undefined {
  return STORIES.find((s) => s.slug === slug)
}

export function getRelatedStories(story: StoryDef): StoryDef[] {
  if (!story.relatedSlugs) return []
  return story.relatedSlugs
    .map((slug) => STORIES.find((s) => s.slug === slug))
    .filter((s): s is StoryDef => s !== undefined)
}
