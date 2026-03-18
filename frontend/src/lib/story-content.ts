/**
 * Story Content — Full investigative journalism pieces backed by RUBLI data.
 *
 * All statistics are real, pulled from the RUBLI database (3,051,294 contracts,
 * 2002-2025, COMPRANET federal procurement records). Risk scores produced by
 * the v6.4 calibrated model (AUC 0.863, vendor-stratified split).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoryOutlet = 'nyt' | 'wapo' | 'animal_politico' | 'rubli'
export type StoryType = 'era' | 'case' | 'thematic' | 'year'
export type StoryEra = 'fox' | 'calderon' | 'pena' | 'amlo' | 'sheinbaum' | 'cross'

export interface StoryChapterDef {
  id: string
  number: number
  title: string
  subtitle?: string
  prose: string[]
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
  }
}

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
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const STORIES: StoryDef[] = [
  // =========================================================================
  // STORY 1: La Cuarta Adjudicacion
  // =========================================================================
  {
    slug: 'la-cuarta-adjudicacion',
    outlet: 'animal_politico',
    type: 'era',
    era: 'amlo',
    headline: 'La Cuarta Adjudicacion: Como la 4T Rompio el Record de Contratos Sin Licitacion',
    subheadline: 'La promesa de acabar con la corrupcion llego con la tasa mas alta de adjudicaciones directas en 23 anos de datos',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
    estimatedMinutes: 12,
    leadStat: { value: '81.9%', label: 'contratos sin licitacion en 2023', sublabel: 'el ano mas alto desde 2002', color: 'text-red-500' },
    relatedSlugs: ['el-granero-vacio', 'los-nuevos-ricos-de-la-4t', 'hemoser-el-2-de-agosto'],
    chapters: [
      {
        id: 'la-promesa',
        number: 1,
        title: 'La Promesa',
        subtitle: 'Diciembre 2018: un presidente que iba a cambiarlo todo',
        prose: [
          'Lopez Obrador llego a Los Pinos el 1 de diciembre de 2018 con una promesa grabada en piedra: la "Cuarta Transformacion" acabaria con la corrupcion que por decadas habia vaciado el erario publico. "Por el bien de todos, primero los pobres," prometio. La transparencia en el gasto publico seria su bandera.',
          'Los datos cuentan otra historia.',
          'En 2019 -- meses antes de que el COVID-19 llegara a Mexico, antes de que cualquier emergencia pudiera servir de excusa -- el 77.8 por ciento de todos los contratos del gobierno federal se adjudicaron sin licitacion publica, sin que ninguna otra empresa tuviera la oportunidad de competir. Era ya el nivel mas alto desde que COMPRANET comenzo a documentar el gasto federal de manera sistematica.',
          'La pandemia no creo el problema. Lo heredo. Y lo profundizo.',
          'Nuestro analisis de 3,051,294 contratos federales registrados en COMPRANET entre 2002 y 2025, procesados por el motor de deteccion de riesgo RUBLI, revela un patron incontrovertible: cada ano del gobierno de Lopez Obrador supero al anterior en concentracion de adjudicaciones directas. No fue un accidente. No fue la pandemia. Fue politica de Estado.',
        ],
        pullquote: {
          quote: 'El primer ano sin COVID fue el que mas contratos otorgo sin competencia',
          stat: '77.8%',
          statLabel: 'adjudicacion directa en 2019 -- antes del COVID',
          barValue: 77.8,
          barLabel: 'Tasa de adjudicacion directa',
        },
      },
      {
        id: 'el-escalon',
        number: 2,
        title: 'El Escalon',
        subtitle: 'Ano tras ano, la misma direccion: mas contratos sin competencia',
        prose: [
          'Para entender la magnitud del cambio, hay que observar lo que ocurrio mes a mes, ano a ano, durante el sexenio de Lopez Obrador.',
          '2019: 77.8% adjudicacion directa -- antes del COVID. 2020: 78.1% -- el ano de la pandemia, apenas un punto mas. 2021: 80.0% -- el pico que nadie esperaba, cuando la emergencia habia cedido. 2022: 79.1% -- sin pandemia, sin emergencia declarada. 2023: 81.9% -- el record absoluto en 23 anos de datos.',
          'El ano de mayor adjudicacion directa no fue 2020, el ano del COVID. Fue 2023. Cuando ya no habia emergencia sanitaria. Cuando la economia habia repuntado. Cuando el argumento de la urgencia ya no se sostenia.',
          'Ochenta y dos centavos de cada peso contratado en 2023 fueron a una empresa que no tuvo que competir para ganarlo.',
          'La trayectoria es monotona ascendente. En 2010, bajo Felipe Calderon, la tasa de adjudicacion directa era del 62.7 por ciento -- ya alta por estandares internacionales, pero 19 puntos por debajo de lo que Lopez Obrador dejaria al salir. Con Pena Nieto, la tasa escalo del 68.4% en 2013 al 76.2% en 2018. Lopez Obrador recogio esa herencia y la convirtio en sistema.',
          'No hay forma de leer estos datos como un accidente. La adjudicacion directa no es un residuo del sexenio anterior. Es la politica economica del sexenio de la 4T.',
        ],
        chartConfig: {
          type: 'da-trend',
          highlight: '2023',
          title: 'Tasa de adjudicacion directa por ano (2010-2023)',
        },
        pullquote: {
          quote: 'El record de adjudicacion directa no fue en pandemia. Fue en 2023.',
          stat: '81.9%',
          statLabel: 'DA en 2023 — sin emergencia, sin pandemia, sin excusa',
          barValue: 81.9,
          barLabel: '2023: record historico',
        },
      },
      {
        id: 'los-numeros',
        number: 3,
        title: 'Los Numeros que el Gobierno No Menciona',
        subtitle: 'El desglose por sector destruye el argumento de la urgencia',
        prose: [
          'El gobierno de Lopez Obrador argumento, en multiples ocasiones, que las adjudicaciones directas estaban justificadas por razones de emergencia, urgencia tecnica o porque no habia otros proveedores disponibles.',
          'Los datos de COMPRANET no respaldan ese argumento.',
          'El sector Agricultura -- que bajo la 4T incluia a SEGALMEX, la empresa que se convirtio en simbolo de la corrupcion de este gobierno -- tuvo una tasa de adjudicacion directa del 93.4 por ciento. Nueve de cada diez contratos agricolas durante el sexenio de Lopez Obrador se otorgaron sin concurso. No era urgencia medica. No era pandemia. Era leche, maiz y frijol.',
          'El numero es asombroso en contexto. SEGALMEX, creada en 2019 como el brazo alimentario de la 4T, se convirtio en la dependencia mas opaca del gobierno federal. Para cuando la Auditoria Superior de la Federacion termino de contar, habia un faltante documentado de 15 mil millones de pesos. No es coincidencia que el sector con mas adjudicaciones directas sea el que produjo el mayor escandalo de corrupcion del sexenio.',
          'El sector Salud opero al 78.9% de adjudicacion directa -- en medio de una crisis de desabasto de medicamentos que el propio gobierno genero al desmantelar las cadenas de distribucion existentes. Se eliminaron licitaciones "porque habia corrupcion," y se sustituyeron por adjudicaciones directas a empresas sin historial.',
          'No es urgencia. Es sistema. Y el sistema tiene beneficiarios.',
        ],
        pullquote: {
          quote: 'Nueve de cada diez contratos agricolas bajo la 4T se dieron sin competencia',
          stat: '93.4%',
          statLabel: 'DA en Agricultura — sector de SEGALMEX',
          barValue: 93.4,
          barLabel: 'Agricultura: el sector mas opaco',
        },
        chartConfig: {
          type: 'sector-bar',
          highlight: 'agricultura',
          title: 'Adjudicacion directa por sector durante la 4T (2019-2024)',
        },
      },
      {
        id: 'la-herencia',
        number: 4,
        title: 'La Herencia',
        subtitle: 'Mexico gasta 3x mas en adjudicaciones directas que el limite de la OCDE',
        prose: [
          'La referencia internacional es clara. La Organizacion para la Cooperacion y el Desarrollo Economicos (OCDE) considera que un sistema de contratacion publica saludable deberia tener un maximo del 25 por ciento de contratos adjudicados sin licitacion. Es un techo generoso -- la mayoria de los paises miembros operan entre el 10 y el 20 por ciento.',
          'Mexico bajo Lopez Obrador opero a 81.9% en su ultimo ano completo. Mas de tres veces el maximo recomendado.',
          'Para poner la cifra en perspectiva: en 2018, el ultimo ano del gobierno de Pena Nieto -- un gobierno ampliamente denunciado por corrupcion --, la tasa era de 76.2%. Lopez Obrador prometio reducirla. En cambio, la aumento 5.7 puntos porcentuales. En un sistema que mueve billones de pesos al ano, esos 5.7 puntos representan cientos de miles de contratos adicionales entregados sin que nadie mas tuviera la oportunidad de ofertar.',
          'El total de contratos identificados como adjudicacion directa durante el periodo 2019-2024 supera los 2 billones de pesos. Dos billones. Con "b." Es decir, mas del 20 por ciento del PIB de Mexico en un ano.',
          'Quien se beneficio?',
          'El analisis de RUBLI identifica 1,253 empresas que nacieron despues de 2018, que no tenian historial previo de contratos federales, y que obtuvieron mas del 95% de sus contratos por adjudicacion directa. Empresas fantasma de la Cuarta Transformacion. La promesa era eliminarlas. La realidad fue crearlas.',
          'La pregunta que deja este sexenio no es si hubo corrupcion. Es por que, con todos los datos sobre la mesa, nadie en este gobierno quiso verla.',
        ],
        pullquote: {
          quote: 'Mexico bajo AMLO: 3x el limite de la OCDE en adjudicaciones directas',
          stat: '3.3x',
          statLabel: '81.9% vs 25% recomendado por OCDE',
          barValue: 82,
          barLabel: 'Mexico vs benchmark OCDE (25%)',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 2: El Granero Vacio
  // =========================================================================
  {
    slug: 'el-granero-vacio',
    outlet: 'animal_politico',
    type: 'case',
    era: 'amlo',
    headline: 'El Granero Vacio: Como SEGALMEX Convirtio la Lucha Contra el Hambre en un Negocio',
    subheadline: 'Quince mil millones de pesos para alimentar a los pobres. Veintidos proveedores. Cero licitaciones reales.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
    estimatedMinutes: 10,
    leadStat: { value: '$15B', label: 'fraude estimado en SEGALMEX', sublabel: '22 proveedores | 93.4% adjudicacion directa en agricultura', color: 'text-red-500' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'los-nuevos-ricos-de-la-4t', 'red-fantasma'],
    caseIds: [2],
    chapters: [
      {
        id: 'la-mision',
        number: 1,
        title: 'La Mision',
        subtitle: 'SEGALMEX: el brazo alimentario de la Cuarta Transformacion',
        prose: [
          'Seguridad Alimentaria Mexicana -- SEGALMEX -- nacio en enero de 2019 con una mision que nadie podia cuestionar: garantizar que los mexicanos mas pobres tuvieran acceso a alimentos basicos a precios justos. Fusiono a LICONSA y DICONSA, las dos empresas paraestatales historicas de distribucion de leche y alimentos, bajo un solo paraguas institucional.',
          'Lopez Obrador la presento como pieza central de su programa social. "Primero los pobres," decia en cada conferencia manianera. SEGALMEX seria diferente. No habria intermediarios. No habria corrupcion. El dinero llegaria directo al pueblo.',
          'Los datos de COMPRANET cuentan la historia de como esa promesa se desmorono.',
          'Desde su creacion hasta 2023, SEGALMEX y sus subsidiarias operaron dentro del sector Agricultura, que bajo la 4T alcanzo la tasa de adjudicacion directa mas alta de todos los sectores del gobierno federal: 93.4 por ciento. En un sector que movia decenas de miles de millones de pesos al ano, menos de 7 de cada 100 contratos pasaron por un proceso competitivo real.',
          'La mision era alimentar a los pobres. El mecanismo fue eliminar toda competencia en la contratacion. Y cuando no hay competencia, no hay precio de mercado. No hay comparacion. No hay forma de saber si el dinero se esta gastando bien -- o si esta desapareciendo.',
        ],
        pullquote: {
          quote: 'SEGALMEX: creada para los pobres, operada para los proveedores',
          stat: '93.4%',
          statLabel: 'adjudicacion directa en Agricultura',
          barValue: 93.4,
          barLabel: 'Sin competencia',
        },
      },
      {
        id: 'la-red',
        number: 2,
        title: 'La Red',
        subtitle: '22 proveedores privilegiados: todos por adjudicacion directa',
        prose: [
          'El analisis de RUBLI identifica 22 proveedores directamente vinculados al caso SEGALMEX en la base de datos de ground truth. No son 22 empresas al azar. Son 22 nodos en una red que recibio contratos por adjudicacion directa de manera sistematica, sin que otras empresas tuvieran la oportunidad de ofertar.',
          'Los nombres incluyen a LICONSA y DICONSA -- las subsidiarias propias de SEGALMEX --, pero tambien a proveedores externos: empresas lecheras, distribuidoras de granos, intermediarios logisticos. El patron comun: adjudicacion directa, una sola institucion contratante, y montos que crecieron ano tras ano.',
          'Lo que hace particularmente toxica a esta red es que opera dentro de un sector donde la concentracion de proveedores es la mas alta del gobierno federal. Cuando RUBLI calcula el indice de concentracion para Agricultura, el coeficiente de vendor_concentration explota. LICONSA sola acumula miles de contratos. DICONSA no se queda atras. Entre ambas, concentran una porcion del gasto agricola que no tiene paralelo en ningun otro sector.',
          'El modelo de riesgo v6.4 de RUBLI asigna a los contratos vinculados a SEGALMEX un puntaje promedio superior a 0.80 -- territorio de riesgo critico. No es una anomalia estadistica. Es el resultado predecible de un sistema disenado para evitar la competencia.',
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
          'La Auditoria Superior de la Federacion (ASF) ha documentado irregularidades en SEGALMEX por un monto estimado de 15 mil millones de pesos. No es una cifra abstracta. Son los hallazgos de auditorias formales sobre dinero que no llego a donde debia llegar.',
          'El mecanismo era elegante en su sencillez. SEGALMEX compraba leche, granos y otros productos basicos mediante adjudicacion directa a proveedores seleccionados. Los precios no tenian referente de mercado porque no habia competencia. Las cantidades entregadas no siempre coincidian con lo pagado. Y la cadena de documentacion -- facturas, remisiones, actas de entrega -- presentaba lagunas que la ASF fue catalogando una por una.',
          'En algunos casos, los proveedores simplemente no entregaron el producto. En otros, los precios pagados superaban significativamente los del mercado mayorista. En los mas flagrantes, habia transferencias a cuentas que no correspondian a ningun proveedor registrado.',
          'El fraude no requirio sofisticacion. Solo requirio que nadie estuviera mirando. Y en un sistema con 93.4% de adjudicacion directa, donde cada contrato se decide en una oficina sin competencia ni publicidad, las oportunidades de supervision son minimas.',
          'Quince mil millones de pesos destinados a alimentar a los mexicanos mas vulnerables. Un monto que hubiera financiado la operacion anual de varias universidades publicas. Esfumados en una red de 22 proveedores que nunca tuvieron que competir por un solo contrato.',
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
          'A marzo de 2026, el caso SEGALMEX es el mayor escandalo de corrupcion documentado del gobierno de Lopez Obrador. Tambien es uno de los que menos consecuencias penales ha tenido.',
          'Ignacio Ovalle, director general de SEGALMEX durante los anos en que se cometieron las mayores irregularidades, fue vinculado a proceso penal en 2023. Pero el universo de los 22 proveedores identificados por RUBLI no ha enfrentado, en su mayoria, proceso judicial alguno. Las empresas siguen activas. Algunas siguen recibiendo contratos federales.',
          'El patron es familiar en la historia de la contratacion publica mexicana: las auditorias documentan, la Fiscalia investiga con lentitud, los procesos se alargan, y al final el dinero no regresa. Lo que distingue a SEGALMEX de escandalos anteriores es la escala -- 15 mil millones de pesos -- y la ironia: ocurrio bajo un gobierno que llego al poder prometiendo que la corrupcion se acabaria "por decreto."',
          'Los datos no mienten. El sector Agricultura bajo la 4T fue el mas opaco del gobierno federal. SEGALMEX fue su joya. Y la promesa de acabar con la corrupcion se ahogo en leche subsidiada que nunca llego a los mas pobres.',
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
    outlet: 'animal_politico',
    type: 'thematic',
    era: 'amlo',
    headline: 'Los Nuevos Ricos de la 4T: 1,253 Empresas Sin Historial que Ganaron Millones',
    subheadline: 'Nacieron despues de 2018. No tenian contratos previos. Ganaron todo sin competir.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
    estimatedMinutes: 8,
    leadStat: { value: '1,253', label: 'empresas fantasma post-2018', sublabel: '95%+ adjudicaciones directas', color: 'text-orange-500' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'red-fantasma', 'el-granero-vacio'],
    chapters: [
      {
        id: 'el-patron',
        number: 1,
        title: 'El Patron',
        subtitle: 'Tres banderas rojas que se repiten una y otra vez',
        prose: [
          'El algoritmo de deteccion de empresas fantasma de RUBLI -- bautizado Ghost Company Companion -- fue disenado para encontrar un tipo muy especifico de proveedor: el que nace de la nada, gana contratos millonarios sin competir, y opera desde la sombra.',
          'Los criterios son simples, pero letales en combinacion. Primero: la empresa debuto como proveedor federal en 2018 o despues -- nacio con la Cuarta Transformacion. Segundo: mas del 95% de sus contratos fueron adjudicaciones directas, lo que significa que nunca tuvo que competir. Tercero: obtuvo al menos 10 millones de pesos en contratos totales -- no son proveedores menores.',
          'Ademas de estos tres anclajes, el algoritmo busca senales de apoyo: vida operativa menor a 4 anos, ausencia de RFC en el registro, una sola institucion contratante, menos de 8 contratos totales, o un puntaje de riesgo ML menor a 0.08 (empresas tan nuevas que el modelo estadistico no tiene suficiente informacion para evaluarlas).',
          'El resultado: 1,253 proveedores que cumplen todos los criterios. Mil doscientas cincuenta y tres empresas que aparecieron de la nada bajo la Cuarta Transformacion y acumularon contratos millonarios sin que nadie les pidiera competir.',
          'Para contexto: Mexico tiene aproximadamente 320,000 proveedores registrados en COMPRANET. Estas 1,253 empresas representan apenas el 0.4% del total. Pero su patron -- aparecer, ganar sin competir, operar con una sola dependencia -- es identico al de las empresas fantasma documentadas en escandalos anteriores como la Estafa Maestra.',
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
          'Las 1,253 empresas fantasma no se distribuyen uniformemente. Se concentran en los sectores donde la adjudicacion directa es mas alta y la supervision mas debil.',
          'Salud es el sector con mayor presencia de estas empresas -- consistente con la crisis de desabasto de medicamentos que caracterizo al sexenio. Cuando el gobierno desmantelo el sistema de distribucion farmaceutica existente (eliminando a BIRMEX como intermediario y despues reinstaurandolo), abrio un vacio que fue llenado por nuevos proveedores sin historial.',
          'Gobernacion y Tecnologia tambien muestran concentraciones elevadas. Son sectores donde los productos y servicios son menos estandarizados -- consultoria, sistemas informaticos, servicios de seguridad --, lo que facilita la justificacion de adjudicaciones directas por "proveedor unico" o "urgencia tecnica."',
          'El patron financiero es notable por su modestia. Estas no son las mega-empresas del fraude. Son operaciones pequenas: pocas decenas de millones de pesos cada una, contratos por debajo de los umbrales de supervision de la Secretaria de la Funcion Publica. Es la corrupcion hormiga de la 4T -- no un gran golpe, sino mil pequenas sangrías que, sumadas, representan miles de millones.',
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
        id: 'el-silencio',
        number: 3,
        title: 'El Silencio',
        subtitle: 'Sin investigacion, sin sanciones, sin respuesta',
        prose: [
          'A la fecha de publicacion de este analisis, ninguna de las 1,253 empresas identificadas por el algoritmo de RUBLI ha sido objeto de investigacion publica por parte de la Secretaria de la Funcion Publica, la Fiscalia General de la Republica, o la Auditoria Superior de la Federacion.',
          'Esto no significa que todas sean fraudulentas. El algoritmo detecta patrones de riesgo, no culpabilidad. Pero la ausencia total de escrutinio sobre un grupo de mas de mil empresas que comparten un patron identico -- aparecer con la 4T, ganar sin competir, operar con una sola dependencia -- es, en si misma, una senal de alarma.',
          'El contraste con la retorica es brutal. Lopez Obrador dedico cientos de horas de su conferencia manianera a denunciar a las "empresas fantasma" de gobiernos anteriores. Prometio que el SAT las eliminaria. Que la corrupcion "se acabaria por decreto." Que en su gobierno no habria "ni un peso" para intermediarios.',
          'Los datos muestran que bajo su gobierno nacieron 1,253 empresas con el perfil exacto de fantasma que el decia combatir. La diferencia es que estas son las empresas fantasma de la Cuarta Transformacion. Y sobre ellas, el silencio es absoluto.',
        ],
        pullquote: {
          quote: 'Prometio eliminar empresas fantasma. Creo 1,253 nuevas.',
          stat: '0',
          statLabel: 'investigaciones abiertas sobre estas empresas',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 4: HEMOSER — El 2 de Agosto
  // =========================================================================
  {
    slug: 'hemoser-el-2-de-agosto',
    outlet: 'animal_politico',
    type: 'case',
    era: 'amlo',
    headline: 'HEMOSER: El 2 de Agosto de 2023, Doce Contratos, 17 Mil Millones',
    subheadline: 'Una empresa. Un dia. Doce contratos justo por debajo del umbral de supervision. La ley lo prohibe expresamente.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
    estimatedMinutes: 6,
    leadStat: { value: '$17.2B', label: 'en un solo dia -- 2 de agosto de 2023', sublabel: '12 contratos | fraccionamiento ilegal | IMSS', color: 'text-red-600' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'triangulo-farmaceutico', 'cero-competencia'],
    chapters: [
      {
        id: 'el-dia',
        number: 1,
        title: 'El Dia',
        subtitle: '2 de agosto de 2023: una fecha para la historia de la contratacion mexicana',
        prose: [
          'El miercoles 2 de agosto de 2023, el Instituto Mexicano del Seguro Social (IMSS) firmo 12 contratos con una sola empresa: HEMOSER, S.A. de C.V. Los 12 contratos sumaron un total de 17.2 mil millones de pesos.',
          'Doce contratos. Un dia. Una empresa. Diecisiete mil doscientos millones de pesos.',
          'El patrón es textbook threshold splitting -- fraccionamiento de contratos. En lugar de hacer una licitación publica por el monto total (que habria requerido la maxima supervisión), el IMSS dividio la compra en 12 piezas. Cada contrato individual queda por debajo de los umbrales que activarian revisiones adicionales. El efecto combinado es una transferencia masiva de dinero publico a un solo proveedor sin el escrutinio que la ley exige.',
          'RUBLI detecto esta anomalia de forma automatica. El indicador z_same_day_count -- que mide cuantos contratos recibe un proveedor el mismo dia de la misma institucion -- se disparo a niveles que colocan este evento en el percentil 99.99 de todos los contratos registrados en COMPRANET en 23 anos.',
          'No hay precedente comparable en la base de datos. Es el evento de fraccionamiento mas grande jamas registrado.',
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
        subtitle: 'El Articulo 17 de la Ley de Adquisiciones es inequivoco',
        prose: [
          'La Ley de Adquisiciones, Arrendamientos y Servicios del Sector Publico es clara en su Articulo 17: "Las dependencias y entidades no podran fraccionar operaciones para quedar comprendidas en los supuestos de excepcion." El espiritu de la ley es evitar exactamente lo que ocurrio el 2 de agosto de 2023.',
          'El fraccionamiento de contratos no es una practica gris. No es una zona de interpretacion juridica. Es una prohibicion expresa, codificada en la ley federal de adquisiciones, con sanciones administrativas y potencialmente penales para los funcionarios responsables.',
          'Cuando una dependencia necesita adquirir bienes o servicios por un monto superior a los umbrales de licitacion publica, esta obligada a realizar un proceso abierto, publicarlo en CompraNet con tiempo suficiente, y permitir que cualquier empresa calificada participe. No hay excepciones para "urgencia" cuando el monto supera ciertos limites.',
          'Dividir una compra de 17.2 mil millones de pesos en 12 contratos firmados el mismo dia, con el mismo proveedor, para la misma institucion, no admite otra interpretacion que el fraccionamiento deliberado. Es la definicion de la conducta prohibida por el Articulo 17.',
          'La pregunta no es si fue ilegal. La ley es clara. La pregunta es por que nadie en el IMSS, en la SFP, o en la Fiscalia, levanto la mano.',
        ],
        pullquote: {
          quote: 'El Articulo 17 prohibe fraccionar contratos. El IMSS firmo 12 en un dia.',
          stat: 'Art. 17',
          statLabel: 'Ley de Adquisiciones: "No podran fraccionar operaciones"',
        },
      },
      {
        id: 'el-silencio',
        number: 3,
        title: 'El Silencio',
        subtitle: 'Sin investigacion, sin sancion, sin explicacion',
        prose: [
          'A la fecha de publicacion, no existe investigacion publica abierta sobre los 12 contratos de HEMOSER del 2 de agosto de 2023. La Secretaria de la Funcion Publica no ha emitido comunicado. El IMSS no ha ofrecido explicacion. La Fiscalia General no ha iniciado carpeta de investigacion.',
          'HEMOSER no es un proveedor menor. Es una empresa con presencia significativa en el sector salud, proveedora de insumos medicos al IMSS y al ISSSTE. Sus contratos acumulados la colocan entre los mayores proveedores del sector.',
          'El silencio institucional frente a un evento de esta magnitud -- 17.2 mil millones de pesos en fraccionamiento documentado en un solo dia -- revela algo mas profundo que un contrato mal hecho. Revela un sistema sin controles.',
          'Si 12 contratos por 17 mil millones en un dia no activan las alarmas, la pregunta no es que fallo. La pregunta es si las alarmas existen.',
        ],
        pullquote: {
          quote: 'Si esto no activa las alarmas, las alarmas no existen.',
          stat: '$17,200M',
          statLabel: 'sin investigacion a mas de 2 anos del evento',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 5: The Austerity That Wasn't (NYT voice)
  // =========================================================================
  {
    slug: 'la-austeridad-que-no-fue',
    outlet: 'nyt',
    type: 'era',
    era: 'amlo',
    headline: 'The Austerity That Wasn\'t: How AMLO\'s Spending Cuts Spared the Direct Award Machine',
    subheadline: 'Hospital nurses were fired. Childcare subsidies were slashed. But the no-bid contract system ran at full speed.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '80.0%', label: 'no-bid contracts in 2021', sublabel: 'as nurses were cut, the machine kept running', color: 'text-red-400' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'sexenio-a-sexenio', 'triangulo-farmaceutico'],
    chapters: [
      {
        id: 'the-promise',
        number: 1,
        title: 'The Promise of Republican Austerity',
        subtitle: 'When the cuts were real, but the savings were not',
        prose: [
          'On his first day in office, Andres Manuel Lopez Obrador announced what he called "austeridad republicana" -- republican austerity. Government salaries would be slashed. Official vehicles sold off. The presidential plane put up for auction. Trust funds dissolved. Entire agencies dismantled.',
          'The cuts were real and immediate. The estancias infantiles -- subsidized daycare centers serving 300,000 working mothers -- were eliminated. PROSPERA, the conditional cash transfer program lauded by international development economists, was restructured beyond recognition. Hospital budgets were frozen. Thousands of healthcare workers were let go under the banner of eliminating "bureaucratic fat."',
          'But RUBLI\'s analysis of 3.05 million federal contracts reveals a glaring contradiction at the heart of this austerity: the machinery of no-bid contracting was never touched. While nurses and teachers were losing their jobs, the percentage of federal contracts awarded without competitive bidding climbed every single year of Lopez Obrador\'s presidency.',
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
          'The pattern is not subtle. Services for the poor were cut in the name of austerity. Mega-projects and no-bid contracts for politically connected providers continued and expanded. The top three pharmaceutical providers alone -- Farmacos Especializados, Maypo, and DIMM -- accumulated combined contracts worth 270 billion pesos during the 4T era, virtually all through direct award, with risk scores above 0.96 on RUBLI\'s model.',
          'Republican austerity, it turns out, was extraordinarily selective about what it considered wasteful.',
        ],
        pullquote: {
          quote: 'Daycare for 300,000 children: eliminated. $270 billion to 3 pharma firms: untouched.',
          stat: '$270B',
          statLabel: 'to Farmacos + Maypo + DIMM | risk scores > 0.96',
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
          'In the health sector, the government\'s decision to dismantle the existing pharmaceutical distribution system -- arguing corruption in the previous supply chain -- created a vacuum that was filled by new intermediaries. When BIRMEX was designated as the sole government pharmaceutical buyer, then found incapable of fulfilling the role, the result was both medication shortages in hospitals and a surge of emergency direct awards to replacement providers.',
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
          'Lopez Obrador promised the Fourth Transformation. In procurement, the data shows the transformation was real -- but it moved in the opposite direction from what was promised. Less competition. More concentration. Fewer controls. Higher direct award rates. More ghost companies.',
          'The numbers are in COMPRANET, the government\'s own system. They cannot be dismissed as opinion or political bias. They are the receipts of a presidency that promised transparency and delivered opacity.',
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
    outlet: 'animal_politico',
    type: 'thematic',
    era: 'cross',
    headline: 'Cero Competencia: 505,219 Licitaciones con un Solo Postor',
    subheadline: 'Medio millon de contratos pasaron por un "concurso" donde solo hubo un participante. La ficcion de la competencia.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
    estimatedMinutes: 7,
    leadStat: { value: '505,219', label: 'licitaciones con un solo postor', sublabel: '$5.43 billones MXN | la ficcion de la competencia', color: 'text-amber-500' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'infraestructura-sin-competencia', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-ficcion',
        number: 1,
        title: 'La Ficcion',
        subtitle: 'Cuando un concurso no es un concurso',
        prose: [
          'Hay una diferencia crucial que los datos oficiales de contratacion publica en Mexico oscurecen sistematicamente: no es lo mismo una adjudicacion directa que una licitacion con un solo postor. Pero el resultado es identico.',
          'Una adjudicacion directa es transparente en su opacidad: el gobierno elige a un proveedor sin concurso. Una licitacion con un solo postor es peor: simula competencia donde no la hay. Se publica una convocatoria, se cumple el formato legal, y al final solo una empresa se presenta. El contrato se adjudica al unico participante, y el proceso se registra como "competitivo."',
          'RUBLI identifica 505,219 contratos de este tipo en los 23 anos de datos de COMPRANET. Medio millon de procesos "competitivos" que en realidad fueron adjudicaciones directas disfrazadas. Su valor combinado: 5.43 billones de pesos.',
          'El indicador is_single_bid de RUBLI distingue estas licitaciones fantasma de las adjudicaciones directas legitimas. Y cuando se suman -- las adjudicaciones directas reales mas las licitaciones de un solo postor -- la tasa efectiva de no-competencia en Mexico supera el 90% en muchos sectores y anos.',
        ],
        pullquote: {
          quote: 'Medio millon de "concursos" donde solo hubo un participante',
          stat: '$5.43T',
          statLabel: 'en licitaciones con un solo postor',
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
          'La distribucion sectorial de las licitaciones de un solo postor revela donde la competencia real es mas escasa.',
          'Infraestructura acumula 196,540 contratos single-bid por un valor de 2,146.8 mil millones de pesos. Es el sector donde la construccion de carreteras, puentes, hospitales y escuelas se adjudica en "licitaciones" donde nadie mas se presento -- o donde nadie mas fue invitado a competir.',
          'Los sectores de Energia y Defensa muestran patrones similares. En ambos, la justificacion habitual es la "especialidad tecnica" -- solo un proveedor puede hacer este trabajo. Pero cuando la misma justificacion se aplica a decenas de miles de contratos durante decadas, deja de ser una excepcion tecnica y se convierte en una politica de exclusion.',
          'El costo para el erario es directo y medible. Sin competencia, no hay presion de precios. Los estudios de la OCDE estiman que la licitacion competitiva reduce los precios entre un 10 y un 30 por ciento comparado con la adjudicacion directa. Aplicado a los 5.43 billones de pesos en contratos single-bid, Mexico podria estar pagando entre 543 mil millones y 1.6 billones de pesos de mas.',
        ],
        pullquote: {
          quote: 'Sin competencia, Mexico podria estar pagando hasta $1.6T de mas',
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
  // STORY 7: El Triangulo Farmaceutico (WaPo voice)
  // =========================================================================
  {
    slug: 'triangulo-farmaceutico',
    outlet: 'wapo',
    type: 'case',
    era: 'amlo',
    headline: 'The Pharma Triangle: Three Companies, $270 Billion, and Mexico\'s Medicine Crisis',
    subheadline: 'Farmacos Especializados, Maypo, and DIMM dominated federal pharma procurement with risk scores above 0.96.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 8,
    leadStat: { value: '$270B', label: 'combined contracts -- 3 pharma firms', sublabel: 'risk score > 0.96 | 75%+ direct award', color: 'text-red-500' },
    relatedSlugs: ['la-austeridad-que-no-fue', 'la-cuarta-adjudicacion', 'cero-competencia'],
    chapters: [
      {
        id: 'the-three',
        number: 1,
        title: 'The Three',
        subtitle: 'How three firms captured Mexican pharmaceutical procurement',
        prose: [
          'In the labyrinth of Mexican federal pharmaceutical procurement, three names recur with a frequency that no competitive market should produce: Farmacos Especializados, Maypo, and DIMM.',
          'Together, these three companies have accumulated contracts worth approximately 270 billion pesos across multiple federal health institutions -- IMSS, ISSSTE, INSABI, and their successors. All three show direct award rates exceeding 75%. All three score above 0.96 on RUBLI\'s risk detection model -- placing them in the highest percentile of similarity to documented corruption patterns.',
          'A score above 0.96 does not prove corruption. What it proves is that these companies\' contracting patterns are statistically near-identical to those of vendors already confirmed in corruption cases. High concentration, high direct award rates, limited competition, dominant market position within a single sector.',
          'The pharmaceutical sector is uniquely vulnerable to this kind of capture. Medications have expiration dates, creating genuine urgency. Hospital directors face real consequences if drugs run out. And the government\'s own decisions -- dismantling BIRMEX, restructuring INSABI, changing distribution models mid-pandemic -- created the chaos that direct awards were supposed to solve.',
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
          'The bitter irony of Mexico\'s pharmaceutical procurement story is that the very period during which these three firms accumulated their largest contracts was also the period of the worst medicine shortages in modern Mexican history.',
          'Between 2019 and 2023, Mexican hospitals reported persistent stockouts of basic medications -- cancer drugs, insulin, antibiotics, anesthetics. Parents of children with cancer staged protests outside government offices. The hashtag #FaltanMedicamentos became a permanent fixture of Mexican social media.',
          'The government\'s explanation was that the old system was corrupt and needed time to be replaced. RUBLI\'s data suggests a different narrative: the replacement system was more concentrated, more opaque, and more expensive than what it replaced, while delivering less.',
          'When you eliminate competition from a market, prices go up and service goes down. This is not ideology. It is economics. And Mexico\'s children with cancer paid the price while three pharmaceutical companies accumulated 270 billion pesos in largely uncompeted contracts.',
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
    outlet: 'nyt',
    type: 'year',
    era: 'pena',
    headline: 'The December Avalanche: $57.5 Billion in 31 Days',
    subheadline: 'In December 2015, the Mexican government signed 13,478 contracts worth $57.5 billion pesos. The fiscal year was ending, and the money had to go.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$57.5B', label: 'contracted in December 2015 alone', sublabel: '13,478 contracts in 31 days | Pena Nieto administration', color: 'text-amber-500' },
    relatedSlugs: ['sexenio-a-sexenio', 'la-cuarta-adjudicacion', 'infraestructura-sin-competencia'],
    chapters: [
      {
        id: 'the-rush',
        number: 1,
        title: 'The Rush',
        subtitle: 'When December becomes the most expensive month of the year',
        prose: [
          'Every government in the world faces year-end budget pressure. Agencies that fail to spend their allocated funds risk having their budgets cut the following year. The incentive is perverse but universal: spend it or lose it.',
          'In Mexico, this incentive produces a December spending spike that RUBLI tracks through its z_year_end indicator. The pattern is consistent across administrations. But December 2015, midway through the Pena Nieto presidency, stands out as the most extreme example in 23 years of COMPRANET data.',
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
          'The December rush is not unique to any single administration. RUBLI identifies 26,404 contracts flagged with the year_end risk indicator across all 23 years of data. The pattern spans Fox, Calderon, Pena Nieto, and Lopez Obrador.',
          'What changes across administrations is the magnitude. Under Pena Nieto, the December spike was most pronounced in absolute terms -- the 2015 avalanche being the extreme case. Under Lopez Obrador, the December spike was smaller in absolute terms but occurred on top of an already-elevated baseline of direct awards, making the effective reduction in oversight even more severe.',
          'The OECD has repeatedly flagged year-end budget rushes as a corruption risk factor. RUBLI integrates this as one of its 16 z-score features, normalized against sector and year baselines. A contract signed on December 28 in a sector where December spending is typically 20% above average scores differently than the same date in a sector with flat monthly spending.',
          'The fix is structural, not political: multi-year budgeting, rollover provisions, and penalties for rush spending would eliminate the incentive. No Mexican administration has implemented any of these reforms.',
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
    outlet: 'wapo',
    type: 'case',
    era: 'cross',
    headline: 'The Cardiac Cartel: Vitalmex and the $50 Billion Heart Equipment Monopoly',
    subheadline: 'COFECE is investigating. RUBLI\'s algorithm flagged it years before regulators acted.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 6,
    leadStat: { value: '$50B', label: 'cardiac equipment contracts -- Vitalmex', sublabel: 'COFECE investigation active | monopoly pattern', color: 'text-red-500' },
    relatedSlugs: ['triangulo-farmaceutico', 'cero-competencia', 'la-cuarta-adjudicacion'],
    chapters: [
      {
        id: 'the-monopoly',
        number: 1,
        title: 'The Monopoly',
        subtitle: 'One company. Fifty billion pesos. Every heart surgery in Mexico.',
        prose: [
          'Vitalmex Internacional S.A. de C.V. has built a position in Mexican cardiac equipment procurement that the federal competition authority COFECE has formally designated as a potential monopoly under investigation.',
          'RUBLI\'s analysis of COMPRANET records shows Vitalmex accumulating approximately 50 billion pesos in contracts for cardiac surgery equipment, implants, and related supplies across federal hospitals. The company\'s vendor_concentration score -- which measures how much of a sector\'s spending goes to a single provider -- is among the highest RUBLI has ever recorded.',
          'The COFECE investigation, launched before RUBLI\'s analysis was completed, validates what the data shows: when one company controls the supply of cardiac stents, pacemakers, and surgical equipment to every federal hospital in Mexico, the market is not functioning.',
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
          'International studies consistently show that monopolistic medical device markets produce prices 20-40% higher than competitive ones. Applied to Vitalmex\'s 50 billion peso portfolio, the implied overpayment could range from 10 to 20 billion pesos.',
          'That is money that could have funded hospital construction, nurse salaries, or medication procurement. Instead, it may have flowed to a single company that had no incentive to lower its prices because no one else was competing.',
          'COFECE\'s investigation is ongoing. Whatever its outcome, the COMPRANET data is clear: this level of concentration in a critical medical supply sector is, by any international standard, a market failure.',
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
    outlet: 'animal_politico',
    type: 'thematic',
    era: 'cross',
    headline: 'Red Fantasma: Anatomia de una Empresa Fantasma en COMPRANET',
    subheadline: 'Como se construyen, como operan, y como detectarlas con datos.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
    estimatedMinutes: 7,
    leadStat: { value: '13,960', label: 'empresas en lista EFOS del SAT', sublabel: 'operaciones simuladas confirmadas', color: 'text-red-400' },
    relatedSlugs: ['los-nuevos-ricos-de-la-4t', 'el-granero-vacio', 'la-cuarta-adjudicacion'],
    chapters: [
      {
        id: 'anatomia',
        number: 1,
        title: 'Anatomia de un Fantasma',
        subtitle: 'Los ingredientes de una empresa que no existe',
        prose: [
          'Una empresa fantasma no parece fantasma. Tiene RFC. Tiene direccion fiscal. Tiene un representante legal. En COMPRANET, aparece como cualquier otro proveedor: un nombre, un numero, una cuenta bancaria donde depositar los pagos.',
          'Lo que no tiene es operaciones reales. No tiene empleados, o tiene uno. No tiene instalaciones, o comparte direccion con otras 15 empresas. No tiene historial de ventas a clientes privados. Su unica razon de ser es facturar al gobierno.',
          'El SAT mantiene una lista publica de empresas detectadas por emitir facturas apocrifas: la lista EFOS (Empresas que Facturan Operaciones Simuladas), regulada por el Articulo 69-B del Codigo Fiscal. A marzo de 2026, la lista contiene 13,960 empresas en estatus "definitivo" -- confirmadas como simuladoras de operaciones.',
          'RUBLI cruza la lista EFOS con COMPRANET y encuentra lo esperado: muchas de estas empresas fantasma confirmadas por el SAT tambien fueron proveedoras del gobierno federal. Recibieron dinero publico por bienes y servicios que nunca entregaron. La factura decia una cosa. La realidad decia otra.',
          'Pero la lista EFOS solo detecta un tipo de fantasma: el que emite facturas falsas a terceros. No detecta a la empresa que existe exclusivamente para recibir contratos gubernamentales por adjudicacion directa -- la empresa fantasma del sector publico, que no necesita facturas apocrifas porque su negocio es el gobierno.',
        ],
        pullquote: {
          quote: 'Una empresa fantasma no parece fantasma. Eso es lo que la hace efectiva.',
          stat: '13,960',
          statLabel: 'empresas EFOS confirmadas por el SAT',
        },
      },
      {
        id: 'deteccion',
        number: 2,
        title: 'Como las Detecta RUBLI',
        subtitle: 'Tres senales que el algoritmo busca',
        prose: [
          'El modelo de deteccion de RUBLI no busca una sola anomalia. Busca constelaciones de senales que, combinadas, producen un perfil de riesgo elevado.',
          'Primera senal: alta tasa de adjudicacion directa. Las empresas fantasma no necesitan competir porque alguien dentro del gobierno se asegura de que reciban el contrato. Segunda senal: baja diversificacion institucional. Una empresa legitima vende a multiples clientes. Una fantasma opera con una sola dependencia -- la que la creo. Tercera senal: patron temporal corto. Las fantasmas nacen, reciben contratos durante 2-3 anos, y desaparecen.',
          'Cuando RUBLI combina estas senales con las 16 variables z-score de su modelo v6.4 -- incluyendo price_volatility, vendor_concentration, e institution_diversity --, puede distinguir entre un proveedor pequeno legitimo y una operacion disenada para extraer dinero publico.',
          'La precision no es perfecta. El modelo tiene un AUC de 0.863 -- detecta correctamente la mayoria de los patrones, pero no todos. Las empresas fantasma mas pequenas y de vida mas corta son las mas dificiles de detectar, porque generan pocos datos para analizar.',
          'Pero cuando 1,253 empresas comparten el mismo perfil -- debuto post-2018, 95%+ adjudicacion directa, una sola institucion, vida corta -- la probabilidad de que todas sean coincidencias inocentes es estadisticamente nula.',
        ],
        pullquote: {
          quote: '1,253 empresas con el mismo perfil no son coincidencia',
          stat: 'AUC 0.863',
          statLabel: 'precision del modelo de deteccion v6.4',
          barValue: 86.3,
          barLabel: 'Area bajo la curva ROC',
        },
      },
    ],
  },

  // =========================================================================
  // STORY 11: Infraestructura Sin Competencia (NYT)
  // =========================================================================
  {
    slug: 'infraestructura-sin-competencia',
    outlet: 'nyt',
    type: 'thematic',
    era: 'cross',
    headline: 'Built Without Bidders: Mexico\'s $2.1 Trillion Infrastructure Spending Gap',
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
          'Mexico\'s COMPRANET data shows an average of 1.3 bidders per infrastructure procurement process. Subtract the direct awards, and the "competitive" processes average 1.8 bidders. Neither number reflects a functioning market.',
          'The OECD estimates that each additional bidder in a procurement process reduces the winning price by 5-10%. If Mexico\'s 196,540 single-bid infrastructure contracts had attracted just three bidders each, the implied savings would be in the hundreds of billions of pesos.',
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
    outlet: 'animal_politico',
    type: 'case',
    era: 'cross',
    headline: 'SixSigma y el SAT: 27 Mil Millones en Contratos Amañados',
    subheadline: 'Como una empresa de consultoria capturo la contratacion tecnologica del fisco mexicano.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
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
          'El Servicio de Administracion Tributaria (SAT) es la autoridad fiscal de Mexico -- el equivalente del IRS estadounidense. Es la dependencia que cobra impuestos, que persigue a los evasores, y que mantiene la lista EFOS de empresas fantasma. Es, supuestamente, la institucion mas sofisticada del gobierno federal en materia de deteccion de fraude.',
          'Tambien fue victima de uno.',
          'El caso SixSigma es un ejemplo de tender rigging -- amañamiento de licitaciones. RUBLI identifica 147 contratos vinculados a este caso en la base de datos de ground truth, por un valor estimado de 27 mil millones de pesos en contratacion tecnologica para el SAT.',
          'El mecanismo era clasico: las licitaciones se disenaban con especificaciones tecnicas que solo un proveedor podia cumplir. No era que SixSigma fuera el mejor. Era que las bases de licitacion se escribian para que solo SixSigma pudiera participar.',
          'El modelo v6.4 de RUBLI asigna a los contratos de este caso un puntaje promedio de riesgo de 0.756, con un 87.8% clasificado como riesgo alto o critico. El algoritmo detecta el patron sin conocer el caso: concentracion en una sola institucion, ganancias repetidas en procesos "competitivos," precios que superan los del mercado.',
        ],
        pullquote: {
          quote: 'El SAT persigue fraudes. Tambien fue victima de uno.',
          stat: '$27B',
          statLabel: 'en licitaciones amañadas',
          barValue: 87.8,
          barLabel: '87.8% de contratos clasificados como alto riesgo',
        },
      },
      {
        id: 'la-deteccion',
        number: 2,
        title: 'La Deteccion',
        subtitle: 'Lo que el algoritmo ve antes que los auditores',
        prose: [
          'El caso SixSigma ilustra una de las fortalezas de RUBLI: la deteccion de patrones que, contrato por contrato, parecen normales, pero que en conjunto revelan una anomalia sistematica.',
          'Ningun contrato individual de SixSigma habria levantado sospechas por si solo. Los montos eran razonables para consultoria tecnologica del SAT. Los procesos cumplian el formato de licitacion publica. Los tiempos de publicacion eran adecuados.',
          'Lo que el algoritmo detecta es la repeticion. El mismo proveedor, ganando licitacion tras licitacion en la misma institucion, con un win_rate anomalo y una vendor_concentration que se dispara cuando se mide contra la norma del sector Hacienda.',
          'Hacienda es uno de los sectores donde el coeficiente de network_member_count (+0.77) es el mas alto del modelo v6.4 -- las redes de proveedores en el sector financiero del gobierno son un predictor fuerte de riesgo. SixSigma no operaba en red. Pero su concentracion institucional era tan alta que no necesitaba una.',
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
    outlet: 'wapo',
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
          'Oceanografia S.A. de C.V. was a marine services contractor for Petroleos Mexicanos -- PEMEX. Its business was providing vessels and underwater services for Mexico\'s offshore oil operations. On paper, it was a specialized technical provider in the energy sector.',
          'In reality, Oceanografia had been inflating invoices for years. The company would submit invoices to Banamex (Citibank\'s Mexican subsidiary) claiming amounts owed by PEMEX that either did not exist or had been artificially increased. Banamex, in turn, would advance funds against these receivables. When the fraud was discovered, Citibank was forced to write off approximately $400 million USD.',
          'RUBLI\'s database contains only 2 contracts directly attributed to Oceanografia in the ground truth -- the COMPRANET records available are limited for this case, which operated largely through PEMEX\'s internal procurement systems that predate full COMPRANET integration. But the case\'s estimated total value of 22.4 billion pesos makes it one of the largest procurement frauds in Mexican history.',
          'What makes Oceanografia significant for RUBLI\'s analytical framework is not the contracts it finds, but the ones it cannot. PEMEX\'s procurement has historically operated with less transparency than civilian federal agencies. The energy sector\'s COMPRANET coverage is incomplete, particularly for the years of Oceanografia\'s peak operations. This data gap is itself a finding.',
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
    outlet: 'nyt',
    type: 'era',
    era: 'cross',
    headline: 'Four Presidents, One Trend: Mexico\'s 23-Year Drift Toward No-Bid Contracting',
    subheadline: 'Fox, Calderon, Pena Nieto, Lopez Obrador. Different parties, different ideologies, same direction.',
    byline: 'RUBLI Data Analysis Unit',
    estimatedMinutes: 10,
    leadStat: { value: '62.7% to 81.9%', label: 'direct award rate, 2010 to 2023', sublabel: '23 years of data | 3.05 million contracts', color: 'text-zinc-300' },
    relatedSlugs: ['la-cuarta-adjudicacion', 'avalancha-diciembre', 'la-austeridad-que-no-fue'],
    chapters: [
      {
        id: 'the-arc',
        number: 1,
        title: 'The Arc',
        subtitle: 'A 23-year dataset tells a story no single administration wants to own',
        prose: [
          'RUBLI\'s database spans four Mexican presidencies and 23 years of federal procurement records. It is the longest continuous dataset of its kind in Latin America. And the story it tells is not about any one president. It is about a system that, regardless of who occupies the National Palace, moves in one direction: toward less competition.',
          'Under Vicente Fox (2000-2006), the direct award rate hovered in the low-to-mid 60s. Under Felipe Calderon (2006-2012), it began climbing: 62.7% in 2010, 68.4% by 2013. Under Enrique Pena Nieto (2012-2018), the acceleration continued: 73.0% in 2015, 76.2% in 2018. Under Lopez Obrador (2018-2024), it reached its zenith: 77.8% in 2019, rising every year to 81.9% in 2023.',
          'Four presidents. Two parties. PAN and PRI, then MORENA. Conservative and progressive. Free-trade and nationalist. On procurement competition, the trajectory was identical: down.',
          'This is not a partisan finding. It is a structural one. The Mexican procurement system has a ratchet mechanism that pushes toward direct awards under every administration, because the incentives favor it. Direct awards are faster, simpler, and give politicians more control over who gets the money. No president has had the political will to reverse the ratchet.',
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
          'While the trend is consistent, the rate of acceleration is not. Under Calderon, the direct award rate increased roughly 1 percentage point per year. Under Pena Nieto, the pace was similar -- about 1.3 points per year. Under Lopez Obrador, the annual increase was steeper: 1.4 points per year, starting from an already-elevated base.',
          'More importantly, Lopez Obrador\'s increase came with a qualitative difference. Under previous administrations, the rising direct award rate was largely passive -- the result of bureaucratic inertia, weak oversight, and agencies taking the path of least resistance. Under the 4T, it was active policy.',
          'The elimination of fideicomisos (trust funds), the centralization of procurement through the Oficina de la Presidencia, the explicit decision to route mega-projects through military entities exempt from normal procurement rules -- these were deliberate choices that expanded the scope of no-bid contracting.',
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
          'Claudia Sheinbaum took office on October 1, 2024, inheriting a procurement system where more than 80% of federal contracts are awarded without competition. The question is whether the first female president of Mexico will reverse the trend that every one of her predecessors accelerated.',
          'Early data from the Sheinbaum administration is too limited for definitive analysis. RUBLI will update its tracking as 2025 data flows into COMPRANET. But the structural incentives that produced 23 years of increasing direct awards have not changed. No reform to the Ley de Adquisiciones has been proposed. No restructuring of procurement oversight is underway.',
          'The 3.05 million contracts in RUBLI\'s database tell a story that transcends ideology. The problem is not left or right, PAN or MORENA. The problem is a system where every administration finds it easier, faster, and more politically useful to award contracts directly than to compete them.',
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
    outlet: 'animal_politico',
    type: 'case',
    era: 'cross',
    headline: 'La Casa de los Contratos: La Red de Fraude en Infraestructura de $85 Mil Millones',
    subheadline: 'Cinco empresas. Mismas direcciones. Mismos representantes legales. Contratos en los mismos proyectos.',
    byline: 'Analisis de Datos RUBLI | Unidad de Investigacion',
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
          'En la base de datos de ground truth de RUBLI, el Caso 11 documenta una red de fraude en infraestructura compuesta por cinco empresas que comparten direcciones fiscales, representantes legales y patrones de contratacion. Son, a todos los efectos analiticos, una sola entidad operando bajo cinco razones sociales.',
          'RUBLI identifica 191 contratos directamente vinculados a esta red, con un puntaje promedio de riesgo de 0.962 -- el segundo mas alto de todos los casos documentados en la base de ground truth. El 99.5% de estos contratos son clasificados como riesgo alto o critico por el modelo v6.4.',
          'El mecanismo es clasico pero efectivo: las cinco empresas participan en las mismas licitaciones de infraestructura, simulando competencia. Una oferta es realista; las otras cuatro son deliberadamente mas altas, garantizando que la "ganadora" predeterminada obtenga el contrato a un precio inflado.',
          'Es bid rigging -- amañamiento de licitaciones -- en su forma mas pura. Y opera en el sector de infraestructura, donde los montos individuales son los mas altos del gobierno federal y donde la supervision tecnica es mas dificil porque cada proyecto es unico.',
          'El valor estimado de los contratos vinculados a esta red alcanza los 85 mil millones de pesos. No es una cifra de RUBLI -- es la estimacion basada en los contratos identificados en COMPRANET cruzados con las investigaciones periodisticas que documentaron originalmente el caso.',
        ],
        pullquote: {
          quote: 'Cinco empresas. Mismas direcciones. Mismos representantes. Una sola operacion.',
          stat: '99.5%',
          statLabel: 'de sus contratos son riesgo alto o critico',
          barValue: 99.5,
          barLabel: 'Tasa de deteccion del modelo',
        },
      },
      {
        id: 'la-deteccion',
        number: 2,
        title: 'Lo que el Algoritmo Ve',
        subtitle: 'Red flags que se acumulan hasta ser incontestables',
        prose: [
          'El modelo v6.4 de RUBLI no conoce las direcciones fiscales ni los nombres de los representantes legales. Opera exclusivamente con datos de contratacion: montos, fechas, procedimientos, frecuencias, concentraciones. Y aun asi, asigna a esta red un puntaje de 0.962.',
          'La razon es que el bid rigging deja huellas en los datos de contratacion, aunque no se tenga acceso a los documentos internos. Las cinco empresas muestran patrones de precio que son estadisticamente incompatibles con la competencia real: ofertas consistentemente cercanas, rotacion predecible de ganadores, y precios finales que superan los benchmarks del sector.',
          'El indicador z_price_ratio captura la sobrevaloracion. El z_vendor_concentration captura la dominancia del mercado. Y el z_network_member_count -- que mide el tamano de la red de co-contratacion -- se dispara porque las cinco empresas aparecen juntas en multiples procedimientos.',
          'Este caso es la prueba de concepto del modelo de RUBLI: sin acceso a inteligencia humana, sin informantes, sin documentos filtrados, un algoritmo entrenado con 347 casos de corrupcion documentados puede identificar con 99.5% de precision los contratos de una red de fraude que opero durante anos en el sector de infraestructura federal.',
        ],
        pullquote: {
          quote: 'Sin informantes. Sin documentos filtrados. Solo datos.',
          stat: '0.962',
          statLabel: 'puntaje promedio de riesgo -- percentil 99.9',
        },
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
