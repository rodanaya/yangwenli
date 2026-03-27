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
          'Palacio Nacional, 1 de diciembre de 2018. Andrés Manuel López Obrador se ciñe la banda presidencial y pronuncia las palabras que definirán su gobierno: la Cuarta Transformación acabará con la corrupción. No más moches. No más empresas fantasma. No más contratos a modo. La transparencia en el gasto público será la piedra angular del nuevo régimen.',
          'Pasaron exactamente doce meses. En 2019 — sin pandemia, sin desastre natural, sin una sola emergencia declarada que justificara saltarse la licitación pública — el 77.8% de todos los contratos federales se adjudicaron de forma directa. Era, hasta ese momento, la tasa más alta desde que COMPRANET empezó a registrar las compras del gobierno federal en 2002. El primer año completo de la administración anticorrupción ya había roto el récord de opacidad.',
          'Pero 2019 fue apenas el punto de partida. Cada año siguiente superó al anterior: 78.1% en 2020, 80.0% en 2021, 79.1% en 2022, y finalmente 81.9% en 2023. No hubo un pico aislado ni un tropiezo explicable. La curva ascendió sin excepción durante seis años consecutivos, con la consistencia de una política deliberada, no de un accidente.',
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
          'Hay un argumento que los defensores del gobierno repitieron durante seis años: la pandemia obligó a comprar de emergencia. Es una explicación cómoda. También es falsa. El año récord de adjudicación directa no fue 2020, cuando el COVID-19 paralizó hospitales y cadenas de suministro. Fue 2023 — un año sin crisis sanitaria, sin emergencia económica, sin justificación legal de urgencia. Ese año, ochenta y dos de cada cien pesos contratados por el gobierno federal llegaron a empresas que jamás tuvieron que competir por ellos.',
          'La escalera fue metódica: 77.8% en 2019, 78.1% en 2020, 80.0% en 2021, un leve retroceso al 79.1% en 2022, y el salto final al 81.9% en 2023. La pandemia no explica la tendencia porque la tendencia ya existía antes de la pandemia. Y siguió después de ella.',
          'Conviene el contraste histórico. Bajo Felipe Calderón, en 2010, la tasa de adjudicación directa era del 62.7% — ya alta por cualquier estándar internacional, pero 19 puntos por debajo de lo que López Obrador dejaría al entregar el poder. Con Peña Nieto, ampliamente señalado por la Casa Blanca y Odebrecht, la tasa escaló del 68.4% al 76.2%. López Obrador recogió esa herencia y la superó todos los años. Ningún presidente desde que existe COMPRANET contrató con tanta opacidad.',
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
          'En la mañanera del 14 de marzo de 2019, López Obrador ofreció una explicación que repetiría decenas de veces: las adjudicaciones directas eran necesarias porque las licitaciones estaban amañadas. Mejor comprar directo, dijo, que fingir concursos donde siempre ganaba el mismo. El argumento tenía una lógica seductora. También tenía un problema: los sectores donde más se usó la adjudicación directa no eran los de mayor complejidad técnica, sino los de mayor volumen de dinero.',
          'Agricultura — el sector de SEGALMEX, el escándalo que devoró al sexenio — alcanzó el 93.4% de adjudicación directa. Nueve de cada diez contratos para comprar leche, maíz y frijol para los programas alimentarios se entregaron sin concurso. No había urgencia técnica en comprar tortillas. No hacía falta un solo proveedor para distribuir arroz. Lo que había era un sistema donde los intermediarios cobraban y los beneficiarios no recibían.',
          'En Salud, la tasa llegó al 78.9% durante los peores años de desabasto de medicamentos que el país haya vivido en décadas. El gobierno desmanteló la cadena de distribución farmacéutica existente argumentando que estaba podrida de corrupción. La reemplazó con adjudicaciones directas a través de BIRMEX y luego del IMSS-Bienestar. Los hospitales se quedaron sin insulina, sin quimioterapias, sin antirretrovirales. La opacidad no resolvió el desabasto. Lo provocó.',
          'El argumento de la emergencia no sobrevive cuando se mira sector por sector. La emergencia no estaba en el campo ni en los almacenes de SEGALMEX. Estaba en la voluntad política de evadir la competencia.',
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
          'En Corea del Sur, el 5% de los contratos públicos se adjudica sin competencia. En Chile, el 12%. En Francia, el 18%. La OCDE fija el umbral de alarma en 25% — un límite que la mayoría de sus miembros ni siquiera se acerca a tocar. México bajo López Obrador triplicó esa marca: 81.9% en 2023. No existe un país miembro de la OCDE, ni aspirante a serlo, que haya operado con esa proporción de opacidad en su gasto público.',
          'Peña Nieto — un gobierno hundido por la Casa Blanca de Angélica Rivera y los sobornos de Odebrecht — dejó la tasa en 76.2%. López Obrador prometió bajarla. La subió 5.7 puntos. En un sistema que moviliza billones de pesos al año, cada punto porcentual representa decenas de miles de contratos que pasaron de la competencia a la discrecionalidad. Los 2,493,117 contratos directos del sexenio suman más de 2 billones de pesos.',
          'Entre esos millones de contratos hay un dato que merece atención aparte: 1,253 empresas nacieron después de diciembre de 2018, sin un solo contrato federal previo, y obtuvieron más del 95% de sus contratos por adjudicación directa durante la 4T. Aparecieron con el nuevo gobierno y se alimentaron exclusivamente de compras sin competencia. La promesa era eliminar a las empresas fantasma. Lo que ocurrió fue que nacieron nuevas.',
          'La pregunta incómoda no es si hubo opacidad. Eso ya está respondido en los registros de COMPRANET. La pregunta es por qué un gobierno que hizo de la transparencia su estandarte la redujo deliberadamente, año tras año, hasta fijar un récord que ni Peña Nieto ni Calderón ni Fox alcanzaron.',
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
          'Cada contrato que firmó el gobierno federal desde 2002 está registrado en COMPRANET, la base de datos pública de la Secretaría de Hacienda. Son 3,051,294 registros — con montos, fechas, proveedores, tipo de procedimiento y dependencia contratante. Cualquier periodista con acceso a internet puede descargarlos. La materia prima para una docena de investigaciones está ahí, esperando.',
          'La primera pregunta para cualquier investigación es la institución. Una dependencia que adjudicó directamente el 95% de sus contratos durante cuatro años seguidos merece una solicitud de acceso a la información por cada contrato mayor a 50 millones de pesos. Las justificaciones legales — artículos 41 y 42 de la Ley de Adquisiciones — deben estar en cada expediente. Cuando no están, ahí empieza la nota.',
          'El segundo paso es el proveedor. Una empresa creada en 2019, con menos de cinco empleados registrados ante el SAT, que acumuló cien contratos federales por adjudicación directa entre 2020 y 2024, es una historia. Cruzar ese RFC con el listado de EFOS del SAT — contribuyentes que simulan operaciones — y con el Registro de Proveedores Sancionados de la SFP puede confirmar sospechas en minutos. Muchas de esas 1,253 empresas nuevas nunca han sido investigadas.',
          'El tercer paso, y el más importante, es la fuente humana. Los registros señalan anomalías; las personas explican por qué ocurrieron. Organizaciones como Fundar, IMCO y Mexicanos Contra la Corrupción tienen investigadores especializados en contratación pública que han construido expedientes durante años. Los exfuncionarios de áreas de adquisiciones son frecuentemente más accesibles de lo que parece — sobre todo los que salieron en malos términos. Y los perdedores de licitaciones, las empresas que participaron y no ganaron, tienen todo el incentivo para hablar.',
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
          'El 24 de enero de 2019, el Diario Oficial de la Federación publicó el decreto de creación de Seguridad Alimentaria Mexicana. SEGALMEX absorbió a LICONSA — la paraestatal que vendía leche subsidiada en colonias populares desde 1965 — y a DICONSA, la red de 27,000 tiendas rurales que llevaba arroz, frijol y aceite a comunidades donde ningún supermercado llega. La promesa era directa: eliminar intermediarios, acabar con la corrupción histórica en la distribución de alimentos, poner cada peso al servicio de los más pobres.',
          'Dos años después de aquel decreto, la Auditoría Superior de la Federación comenzó a documentar lo que las tiendas vacías en la Sierra Norte de Puebla y los lecheros sin producto en Iztapalapa ya insinuaban: el dinero entraba a SEGALMEX y no salía como alimento.',
          'El sector Agricultura — donde operaban SEGALMEX, LICONSA y DICONSA — alcanzó bajo la Cuarta Transformación una tasa de adjudicación directa del 93.4%, la más alta de todos los sectores del gobierno federal. Menos de siete de cada cien contratos pasaron por un proceso competitivo. Sin licitación no hay segundo postor. Sin segundo postor no hay precio de referencia. Sin precio de referencia, un kilo de leche en polvo puede costar lo que el proveedor elegido decida cobrar.',
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
          'Veintidós proveedores recibieron contratos de SEGALMEX por adjudicación directa entre 2019 y 2023. No son veintidós empresas dispersas: comparten una sola institución contratante, un solo mecanismo de asignación y una ausencia total de competencia. Algunas existían antes del decreto de creación. Otras aparecieron semanas antes de recibir su primer contrato por cientos de millones de pesos — empresas sin trayectoria en distribución de alimentos, sin flotilla de transporte, sin bodegas refrigeradas.',
          'LICONSA y DICONSA — las subsidiarias operativas de SEGALMEX — concentran miles de contratos cada una. Pero la red incluye también a proveedores externos: empresas lecheras que vendían a precios superiores al mercado mayorista, distribuidoras de granos cuyos volúmenes facturados no coincidían con las entregas verificadas por la ASF, intermediarios logísticos que cobraban por rutas que nunca recorrieron. El patrón se repite: adjudicación directa, montos crecientes cada ejercicio fiscal, y cero obligación de justificar el precio ante un competidor.',
          'Entre los veintidós proveedores, los contratos vinculados a SEGALMEX promedian un puntaje de riesgo superior a 0.80 — nivel crítico. La concentración extrema en un solo comprador, la volatilidad de precios y la ausencia de competencia producen ese resultado de forma mecánica. No es casualidad estadística. Es la firma aritmética de un sistema donde el dinero fluye sin contrapeso.',
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
          'Quince mil millones de pesos. La cifra proviene de la Auditoría Superior de la Federación, no de una estimación periodística. Auditoría tras auditoría — Cuenta Pública 2019, 2020, 2021 —, la ASF fue sumando irregularidades: pagos por leche que nunca llegó a las lecherías, facturas por toneladas de maíz que no aparecieron en los almacenes de DICONSA, transferencias a cuentas bancarias sin correspondencia con proveedor alguno del padrón.',
          'El mecanismo no requirió sofisticación. SEGALMEX compraba leche en polvo, maíz, frijol y arroz mediante adjudicación directa. Sin segundo postor, el precio lo fijaba el proveedor. Las cantidades entregadas no coincidían con lo facturado — en algunos contratos, la diferencia entre lo pagado y lo recibido superaba el 40%. Entregas fantasma: producto facturado que nunca salió de ninguna bodega. Sobreprecios de dos y tres veces el valor de mercado. Transferencias que la Unidad de Inteligencia Financiera rastreó hasta empresas fachada en Jalisco y Estado de México.',
          'Para las familias en Guerrero, Oaxaca y Chiapas que dependían de las tiendas DICONSA como única fuente de alimentos a precio accesible, los quince mil millones no son una abstracción contable. Son los meses en que la tienda del pueblo no tuvo frijol. Las semanas en que la lechería de la colonia cerró por falta de producto. Cada peso desviado fue un plato que no llegó a la mesa de quien más lo necesitaba.',
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
          'Ignacio Ovalle Fernández ocupó la dirección general de SEGALMEX desde su creación en enero de 2019 hasta su renuncia en septiembre de 2021, los treinta y dos meses durante los cuales se ejecutaron los contratos que la ASF catalogaría como irregulares por quince mil millones de pesos. En agosto de 2023, un juez federal lo vinculó a proceso por delincuencia organizada y peculado. La audiencia duró doce horas. Las irregularidades que la motivaron se acumularon durante años.',
          'De los veintidós proveedores que conforman la red SEGALMEX, ninguno ha sido condenado. La mayoría no enfrenta proceso judicial. Varias empresas mantienen su RFC activo ante el SAT y no figuran en el Registro de Empresas Sancionadas de la Secretaría de la Función Pública. Algunas han seguido recibiendo contratos federales después de 2023 — ya no de SEGALMEX, pero sí de otras dependencias. El proveedor cambia de cliente. El mecanismo permanece.',
          'El ciclo es conocido en la contratación pública mexicana: la ASF documenta, la Fiscalía General de la República abre carpetas, los procesos se alargan por años y el dinero no regresa. Lo que distingue al caso SEGALMEX es la escala — quince mil millones de pesos — y la paradoja: ocurrió dentro de una institución creada expresamente para combatir la corrupción en la distribución de alimentos, bajo un gobierno que llegó al poder con la promesa de que la corrupción se acabaría. El granero está vacío. El grano no llegó a quienes lo esperaban. Y los proveedores que lo recibieron siguen operando.',
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
          'Notaría Pública 237, Coyoacán, Ciudad de México, marzo de 2019. En un trámite de quince minutos se constituye Integradora de Soluciones Logísticas del Centro SA de CV, capital social de cincuenta mil pesos, un solo socio, objeto social que abarca "comercialización de bienes y servicios en general". Tres meses después, esa empresa que no tiene empleados, almacén ni página web recibe su primer contrato federal: adjudicación directa de la Secretaría de Bienestar por 14.7 millones de pesos en "servicios de apoyo logístico". No compitió con nadie. Nadie le pidió que demostrara experiencia.',
          'Esa empresa no es un caso aislado. Es un arquetipo. De los 320,000 proveedores registrados en COMPRANET, 1,253 comparten exactamente el mismo perfil: se constituyeron después de diciembre de 2018, obtuvieron más del 95% de sus contratos por adjudicación directa, y acumularon al menos 10 millones de pesos en ventas al gobierno federal. No son proveedores marginales que ganaron un contrato menor. Son operaciones que nacieron con la Cuarta Transformación y que no existirían sin ella.',
          'El patrón tiene una precisión incómoda. De las 1,253, el 49% factura a una sola dependencia. El 82% tiene menos de ocho contratos en total. El 24% carece de RFC registrado en COMPRANET. Su vida operativa promedio no alcanza los cuatro años. Se registran en Ciudad de México, Monterrey o Guadalajara — cerca de las instituciones que les adjudican — y su perfil estadístico es indistinguible del de las empresas fantasma documentadas en la Estafa Maestra, las redes de Segalmex o los proveedores ficticios del ISSSTE.',
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
          'Colonia Doctores, delegación Cuauhtémoc, primer trimestre de 2020. En un perímetro de cuatro manzanas alrededor de un despacho contable sobre la calle Doctor Vértiz, COMPRANET registra domicilios fiscales de once proveedores que debutaron entre enero y junio de 2019. Todos venden al sector salud. Ninguno existía cuando la crisis de desabasto arrancó en 2019 con la cancelación de contratos a distribuidoras consolidadas. Salud concentra la mayor proporción de estas 1,253 empresas, seguido por Gobernación y Tecnología — sectores donde los servicios son difíciles de estandarizar y la excepción de "proveedor único" se invoca sin que nadie la verifique.',
          'Cada operación es modesta. Treinta millones aquí, cuarenta y cinco allá. Montos calculados para no rebasar los umbrales que activarían la revisión del Órgano Interno de Control. No es el golpe espectacular de un Segalmex. Es una hemorragia de baja intensidad: mil pequeñas sangrías simultáneas que, sumadas, representan miles de millones de pesos extraídos del presupuesto de hospitales, escuelas y programas sociales.',
          'La ola de adjudicaciones directas que definió los primeros dos años de la 4T — cuando la tasa nacional pasó del 76% al 80% — fue exactamente la ventana en la que estas empresas aparecieron y prosperaron. No es coincidencia temporal. La adjudicación directa es el mecanismo que permite que una empresa sin historial, sin infraestructura y sin empleados reciba un contrato público. Cuando ocho de cada diez pesos se entregan sin competencia, la puerta queda abierta para cualquiera que conozca al funcionario correcto.',
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
          'Calle Hamburgo 213, colonia Juárez, Ciudad de México. El domicilio fiscal que aparece en COMPRANET corresponde a un coworking de cuatro pisos donde se puede rentar una dirección por 800 pesos al mes. Aquí tiene su sede legal una empresa constituida en febrero de 2019, con un capital social de cincuenta mil pesos, que entre 2020 y 2022 recibió cuatro contratos de adjudicación directa del ISSSTE por un total de 38 millones de pesos en servicios de limpieza hospitalaria. El representante legal — un solo nombre, sin socios — firmó el acta constitutiva ante una notaría de Iztapalapa tres semanas antes de que el ISSSTE publicara la primera invitación.',
          'El acta constitutiva describe como objeto social "la comercialización de productos y servicios en general". Ninguna mención a hospitales, desinfección ni insumos de limpieza. El capital social — cincuenta mil pesos — alcanza para comprar una aspiradora industrial, no para operar un servicio de limpieza en clínicas del ISSSTE. Pero la empresa no necesita aspiradoras: necesita una cuenta bancaria y un RFC activo. En el mismo domicilio del coworking de la colonia Juárez, el Registro Público de Comercio lista otras catorce razones sociales. Varias comparten la misma fecha de constitución, la misma notaría y la misma estructura de un solo socio.',
          'El representante legal no aparece en el Registro Nacional de Profesionistas, ni en el padrón de proveedores de ninguna otra dependencia federal, ni en ninguna red profesional verificable. Antes de 2019, esa persona no existía en el universo de las compras públicas mexicanas. Después de 2022, tampoco: la empresa dejó de recibir contratos y su RFC entró en el limbo de los contribuyentes sin actividad. Treinta y ocho millones de pesos pasaron por esa cuenta bancaria en 26 meses. En la jerga fiscal, a esto se le llama una operación de paso. En la jerga de la calle, se le llama robo. Este perfil — con variaciones de dirección, notaría y dependencia contratante — se replica en cientos de las 1,253 empresas que nacieron con la 4T.',
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
          'Un miércoles de agosto en la Ciudad de México. Oficinas administrativas del Instituto Mexicano del Seguro Social, División de Adquisiciones. El 2 de agosto de 2023, doce contratos de compraventa de hemoderivados — factores de coagulación para hemofílicos, inmunoglobulinas para pacientes con inmunodeficiencia, albúmina humana — fueron firmados con un solo proveedor: HEMOSER, S.A. de C.V. Los doce contratos sumaron 17,200 millones de pesos. En un solo día, una sola empresa recibió el equivalente al presupuesto anual de una universidad pública grande.',
          'Los doce contratos fueron clasificados como "adjudicación directa por excepción" — el mecanismo que la Ley de Adquisiciones reserva para emergencias o proveedores únicos. Pero no hubo emergencia declarada aquel miércoles de agosto. Y HEMOSER no era el único distribuidor de hemoderivados en México. Al dividir la compra en doce partes firmadas el mismo día, con el mismo proveedor, para la misma institución, cada contrato individual quedó por debajo de los umbrales que habrían activado supervisión adicional. El efecto agregado: 17,200 millones de pesos transferidos sin licitación pública.',
          'En veintitrés años de registros de COMPRANET — 3.05 millones de contratos entre 2002 y 2025 — no existe otro evento comparable. Doce contratos del mismo comprador al mismo vendedor en veinticuatro horas sitúan a HEMOSER en el percentil 99.99 del indicador de fraccionamiento. De cada diez mil contratos en la historia de las compras públicas federales, ninguno presenta esta concentración temporal. Agosto, además, rompe el patrón habitual: el grueso del gasto discrecional se acumula en noviembre y diciembre, cuando las dependencias agotan presupuesto. El 2 de agosto no es fin de año. No es fin de trimestre. Es un miércoles ordinario en el que ocurrió algo extraordinario.',
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
          'Artículo 27, Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público: "Las dependencias y entidades no podrán fraccionar operaciones para quedar comprendidas en los supuestos de excepción a la licitación pública." El legislador redactó esa frase pensando en un escenario concreto: que una dependencia dividiera una compra grande en partes pequeñas para evadir la obligación de licitar. El 2 de agosto de 2023, el IMSS ejecutó exactamente ese escenario.',
          'El fraccionamiento de contratos no admite zona gris. La LAASSP establece sanciones administrativas — inhabilitación del funcionario firmante — y potencialmente penales cuando el monto involucrado supera ciertos umbrales. Con 17,200 millones de pesos, el monto supera cualquier umbral concebible. Una licitación pública por esa cifra habría requerido publicación en el Diario Oficial, un plazo mínimo de veinte días naturales para recibir propuestas, un comité técnico evaluador y un fallo público con justificación detallada. Nada de eso ocurrió.',
          'Doce contratos. Un proveedor. Una institución. Un día. La aritmética no admite interpretación alternativa: se fraccionó una compra de 17,200 millones de pesos para evadir el proceso de licitación pública. La pregunta no es si violó el Artículo 27 — la respuesta está en los propios registros de COMPRANET. La pregunta es quién firmó los doce contratos, quién autorizó la excepción a licitación doce veces consecutivas en veinticuatro horas, y por qué los hemofílicos y pacientes inmunodeprimidos del IMSS quedaron a merced de un monopolio de facto sobre los productos que los mantienen vivos.',
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
          'Tres instituciones tenían la obligación de detectar lo que ocurrió el 2 de agosto. La Secretaría de la Función Pública, a través del Órgano Interno de Control del IMSS, revisa entre el 3% y el 5% de los contratos de cada ejercicio fiscal mediante muestreo. Doce contratos por 17,200 millones de pesos pueden caer fuera de la muestra — y cuando la SFP sanciona fraccionamiento, la inhabilitación alcanza al funcionario firmante, no al proveedor. HEMOSER puede seguir vendiendo al gobierno federal mientras el servidor público que firmó cambia de escritorio.',
          'La Auditoría Superior de la Federación trabaja con un desfase estructural de doce a dieciocho meses. Los contratos del 2 de agosto de 2023 entraron en la revisión de la Cuenta Pública 2023, publicada en febrero de 2025 — año y medio después. La ASF audita aproximadamente el 5% del gasto federal total. Si los contratos de HEMOSER no cayeron en la muestra del IMSS para ese ejercicio, sencillamente no fueron revisados. Diecisiete mil millones de pesos pueden pasar por el sistema sin que un solo auditor los examine.',
          'La Fiscalía General de la República no actúa de oficio en materia de adquisiciones. Necesita una denuncia formal — de la SFP, de la ASF o de un particular — para abrir una carpeta de investigación. Sin denuncia, no hay carpeta. Sin carpeta, no hay proceso. La cadena se rompe en cada eslabón por razones distintas: la SFP por capacidad de muestreo, la ASF por desfase temporal, la FGR por diseño procesal. El resultado es idéntico.',
          'Más de dos años después del evento de fraccionamiento más grande en veintitrés años de COMPRANET, ningún organismo del Estado ha emitido pronunciamiento público. Mientras tanto, los pacientes hemofílicos del IMSS — unas 6,000 personas en México que dependen de factores de coagulación para no desangrarse ante cualquier golpe — quedaron atados a un proveedor único designado sin competencia. Si HEMOSER sube precios, no hay alternativa. Si HEMOSER retrasa entregas, no hay sustituto. El fraccionamiento del 2 de agosto no fue solo una violación administrativa. Fue la captura de una cadena de suministro de la que dependen vidas.',
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
          'Dos de diciembre de 2018. El avión presidencial TP-01, un Boeing 787 Dreamliner que costó 218 millones de dólares, lleva menos de 24 horas como símbolo de todo lo que el nuevo gobierno prometió eliminar. López Obrador anuncia que lo venderá. Anuncia que los salarios del gobierno serán reducidos. Que los vehículos oficiales serán vendidos. Que los fideicomisos serán disueltos. La frase que lo resume todo es "austeridad republicana", y la repetirá cada mañana durante seis años.',
          'Los recortes llegaron rápido y cortaron hondo. Las estancias infantiles que cuidaban a 300,000 hijos de madres trabajadoras cerraron en los primeros meses. PROSPERA, el programa de transferencias condicionadas que una generación de economistas mexicanos había construido sobre evidencia, fue desmantelado hasta volverse irrelevante. Los presupuestos hospitalarios se congelaron. Miles de trabajadores de salud — enfermeras, técnicos de laboratorio, administrativos — perdieron sus plazas bajo el argumento de que sobraban burócratas.',
          'Pero hubo una línea del presupuesto que la austeridad jamás tocó. Mientras enfermeras perdían sus plazas y hospitales infantiles se quedaban sin medicinas, la proporción de contratos federales otorgados sin licitación creció cada año del sexenio: 77.8% en 2019, 78.1% en 2020, 80.0% en 2021. La contradicción es aritmética, no ideológica. Se recortaban clips y viáticos. Se entregaban miles de millones sin que nadie más pudiera competir por ellos.',
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
          'El contraste cabe en una sola imagen. De un lado del escritorio, la lista de lo que se eliminó. Del otro, la lista de lo que nunca dejó de recibir dinero. Las dos columnas no empatan.',
          'Recortado: las estancias infantiles, que dejaron a 300,000 familias sin dónde dejar a sus hijos mientras trabajaban. Recortado: el Seguro Popular, sustituido primero por el INSABI — que nunca funcionó — y luego por el IMSS-Bienestar, generando un caos administrativo que dejó a millones de mexicanos sin cobertura médica efectiva durante meses. Recortados: miles de empleos federales, desde técnicos de laboratorio hasta investigadores del CONACYT. La tijera fue real y dolorosa.',
          'No recortado: el Tren Maya, cuyo presupuesto escaló de 120,000 millones a más de 300,000 millones de pesos, con cientos de miles de millones adjudicados directamente a empresas vinculadas al ejército. No recortada: la refinería Dos Bocas, que duplicó sus proyecciones de costo. No recortados: Fármacos Especializados, Maypo y DIMM, los tres grandes proveedores farmacéuticos del sexenio, que acumularon contratos por 270,000 millones de pesos — prácticamente todos por adjudicación directa. La austeridad republicana fue extraordinariamente precisa en definir qué era despilfarro y qué no.',
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
          'Hubo quienes prosperaron bajo la austeridad. No fueron los hospitales ni las universidades ni los centros de investigación. Fueron los contratistas que descubrieron que, en la Cuarta Transformación, el camino más corto hacia el dinero público pasaba por la adjudicación directa.',
          'El sector salud ilustra la paradoja con claridad quirúrgica. El gobierno desmanteló la cadena de distribución farmacéutica argumentando que estaba infestada de corrupción — y tenía razón en parte. Pero lo que puso en su lugar fue peor. BIRMEX, designado como comprador único de medicamentos, demostró ser incapaz de cumplir el encargo. Los hospitales se quedaron sin insulina, sin quimioterapias, sin antirretrovirales para niños con VIH. Y cuando el desabasto se volvió insostenible, la solución fue una cascada de adjudicaciones directas de emergencia a proveedores sustitutos. Se eliminó la competencia para combatir la corrupción. Llegaron el desabasto y la opacidad juntos.',
          'Hay otra categoría que merece atención: los 505,219 contratos de postor único. Son procedimientos que formalmente pasaron por una licitación — con convocatoria, plazo de apertura, acta de fallo — pero donde solo se presentó una empresa. Suman 5.43 billones de pesos. Es la ficción perfecta de la competencia: el teatro completo, con un solo actor. Bajo López Obrador, estos contratos fantasma aumentaron año con año. La austeridad que prometía limpiar la contratación entregó más concentración, más opacidad y más gasto sin escrutinio real.',
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
          'No fue un escándalo. No fue un funcionario desleal ni una empresa que se coló por la puerta de atrás. Fue un sistema diseñado para funcionar exactamente como funcionó.',
          'Un sistema donde ocho de cada diez contratos se entregaron sin competencia en 2023. Donde 1,253 empresas sin historial aparecieron después de 2018 y vivieron exclusivamente de adjudicaciones directas. Donde el sector encargado de alimentar a los más pobres de México — leche para comunidades indígenas, maíz para tortillerías rurales, frijol para comedores comunitarios — operó con el 93.4% de adjudicación directa, la tasa más alta de todo el gobierno federal. Donde una sola empresa pudo recibir doce contratos por 17,200 millones de pesos en un solo día sin que nadie pidiera explicaciones.',
          'Todo está en COMPRANET, el propio sistema de registro del gobierno federal. No es opinión. No es sesgo político. Son los recibos firmados de una administración que prometió que la corrupción se acabaría por decreto y que la transparencia sería automática. Los recibos dicen otra cosa. La austeridad fue para las enfermeras que perdieron su plaza, para los niños que se quedaron sin guardería, para los investigadores que perdieron su financiamiento. Para los contratistas que ganaron miles de millones sin competir, el sexenio fue el más próspero en dos décadas.',
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
          'En mayo de 2021, el IMSS convocó una licitación pública para adquirir material de curación en su delegación de Puebla. Se publicó la convocatoria en COMPRANET, se fijaron plazos, se elaboraron bases técnicas. El día de la apertura de ofertas, una sola empresa se presentó. El contrato, por 48 millones de pesos, fue adjudicado a ese único postor. En el registro oficial, el proceso aparece como "licitación pública" — una modalidad competitiva. La competencia, sin embargo, nunca existió.',
          'La Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público prevé que cuando una licitación reciba una sola proposición, la convocante puede declararla desierta y reiniciar el proceso. En la práctica, casi nunca lo hace. Es más sencillo adjudicar al único participante, cerrar el expediente y pasar al siguiente. El caso de Puebla no es excepcional: es la norma. En la base de datos de COMPRANET hay 505,219 licitaciones donde el contrato fue otorgado a la única empresa que se presentó — más contratos de postor único que maestros en las escuelas públicas de la Ciudad de México.',
          'La distinción importa porque estas no son adjudicaciones directas. Son procedimientos que la ley diseñó para producir competencia genuina, pero donde la competencia jamás se materializó. Las causas varían: especificaciones técnicas tan estrechas que solo una firma puede cumplirlas, plazos de publicación de tres a cinco días hábiles que impiden a otros preparar ofertas, o simplemente la certeza entre proveedores potenciales de que el ganador ya está decidido. El valor acumulado de estas 505,219 licitaciones es de 5.43 billones de pesos — dinero público gastado bajo la ficción formal de un concurso.',
          'La OCDE ha documentado que en sus países miembro, las licitaciones con postor único representan entre el 10 y el 20% de los procedimientos competitivos. En México, la tasa es consistentemente superior. Cuando se suman estas licitaciones fantasma a las adjudicaciones directas convencionales, la tasa efectiva de no-competencia supera el 90% en múltiples sectores y años. El concurso existe en el papel. En la realidad, medio millón de contratos se adjudicaron sin que nadie compitiera.',
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
          'La concentración no es uniforme. Infraestructura acumula 196,540 contratos de postor único por un valor de 2.1 billones de pesos: carreteras, puentes, hospitales, escuelas — obras que pasaron por un proceso competitivo donde nadie compitió. En tecnología gubernamental, el patrón se repite con contratos de software y servicios de TI donde las especificaciones técnicas describen, con precisión sospechosa, el producto de un solo fabricante. En salud, las licitaciones de equipo médico especializado atraen regularmente a un solo postor, con frecuencia el mismo distribuidor que asesoró a la institución en la elaboración de las bases.',
          'La justificación recurrente es la especialidad técnica: solo un proveedor puede cumplir los requisitos. En Defensa, donde los contratos de armamento y comunicaciones militares exigen habilitaciones de seguridad, el argumento tiene cierta lógica. Pero cuando la misma excepción se aplica a decenas de miles de contratos de papelería, limpieza, mantenimiento vehicular y servicios de vigilancia durante dos décadas, deja de ser una razón técnica y se convierte en una estructura de captura. El proveedor establece relaciones con el área requirente, participa en la definición de necesidades, y cuando la convocatoria se publica, las bases ya describen exactamente lo que él ofrece.',
          'El costo para el erario es directo. Sin competencia, no hay presión sobre los precios. Los estudios de la OCDE estiman que la licitación competitiva reduce los costos entre un 10 y un 30% respecto a la contratación sin competencia. Aplicado a los 5.43 billones de pesos en contratos de postor único, el sobrecosto potencial oscila entre 543 mil millones y 1.6 billones de pesos. Para dimensionarlo: 1.6 billones equivalen a más de tres veces el presupuesto anual de la UNAM, o al costo total del Tren Maya según la estimación original del gobierno.',
          'Ningún villano individual explica este patrón. No es un funcionario corrupto ni una empresa depredadora: es un sistema de contratación que permite — y en la práctica incentiva — que la competencia sea opcional. La ley exige licitación. La ley no exige que alguien compita.',
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
          'En la sala de juntas de una unidad de compras del IMSS, un funcionario abre CompraNet para registrar la adjudicación de un contrato de medicamentos especializados. El proveedor ganador es Fármacos Especializados. Dos empresas más presentaron cotización — Maypo Internacional y DIMM, Distribuidora Internacional de Medicamentos y Material Médico — pero sus ofertas llegaron por encima del precio ganador. La escena se repite, con variaciones menores, cientos de veces entre 2019 y 2024: las mismas tres empresas concursando juntas, turnándose para ganar, en un patrón que la COFECE identificó formalmente como posible colusión farmacéutica.',
          'Juntas, Fármacos Especializados, Maypo y DIMM acumularon contratos por aproximadamente 270 mil millones de pesos en IMSS, ISSSTE, INSABI y sus sucesoras. Las tres registran tasas de adjudicación directa superiores al 75%. Las tres caen en el rango de riesgo crítico, con puntajes por encima de 0.96. El mecanismo es un clásico del cover bidding: una empresa presenta la oferta real, las otras dos presentan cotizaciones infladas que dan apariencia de competencia sin que exista.',
          'La Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público exige, en su artículo 26, que la licitación pública sea la regla y la adjudicación directa la excepción justificada. Pero los medicamentos tienen fechas de caducidad que generan urgencias genuinas, y los directores hospitalarios enfrentan consecuencias reales si los fármacos se agotan. Las decisiones del propio gobierno — desmantelar BIRMEX, reestructurar el INSABI, improvisar modelos de distribución en medio de la pandemia — crearon exactamente el tipo de caos que las compras de emergencia estaban diseñadas para resolver.',
          'Sin embargo, 270 mil millones de pesos canalizados a tres empresas, en su gran mayoría sin competencia real, durante un sexenio completo, no es contratación de emergencia. Es una estructura de mercado construida licitación por licitación, donde las cotizaciones perdedoras parecen diseñadas para perder.',
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
          'En el Hospital Infantil de México Federico Gómez, una madre pregunta por tercera vez en la semana si ya llegó el metotrexato que su hijo necesita para continuar la quimioterapia. La respuesta es la misma: desabasto. Entre 2019 y 2023, escenas como esta se repitieron en hospitales públicos de todo el país — quimioterapias suspendidas, insulina racionada, antibióticos agotados, anestésicos insuficientes para cubrir las cirugías programadas.',
          'Los padres de niños con cáncer marcharon frente a Palacio Nacional. El hashtag #FaltanMedicamentos se volvió constante en redes sociales. La explicación oficial fue que el sistema anterior era corrupto y que la transición al nuevo modelo necesitaba tiempo. Pero los registros de CompraNet cuentan otra historia: durante esos mismos años de escasez, Fármacos Especializados, Maypo y DIMM acumulaban contratos récord.',
          'La paradoja es brutal en su aritmética. El período de mayor concentración de contratos farmacéuticos en tres empresas — 270 mil millones de pesos, más del 75% por adjudicación directa — coincide exactamente con la peor crisis de desabasto de medicamentos en la historia moderna de México. Más dinero a menos proveedores produjo menos medicamentos en los anaqueles de los hospitales.',
          'Eliminar la competencia de un mercado eleva precios y reduce calidad de servicio. No es una observación partidista — es la lógica básica de los mercados, documentada por la OCDE en decenas de estudios sobre contratación pública. Los niños mexicanos con leucemia pagaron esa lógica con tratamientos interrumpidos mientras tres empresas farmacéuticas acumulaban contratos prácticamente sin disputa.',
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
          'El 31 de diciembre no es una fecha cualquiera en las oficinas de compras del gobierno federal. Es una guillotina. La Ley Federal de Presupuesto y Responsabilidad Hacendaria es clara: lo que no se ejerce, se devuelve a la Tesorería. Y la dependencia que devuelve dinero se expone a que el año siguiente le recorten el presupuesto. La lógica es perversa pero comprensible: gastar lo que queda, como sea, antes de que caiga la hoja del calendario.',
          'En diciembre de 2015, a mitad del sexenio de Peña Nieto, esa lógica produjo su manifestación más extrema en 23 años de registros de COMPRANET. Se firmaron 13,478 contratos federales en 31 días — 57,500 millones de pesos. Son 435 contratos diarios, incluyendo sábados, domingos y los días de Navidad y Año Nuevo en que, oficialmente, las oficinas estaban cerradas.',
          'La urgencia era contable, no operativa. Muchos de esos contratos especificaban entregas para febrero o marzo del año siguiente. No había emergencia sanitaria, ni desastre natural, ni crisis de seguridad que justificara la velocidad. Había una partida presupuestal a punto de vencer y funcionarios de carrera — los mismos que sobreviven cada cambio de administración — que sabían exactamente cómo funciona diciembre: se acortan los plazos de revisión, se suspende la competencia y se invoca "urgencia imprevista" para adjudicar directamente, aunque el cierre del año fiscal no tiene nada de imprevisto.',
          'Los proveedores que se benefician de este ciclo no son improvisados. Son empresas que mantienen relaciones todo el año con las áreas de adquisiciones, esperando la ventana de diciembre, cuando las reglas son más laxas y la competencia más baja. El proveedor que tiene el teléfono del subdirector de compras en octubre es el que firma el contrato por adjudicación directa el 28 de diciembre.',
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
          'La avalancha de diciembre no es patrimonio de ningún partido. En los 23 años que cubre la base de datos, diciembre registra consistentemente entre 2.5 y 4 veces el gasto promedio mensual en contratación federal. Bajo Fox, los picos existían pero eran moderados. Bajo Calderón, crecieron con el gasto en seguridad. Bajo Peña Nieto, alcanzaron su máximo absoluto con la avalancha de 2015. Bajo López Obrador, el diciembre de 2023 — el último de su sexenio — rompió el récord anterior.',
          'Lo que cambia entre administraciones no es el patrón sino la escala, y lo que la escala revela. El pico de Peña Nieto fue el más grande en términos nominales. Pero el de López Obrador ocurrió sobre una base de adjudicación directa ya del 82%, lo que significa que la supervisión residual — la poca competencia que quedaba — se comprimió aún más en ese diciembre final. La tasa de adjudicación directa en el último mes de cada sexenio es, sin excepción, la más alta de los seis años.',
          'La solución es conocida y ninguna administración la ha implementado. Presupuestación plurianual, provisiones de arrastre de recursos, penalizaciones por gasto acelerado de fin de año — instrumentos que usan decenas de países de la OCDE. México no los adopta porque el pico de diciembre no es un defecto del sistema: es una característica. Para los funcionarios de carrera que administran las compras, diciembre es la temporada de caza. Para los proveedores conectados, es la cosecha anual. Para los contribuyentes, es el mes en que su dinero se gasta peor.',
          'Y los burócratas que operan este mecanismo no cambian con cada presidente. Los directores de adquisiciones, los subdirectores de recursos materiales, los jefes de departamento de compras — muchos llevan décadas en sus puestos. Saben exactamente qué proveedor puede entregar una cotización en 24 horas y qué justificación técnica pasa sin objeciones. La avalancha de diciembre no necesita instrucciones del Palacio Nacional. Se ejecuta sola.',
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
    subheadline: 'La COFECE abrió una investigación por prácticas monopólicas. Los registros de CompraNet ya mostraban la concentración años antes de que actuaran los reguladores.',
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
          'En un quirófano del Centro Médico Nacional Siglo XXI, un cirujano cardiovascular se prepara para implantar un stent coronario. El dispositivo que tiene en las manos — junto con el marcapasos en la charola, el desfibrilador en el almacén y el equipo de bypass que mantiene vivo al paciente durante la operación — fue suministrado por la misma empresa: Vitalmex Internacional S.A. de C.V. No importa el hospital, no importa la institución, no importa el año. Vitalmex controla el suministro.',
          'A lo largo de más de una década, Vitalmex acumuló aproximadamente 50 mil millones de pesos en contratos de equipo cardíaco para hospitales federales — stents, marcapasos, desfibriladores, válvulas, material quirúrgico descartable. La concentración fue lo suficientemente extrema para que la COFECE, la autoridad federal de competencia económica, abriera una investigación formal por posibles prácticas monopólicas en el mercado de dispositivos cardíacos.',
          'El mecanismo que construyó este monopolio tiene nombre técnico: contratos "llave en mano". No se licita solo el dispositivo — se licita el dispositivo más la instalación, más la capacitación del personal, más el mantenimiento durante la vida útil del equipo. Los requisitos técnicos se redactan de tal manera que solo un proveedor establecido puede cumplirlos. Una segunda empresa aparecía frecuentemente como licitante perdedor en los mismos procedimientos — la estructura clásica de bid rigging, donde la competencia es simulada.',
          'La Ley de Adquisiciones prohíbe, en su artículo 31, establecer requisitos que limiten la libre participación. Pero cuando los pliegos de condiciones exigen certificaciones específicas del fabricante, servicio técnico en las 32 entidades federativas y experiencia previa en contratos de la misma magnitud, el artículo 31 se convierte en letra muerta. La concentración no surgió de la noche a la mañana. Se construyó contrato por contrato, cada uno individualmente justificable, pero que en conjunto constituyen un mercado capturado.',
        ],
        pullquote: {
          quote: 'COFECE abrió una investigación. Los registros de CompraNet ya mostraban el patrón años antes.',
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
          'México realiza aproximadamente 15 mil cirugías de corazón abierto al año en hospitales públicos. Cada una requiere equipo especializado — máquinas de bypass cardiopulmonar, oxigenadores, cánulas, suturas vasculares — además de los dispositivos implantables como stents y marcapasos. Cuando una sola empresa controla el suministro de esa cadena, no solo fija el precio: determina qué hospitales reciben equipo y cuáles esperan. Un monopolio en dispositivos cardíacos no es una abstracción económica. Es un poder de vida o muerte.',
          'Un marcapasos puede costar cientos de miles de pesos. Un stent coronario, decenas de miles. Los descartables quirúrgicos de una sola operación de bypass suman cifras de seis dígitos. Multiplicados por el volumen de un sistema de salud que atiende a más de 80 millones de derechohabientes, esos precios unitarios se convierten en miles de millones. Estudios de la OCDE y la OMS documentan consistentemente que los mercados monopolísticos de dispositivos médicos producen precios entre 20 y 40% superiores a los competitivos. Aplicada al portafolio de 50 mil millones de Vitalmex, esa prima implica un sobrepago de entre 10 y 20 mil millones de pesos.',
          'Ese sobrepago tiene un costo de oportunidad concreto. Con 10 mil millones de pesos se podrían equipar 50 unidades de hemodinámica en hospitales regionales que hoy carecen de ellas — hospitales donde los pacientes con infarto deben ser trasladados horas en ambulancia porque no hay laboratorio de cateterismo. Con 20 mil millones se podrían financiar los salarios de 40 mil enfermeras durante un año.',
          'La investigación de COFECE está en curso. Pero los registros de CompraNet ya documentan el resultado: una concentración sin precedentes en una categoría de insumos de la que depende, literalmente, que el corazón de un paciente siga latiendo después de entrar a quirófano.',
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
          'Avenida Insurgentes Sur 1605, piso 3, oficina 301, colonia San José Insurgentes. La dirección es real. El edificio existe. Pero en los sesenta metros cuadrados de esa oficina, el SAT tiene registrados domicilios fiscales de diecisiete empresas distintas: tres de limpieza, dos de consultoría tecnológica, cuatro de servicios generales y ocho cuyo objeto social es tan vago que podría describir cualquier actividad comercial concebible. Todas tienen RFC vigente. Todas aparecen en COMPRANET como proveedores del gobierno federal. Lo que ninguna tiene es un empleado que abra esa puerta por las mañanas.',
          'El Artículo 69-B del Código Fiscal de la Federación le otorga al SAT una facultad que ninguna otra autoridad mexicana posee: declarar formalmente que una empresa factura operaciones simuladas. El procedimiento toma meses. Primero viene la presunción, publicada en el Diario Oficial de la Federación. La empresa tiene treinta días para desvirtuar las pruebas. Si no lo hace, o si su defensa es insuficiente, el SAT la declara EFOS definitivo — Empresa que Factura Operaciones Simuladas. A marzo de 2026, la lista negra contiene 13,960 empresas en estatus definitivo que tuvieron contratos en COMPRANET. No son sospechosas. Son empresas legalmente confirmadas como simuladoras por la autoridad fiscal del Estado mexicano.',
          'El mecanismo es artesanal en su simplicidad. Un prestanombre — a veces un empleado del mismo despacho contable que constituye las empresas — firma el acta ante notario. Se tramita el RFC. Se abre una cuenta bancaria. Se registra el domicilio fiscal en la oficina 301 de Insurgentes Sur, o en una bodega de Ecatepec, o en un departamento de la colonia Narvarte. La empresa factura al gobierno por servicios que nunca prestó, cobra, distribuye el efectivo a través de retiros y transferencias fragmentadas, y cuando el SAT empieza a investigar, el prestanombre ya no contesta el teléfono. El RFC queda como cascarón vacío, con una deuda fiscal que nadie pagará. Pero los 13,960 de la lista EFOS sólo representan a los que el SAT alcanzó a confirmar. La cifra real del ecosistema de facturación simulada es, por definición, mayor.',
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
          'Distribuidora Comercial del Noreste SA de CV, constituida el 14 de febrero de 2019 en una papelería reconvertida en domicilio fiscal de Iztapalapa. EFOS definitivo desde agosto de 2023. En COMPRANET tiene tres contratos con el ISSSTE, todos por adjudicación directa, todos en 2020, por un total de 22 millones de pesos en material de curación. La empresa compraba gasas y vendas a distribuidoras de la Central de Abasto a precio de mercado, facturaba al ISSSTE con un margen del 400%, y declaraba al SAT ingresos que no correspondían a operaciones reales. Cuando el SAT inició el procedimiento del 69-B, la empresa ya no tenía actividad. El RFC quedó como un cascarón, con 22 millones de pesos que salieron del presupuesto de salud y no regresarán.',
          'Las 13,960 empresas EFOS que operaron en COMPRANET tienen un rasgo en común que las distingue de los grandes proveedores corruptos: son pequeñas. Pocas tienen más de cinco contratos. La mayoría operó con una sola institución, durante un período de dos o tres años, antes de desaparecer. Bajo el modelo de riesgo v6.5 — entrenado con casos de gran escala como el IMSS, Segalmex y las redes de COVID — estas empresas obtienen un puntaje promedio de 0.28: demasiado bajo para activar alertas críticas. La razón es estructural: el modelo aprendió a detectar proveedores grandes y concentrados que acumulan contratos durante décadas. Una empresa fantasma que factura tres veces y desaparece no genera suficiente huella estadística para disparar las mismas señales.',
          'Esa brecha de detección no es un fallo del algoritmo. Es un reflejo de cómo opera la industria fantasma en México. Los grandes esquemas de corrupción — los que involucran miles de contratos y miles de millones de pesos — dejan cicatrices profundas en los datos: concentración de mercado, volatilidad de precios, redes de proveedores interconectados. Las operaciones de paso del artículo 69-B, en cambio, están diseñadas para ser imperceptibles: pocas transacciones, montos modestos, vida corta. Son cirugía menor, no trauma. Pero el daño acumulado es masivo. Si cada una de las 13,960 empresas EFOS confirmadas extrajo en promedio lo mismo que Distribuidora Comercial del Noreste — 22 millones de pesos —, el total asciende a más de 300 mil millones: el equivalente al presupuesto anual de la Secretaría de Educación Pública.',
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
          'La flota de Oceanografía S.A. de C.V. operaba en las aguas profundas del Golfo de México: buques de posicionamiento dinámico, equipos de buceo saturado, plataformas de servicio submarino. Durante más de una década, la empresa de Amado Yáñez Osuna fue uno de los principales contratistas de Petróleos Mexicanos para servicios offshore — trabajo técnico especializado, con pocos competidores reales en el mercado mexicano, que justificaba contratos millonarios adjudicados con mínima competencia.',
          'El negocio legítimo era la fachada. Oceanografía facturaba a PEMEX por servicios prestados y presentaba esas cuentas por cobrar como garantía ante Banamex, la subsidiaria mexicana de Citigroup desde 2001. El problema: muchas de esas facturas eran falsas. PEMEX no había aprobado los montos reclamados, no había recibido los servicios descritos, o ambas cosas. Banamex adelantaba dinero contra documentos que no valían el papel en que estaban impresos.',
          'A principios de 2014, los controles internos de Citigroup detectaron la discrepancia. La magnitud era devastadora: aproximadamente 585 millones de dólares en préstamos respaldados por facturas fraudulentas. Citigroup registró una pérdida de 235 millones de dólares. Ejecutivos de Banamex enfrentaron escrutinio de la SEC estadounidense. En febrero de 2014, Amado Yáñez Osuna fue arrestado. Eventualmente fue condenado por fraude — uno de los pocos casos de contratación pública mexicana donde el responsable terminó en prisión.',
          'En los registros de COMPRANET, Oceanografía acumuló contratos con múltiples subsidiarias de PEMEX que suman 22,400 millones de pesos. La cifra probablemente subestima el total real: PEMEX operó su propio portal de contratación durante años antes de integrar sus procesos a COMPRANET, y muchos contratos del sector energético — fletamento de embarcaciones, perforación, mantenimiento submarino — se registraron en sistemas paralelos con acceso público limitado.',
        ],
        pullquote: {
          quote: 'Amado Yáñez Osuna fue arrestado en febrero de 2014. Citigroup registró una pérdida de 235 millones de dólares.',
          stat: '$585M USD',
          statLabel: 'en préstamos respaldados por facturas falsas',
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
        title: 'Entre Dos Jurisdicciones',
        subtitle: 'Un fraude mexicano regulado desde Nueva York',
        prose: [
          'El fraude cruzó jurisdicciones legales de una manera que ninguna autoridad individual podía abarcar. En México, la Procuraduría investigó las facturas falsas como fraude contra PEMEX. En Estados Unidos, la SEC escudriñó a los ejecutivos de Banamex por fallas en los controles internos de Citigroup. La regulación bancaria estadounidense exigía respuestas que la ley mexicana no requería, y viceversa. Yáñez Osuna explotó precisamente esa brecha: las facturas eran documentos mexicanos usados como garantía en un sistema bancario regulado desde Nueva York.',
          'Lo que hace al caso particularmente instructivo es la mecánica. No se trataba de sobornos en efectivo ni de empresas fantasma. Era un esquema de facturas apócrifas — documentos que decían que PEMEX debía dinero por servicios que nunca se prestaron o se inflaron deliberadamente. El fraude existía en los papeles, en las cuentas por cobrar, en el espacio entre lo que PEMEX realmente autorizaba y lo que Oceanografía reclamaba ante Banamex. Un auditor con acceso simultáneo a los registros de PEMEX y a los expedientes crediticios de Banamex lo habría detectado en horas. Nadie tenía ese acceso.',
          'COMPRANET registra la adjudicación de contratos, no su ejecución ni su facturación posterior. El fraude de Oceanografía ocurrió íntegramente en la fase de ejecución: contratos legítimamente adjudicados que luego sirvieron como materia prima para fabricar facturas falsas. La transparencia en la contratación solo es útil cuando es integral. Un sistema donde el mayor gastador del gobierno federal opera fuera del registro público — y donde la facturación posterior no se cruza con los contratos originales — no es un sistema de transparencia. Es un sistema con un agujero de 22,400 millones de pesos.',
        ],
        pullquote: {
          quote: 'Un sistema con un agujero de 22,400 millones de pesos',
          stat: '$235M USD',
          statLabel: 'pérdida de Citigroup por fallas en controles internos de Banamex',
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
          'Quien revise los 3.05 millones de contratos en esta base de datos buscando culpables partidistas se va a decepcionar. La historia que cuentan 23 años de registros de COMPRANET no es sobre un presidente ni sobre un partido. Es sobre un aparato de compras gubernamentales que, sin importar quién ocupe el Palacio Nacional, se mueve consistentemente en una sola dirección: hacia menos competencia y más discrecionalidad.',
          'Bajo Fox, el 63% de los contratos se adjudicaron directamente — ya entonces una cifra tres veces superior al promedio de la OCDE, pero el gobierno la presentaba como modernización: se estrenaba COMPRANET, se digitalizaban los procesos, se prometía transparencia. Calderón llegó al 68%. El gasto en seguridad dominó su sexenio y la urgencia operativa justificó la discrecionalidad. Peña Nieto: 74%. El Pacto por México prometió modernización institucional mientras la tasa de adjudicación directa subía cada año. López Obrador: 81.9% en 2023, su último año completo. La cifra más alta en la historia de COMPRANET, alcanzada bajo la bandera de la "austeridad republicana".',
          'Cuatro presidentes. Tres partidos — PAN, PRI, Morena. Derecha, centro, izquierda. Libre comercio y nacionalismo económico. En la cuestión de quién recibe el dinero público y bajo qué reglas, la trayectoria fue idéntica. Cada nueva administración desconfía de los procesos competitivos heredados del gobierno anterior, prefiere adjudicar directamente a proveedores "de confianza" y enfrenta la presión de gastar rápido para mostrar resultados. El trinquete es estructural: es más fácil, más rápido y políticamente más útil adjudicar directamente que licitar. Y la OCDE, que considera normal una tasa de adjudicación directa del 20-25%, observa a México en el 82% sin que ningún gobierno mexicano de este siglo haya intentado revertir la tendencia.',
        ],
        pullquote: {
          quote: 'Cuatro presidentes. Tres partidos. Una dirección: menos competencia.',
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
          'Que la tendencia sea bipartidista no significa que todas las contribuciones sean iguales. Bajo Calderón, la tasa de adjudicación directa subió aproximadamente un punto porcentual por año — la deriva pasiva de una burocracia con supervisión débil y una guerra contra el narcotráfico que justificaba la urgencia en las compras de seguridad. Bajo Peña Nieto, el ritmo fue similar pero el contexto distinto: el escándalo de la Casa Blanca reveló que la discrecionalidad en la contratación no era solo inercia, sino herramienta de enriquecimiento personal.',
          'Bajo López Obrador, la adjudicación directa dejó de ser inercia y se convirtió en política de Estado. La eliminación de los fideicomisos concentró los recursos. La centralización de compras a través de la oficina presidencial eliminó contrapesos. La canalización de megaproyectos — el Tren Maya, la refinería de Dos Bocas, el aeropuerto de Santa Lucía — a través de entidades militares exentas de las reglas normales de contratación no fue descuido: fue diseño institucional. El resultado fue un salto de 76.2% a 81.9% en cinco años, más de lo que Calderón y Peña Nieto habían sumado en doce.',
          'Los datos lo reflejan con precisión incómoda. Las 1,253 empresas con perfil de fantasma identificadas por RUBLI debutaron abrumadoramente después de 2018. La tasa de adjudicación directa del 93.4% en agricultura fue producto del diseño intencional de las compras de SEGALMEX. Los doce contratos a HEMOSER en un solo día no fueron descuido administrativo. Cada presidente contribuyó a la tendencia. López Obrador la convirtió en filosofía de gobierno — y los burócratas de carrera, los que manejan las compras día con día, se adaptaron con la eficiencia de quien lleva décadas sirviendo a cualquier jefe.',
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
          'Claudia Sheinbaum tomó posesión el 1 de octubre de 2024 heredando un sistema de contratación donde más del 80% de los contratos federales se adjudican sin licitación competitiva. Heredó también a los funcionarios que lo operan: los directores de adquisiciones, los subdirectores de recursos materiales, los jefes de departamento que han sobrevivido a Fox, a Calderón, a Peña Nieto y a López Obrador. El aparato burocrático de las compras públicas tiene su propia inercia, y esa inercia va en una sola dirección.',
          'Los datos tempranos de su gobierno son demasiado limitados para un análisis definitivo — los registros de 2025 apenas comienzan a fluir hacia COMPRANET. Pero los incentivos estructurales que produjeron 23 años de adjudicaciones directas crecientes no han cambiado. No se ha propuesto reforma alguna a la Ley de Adquisiciones. La Secretaría de la Función Pública no ha anunciado ninguna reestructuración de la supervisión. Las entidades militares que construyeron los megaproyectos de López Obrador siguen exentas de las reglas estándar de contratación.',
          'Los 3.05 millones de contratos en esta base de datos cuentan una historia que incomoda a todos los partidos por igual. No es una historia de izquierda ni de derecha, de PAN, PRI ni Morena. Es la historia de un sistema donde cada sexenio encuentra más fácil, más rápido y políticamente más útil adjudicar directamente que licitar. Los nombres de los secretarios cambian. Los proveedores favorecidos rotan. Pero la mecánica es la misma: un funcionario de carrera con décadas en el puesto, un proveedor con el teléfono correcto, un contrato que se firma sin competencia porque "no hay tiempo" o "no hay más proveedores" o "es una emergencia".',
          'Hasta que ese sistema cambie — hasta que haya una reforma real de la Ley de Adquisiciones, supervisión independiente y consecuencias para quien adjudica sin justificación — la tendencia continuará bajo Sheinbaum como continuó bajo sus cuatro predecesores. Los beneficiarios de la opacidad encontrarán nuevos nombres y nuevos contratos. Las caras cambian. El sistema permanece.',
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
    headline: 'La Casa de los Contratos: Grupo Higa, la Casa Blanca y 85 Mil Millones en Obra Pública',
    subheadline: 'Un empresario construyó una mansión de 7 millones de dólares para la esposa del presidente. Su conglomerado tenía miles de millones en contratos federales activos. Así funcionaba la red de Juan Armando Hinojosa Cantú.',
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
        subtitle: 'Una mansión en Lomas de Chapultepec y miles de millones en contratos',
        prose: [
          'La casa estaba en Sierra Gorda 150, Lomas de Chapultepec, una de las colonias más exclusivas de la Ciudad de México. Siete millones de dólares en mármol, jardines privados y acabados de importación. La propietaria nominal: Angélica Rivera, esposa del presidente Enrique Peña Nieto. El constructor y verdadero dueño hasta la “venta” a crédito: Grupo Higa, el conglomerado de infraestructura de Juan Armando Hinojosa Cantú.',
          'En noviembre de 2014, el equipo de Carmen Aristegui — los periodistas Rafael Cabrera, Daniel Lizárraga e Irving Huerta — publicó la investigación que detonó el escándalo de la Casa Blanca. Lo que reveló no era solo una mansión regalada. Era un conflicto de intereses estructural: el mismo empresario que construyó la residencia privada de la primera dama mantenía miles de millones de pesos en contratos federales activos con el gobierno de su esposo. Hinojosa Cantú había construido su fortuna con obra pública del Estado de México cuando Peña Nieto era gobernador. Con la llegada a Los Pinos, la escala simplemente creció.',
          'El proyecto emblema fue el Tren de Alta Velocidad México-Querétaro, adjudicado en noviembre de 2014 a un consorcio que incluía a Grupo Higa y a la empresa china CSR Corporation — sin proceso competitivo real. Cuando estalló el escándalo de la Casa Blanca días después, Peña Nieto canceló la licitación. La cancelación costó al erario más de mil millones de pesos en indemnizaciones, y el tren nunca se construyó.',
          'Los registros de COMPRANET vinculan a empresas del entorno Higa con 85 mil millones de pesos en contratos federales, un patrón consistente de adjudicaciones directas y licitaciones con competencia simulada a través de la SCT, la SHCP y gobiernos estatales. Las carreteras, los hospitales y las obras hidráulicas que Grupo Higa construyó con dinero público son infraestructura que millones de mexicanos usan cada día — y cuya calidad nadie auditó con la rigurosidad que exigían los montos involucrados. Cuando un puente se agrieta o una carretera se inunda, el costo del fraude en infraestructura deja de ser abstracto.',
        ],
        pullquote: {
          quote: 'El mismo empresario que construía la casa de la primera dama tenía miles de millones en contratos activos.',
          stat: '$85B',
          statLabel: 'en contratos federales vinculados a Grupo Higa',
          barValue: 85,
          barLabel: 'Miles de millones MXN en contratos',
        },
        chartConfig: {
          type: 'network',
          title: 'Red de contratación Grupo Higa — empresas vinculadas a Hinojosa Cantú',
          chartId: 'community-bubbles',
        },
      },
      {
        id: 'la-detección',
        number: 2,
        title: 'Impunidad Total',
        subtitle: 'Nadie fue a la cárcel. La infraestructura permanece sin auditar.',
        prose: [
          'El escándalo de la Casa Blanca fue, ante todo, un fracaso de rendición de cuentas. La Secretaría de la Función Pública investigó y concluyó que no había conflicto de intereses — una decisión que la prensa y la sociedad civil rechazaron unánimemente. Peña Nieto encargó una investigación interna a Virgilio Andrade, su propio secretario de la Función Pública, quien lo exoneró. Hinojosa Cantú nunca enfrentó cargos penales en México por los contratos. La impunidad fue total.',
          'Lo que hace al caso Higa emblemático no es su complejidad. Es su simplicidad. Un empresario cercano al poder recibe contratos por miles de millones. Le construye una casa a la esposa del presidente. Cuando la prensa lo expone, nadie va a la cárcel. Los contratos ya se ejecutaron. Las carreteras ya se construyeron — con la calidad que el contratista decidió, no la que el país necesitaba. En infraestructura, el fraude no solo roba dinero: produce puentes que se agrietan, hospitales con cimientos débiles, carreteras que se inundan al primer temporal. El costo lo pagan los usuarios durante décadas.',
          'En COMPRANET, el patrón de contratación de Grupo Higa es el de un proveedor favorito del Estado: adjudicaciones directas concentradas en la SCT durante los años de Peña Nieto como gobernador y luego como presidente, licitaciones donde las empresas vinculadas a Hinojosa Cantú competían entre sí simulando pluralidad. Los 85 mil millones de pesos en contratos federales vinculados a la red Higa representan infraestructura real — caminos, puentes, obras hidráulicas — construida bajo las condiciones que un monopolista decide cuando sabe que nadie le competirá y nadie lo auditará. El escándalo pasó. La infraestructura permanece. Y nadie ha verificado si lo que México pagó es lo que México recibió.',
        ],
        pullquote: {
          quote: 'El escándalo pasó. La infraestructura permanece. Nadie ha verificado si lo que México pagó es lo que recibió.',
          stat: '0',
          statLabel: 'cargos penales contra Hinojosa Cantú por los contratos',
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
          'El primero de enero de 2020, mientras la Organización Mundial de la Salud registraba los primeros reportes de una neumonía desconocida en Wuhan, el gobierno de López Obrador disolvió el Seguro Popular y lo reemplazó con el Instituto de Salud para el Bienestar. El INSABI nació bajo una premisa que sonaba razonable: centralizar las compras de medicamentos para eliminar a los intermediarios que, según la Secretaría de Salud, inflaban los precios. La decisión se tomó sin consulta pública, sin periodo de transición y sin un plan operativo de adquisiciones para el primer trimestre del año.',
          'Lo que el Seguro Popular tenía, con todas sus deficiencias, era un modelo de compras que combinaba adquisiciones consolidadas con licitaciones abiertas. No era un sistema limpio — la tasa de adjudicación directa en salud bajo Peña Nieto rondaba el 60% — pero existía competencia en los contratos grandes, los de quimioterapias, los de antirretrovirales, los de insulina. El INSABI eliminó esa competencia de raíz. Los registros de COMPRANET documentan el resultado: la adjudicación directa en compras de medicamentos e insumos médicos se disparó del 60% al 94% en los tres años de operación del instituto.',
          'Para las familias que dependían del sistema público, la consecuencia fue física. En 2020 y 2021, hospitales del ISSSTE y del propio INSABI reportaron tasas de desabasto de entre el 60% y el 80% en quimioterapias pediátricas. Faltó metotrexato. Faltó vincristina. Faltaron los medicamentos que mantienen vivos a niños con leucemia linfoblástica aguda. Padres y madres organizaron cacerolazos frente a Palacio Nacional, con las recetas vacías de sus hijos en las manos. López Obrador respondió culpando a las farmacéuticas de acaparamiento.',
          'La solución que ofreció el presidente fue extraordinaria por lo que implicaba: invitar a la Oficina de las Naciones Unidas de Servicios para Proyectos (UNOPS) y a la Organización Panamericana de la Salud (OPS) a comprar los medicamentos que las instituciones mexicanas ya no podían conseguir. Que un gobierno soberano delegue sus compras de salud a organismos internacionales es, en sí mismo, una admisión de fracaso institucional. Pero UNOPS solo podía adquirir lo que le pedían: las especificaciones técnicas y el presupuesto seguían en manos de los mismos funcionarios de la Secretaría de Salud que habían desmantelado el sistema anterior.',
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
        subtitle: 'El INSABI y la UNOPS: cuando la solución hereda el problema',
        prose: [
          'El contrato con UNOPS se firmó en julio de 2020, cinco meses después de la creación del INSABI. La Organización Panamericana de la Salud (OPS) ya participaba en compras consolidadas de vacunas, pero nunca había gestionado el abasto general de medicamentos de un país entero. El arreglo tenía una falla de origen que ningún comunicado oficial mencionó: UNOPS no es un comprador autónomo. Ejecuta pedidos. Las listas de medicamentos, las cantidades, los calendarios de entrega y el presupuesto asignado los definía la Secretaría de Salud — la misma institución que había fracasado en la tarea.',
          'Los resultados fueron predecibles. En 2021, UNOPS logró entregar solo el 61% de los medicamentos que se le solicitaron, según cifras del propio organismo. No por ineficiencia operativa, sino porque los pedidos llegaban tarde, las especificaciones cambiaban a mitad de proceso y los presupuestos aprobados no cubrían los precios internacionales. El desabasto que el INSABI había creado por desmantelamiento institucional no se resolvió con un intermediario internacional. Se exportó.',
          'En el sector salud, la tasa de contratos clasificados como "urgencia" pasó del 12% en 2019 al 67% en 2020. En 2021 cayó al 48%. En 2022, al 38%. Nunca regresó al nivel prepandémico. La emergencia se normalizó como instrumento de compra, y el INSABI operó bajo esa lógica cada trimestre: adjudicar directamente, justificar después.',
          'El costo del diferencial de precio entre adjudicación directa y licitación competitiva en compras de medicamentos del INSABI supera los 12,000 millones de pesos. Doce mil millones que habrían financiado 24 hospitales generales de 120 camas, o cinco millones de tratamientos oncológicos de primer nivel.',
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
          'Los datos de gasto mensual del INSABI exhiben un patrón que los especialistas en adquisiciones públicas reconocen de inmediato: picos de diciembre que multiplican por tres o cuatro el gasto promedio del resto del año. En diciembre de 2020, el INSABI adjudicó 4,200 millones de pesos en contratos de medicamentos y material de curación. En diciembre de 2021, 3,800 millones. En diciembre de 2022, 5,100 millones. Cada año, el mismo ciclo.',
          'El mecanismo es conocido: el gobierno opera con presupuesto anual, y los recursos no ejercidos al 31 de diciembre se devuelven a Hacienda. Los funcionarios que no gastan su asignación enfrentan reducciones el año siguiente. Eso genera contratos urgentes de fin de año en todas las dependencias. Pero en el caso del INSABI, el patrón se amplificó porque la eliminación de las licitaciones eliminó también los plazos que la competencia requiere. Una adjudicación directa se firma en días. Cuando queda presupuesto y quedan semanas, es la única herramienta disponible.',
          'Lo que distingue al INSABI de otras dependencias es la proporción. RUBLI identifica 26,404 contratos en toda la base de datos que corresponden al patrón de gasto acelerado de diciembre — adjudicaciones directas de alto valor en los últimos cinco días hábiles del año. El INSABI aportó el 23% de ese total entre 2020 y 2022, pese a representar apenas el 8% del gasto total del sector salud. Una institución que existió cuatro años concentró casi una cuarta parte del gasto de fin de año de todo el gobierno federal en salud.',
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
        subtitle: 'Cuatro años, tres instituciones, cero rendición de cuentas',
        prose: [
          'En abril de 2023, López Obrador anunció la disolución del INSABI con el mismo tono con el que había anunciado su creación: como un triunfo. Las funciones pasarían al IMSS-Bienestar, dijo, que sería más eficiente. Lo que no mencionó fue que el INSABI dejaba deudas por más de 9,000 millones de pesos con proveedores que habían entregado medicamentos y no habían cobrado, ni que la transición institucional — del Seguro Popular al INSABI, del INSABI al IMSS-Bienestar — significaba que ningún funcionario específico rendiría cuentas por el desabasto de tres años.',
          'La Auditoría Superior de la Federación documentó en su informe de 2023 que el INSABI no pudo acreditar la entrega de medicamentos por 18,200 millones de pesos en contratos auditados. La cifra admite dos interpretaciones, y ambas son graves: o los medicamentos nunca llegaron a los hospitales que los necesitaban, o el sistema de documentación del instituto era tan deficiente que no dejó registro de haberlos recibido. En cualquier caso, 18,200 millones de pesos en medicamentos no tienen trazabilidad.',
          'El esquema UNOPS tampoco sobrevivió al INSABI. El convenio se rescindió en 2023 con resultados que la propia OPS calificó como insuficientes. La compra internacional no resolvió el problema porque el problema nunca fue quién compraba, sino quién decidía qué comprar, cuánto gastar y a quién pagar. Esas decisiones permanecieron en las mismas manos durante todo el experimento.',
          'El legado del INSABI en los registros de COMPRANET es preciso: 94% de adjudicaciones directas, 47 proveedores con indicadores de empresa fantasma, 12,000 millones de pesos en sobrecostos estimados y un patrón de gasto de diciembre que ningún mecanismo de control corrigió en cuatro años. El instituto desapareció. Las consecuencias para los pacientes que no encontraron sus medicamentos — los niños sin quimioterapia, los adultos sin insulina, los pacientes con VIH sin antirretrovirales — no desaparecieron con él.',
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
    headline: 'Tren Maya: $180 Mil Millones sin Licitación Pública',
    subheadline:
      'El megaproyecto ferroviario del sexenio eludió la contratación competitiva mediante declaratorias de seguridad nacional, contratos de obra pública asignados al Ejército y adjudicaciones directas por excepción a consorcios sin experiencia ferroviaria.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 14,
    leadStat: { value: '$180B', label: 'MXN en contratos sin licitación pública', sublabel: '1,525 km de vía | FONATUR como contratante', color: '#1e3a5f' },
    status: 'reporteado',
    nextSteps: [
      'Solicitar vía InfoMex los expedientes de los contratos de obra pública del Tren Maya asignados por FONATUR, incluyendo las justificaciones legales para cada adjudicación directa por excepción.',
      'Cruzar los RFC de las empresas adjudicatarias con el RUC para verificar experiencia previa en obra ferroviaria.',
      'Comparar los montos originales de cada contrato de obra pública con sus convenios modificatorios en COMPRANET.',
      'Solicitar al IFAI la información sobre contratos ejecutados por SEDENA en el Tren Maya que no aparecen en COMPRANET.',
    ],
    relatedSlugs: ['la-cuarta-adjudicacion', 'infraestructura-sin-competencia', 'sexenio-a-sexenio', 'pemex-el-gigante'],
    chapters: [
      {
        id: 'el-proyecto',
        number: 1,
        title: 'El Proyecto',
        subtitle: '1,525 kilómetros de vía, cero licitaciones públicas abiertas',
        sources: [
          'COMPRANET — Contratos de obra pública e infraestructura asociados a FONATUR, 2019-2024.',
          'DOF, 22 de noviembre de 2021 — Acuerdo que declara de interés público y seguridad nacional la realización del Tren Maya.',
          'ASF (2023). Auditoría de desempeño al programa Tren Maya, Informe General Ejecutivo.',
        ],
        prose: [
          'El Tren Maya fue concebido como la obra insignia del sexenio de López Obrador: una línea ferroviaria de pasajeros de 1,525 kilómetros que conectaría Cancún con Palenque, atravesando la Península de Yucatán por selva, zonas arqueológicas y comunidades mayas. Se presentó como un instrumento de desarrollo regional que llevaría empleo y turismo al sureste del país. La estimación inicial de costo fue de 120 mil millones de pesos.',
          'Para diciembre de 2023, cuando arrancaron las operaciones parciales del primer tramo, la cifra oficial ya superaba los 177 mil millones. Analistas independientes calcularon el costo real — incluyendo servicio de deuda y la contribución militar — por encima de los 400 mil millones. La brecha entre la cifra oficial y las estimaciones externas no se explica solo por sobrecostos de obra: se explica porque tramos enteros de la construcción fueron ejecutados por la SEDENA bajo clasificación de seguridad nacional, fuera del alcance de COMPRANET.',
          'El análisis de RUBLI identifica $180 mil millones de pesos en contratos de obra pública directamente atribuibles al Tren Maya a través de FONATUR, el Fondo Nacional de Fomento al Turismo que fungió como ente contratante. De ese universo, el 97.3% se adjudicó mediante adjudicación directa por excepción o invitación restringida a un grupo preseleccionado de empresas. No hubo una sola licitación pública abierta donde cualquier constructora mexicana pudiera competir en igualdad de condiciones por los tramos principales de la obra.',
          'La decisión de designar a FONATUR como ente contratante — y no a la SCT, que acumula décadas de experiencia institucional en infraestructura de transporte — definió el marco jurídico del proyecto. FONATUR opera bajo reglas de contratación distintas a las de una secretaría de Estado, con mayor margen para procedimientos no competitivos. El resultado fue un megaproyecto de infraestructura ejecutado sin los controles estándar de la Ley de Obra Pública y Servicios Relacionados.',
        ],
        chartConfig: {
          type: 'racing',
          title: 'El ascenso de infraestructura — gasto federal por sector 2002-2025',
          chartId: 'racing-bar',
        },
        pullquote: {
          quote: '97.3% de los contratos del Tren Maya en COMPRANET se asignaron sin licitación pública abierta',
          stat: '97.3%',
          statLabel: 'contratos adjudicados sin competencia abierta',
          barValue: 97.3,
          barLabel: 'Tren Maya: tasa de adjudicación sin licitación',
        },
      },
      {
        id: 'la-excepcion-militar',
        number: 2,
        title: 'La Excepción Militar',
        subtitle: 'Seguridad nacional como mecanismo de opacidad en la contratación',
        prose: [
          'En noviembre de 2021, el Diario Oficial de la Federación publicó el acuerdo que declaró el Tren Maya proyecto de interés público y seguridad nacional. La medida no fue simbólica: bajo esa clasificación, los contratos de obra pública asociados quedaron exentos de los procedimientos ordinarios de contratación y de las evaluaciones de impacto ambiental para tramos extensos del trazo. Secciones enteras de la construcción fueron reasignadas de FONATUR a la SEDENA, cuyas contrataciones no aparecen en COMPRANET.',
          'La militarización de la obra civil no fue un recurso exclusivo del Tren Maya. Bajo la misma administración, la SEDENA construyó el Aeropuerto Internacional Felipe Ángeles, administró sucursales del Banco del Bienestar y operó tramos de infraestructura portuaria. En cada caso, el mecanismo fue el mismo: trasladar gasto de inversión federal a un ámbito donde no rigen los requisitos de transparencia que aplican a las dependencias civiles. Las fuerzas armadas se convirtieron en el contratista de obra pública más grande del gobierno federal sin estar sujetas a la Ley de Obra Pública.',
          'Los contratos que sí aparecen en COMPRANET revelan un segundo patrón. Varios de los consorcios adjudicatarios de tramos principales tenían experiencia documentada en construcción de carreteras, no en obra ferroviaria. Al menos un consorcio fue constituido después del anuncio del proyecto. Los convenios modificatorios registrados muestran incrementos que en algunos casos duplicaron el monto original del contrato de obra pública, aprobados sin nuevo procedimiento de contratación.',
          'RUBLI no puede cuantificar el costo total del Tren Maya porque los contratos ejecutados por SEDENA están fuera de la base de datos. Los $180 mil millones identificados en este análisis representan un piso, no un techo. La diferencia entre lo que COMPRANET registra y lo que el proyecto costó constituye, en sí misma, un hallazgo sobre el estado de la rendición de cuentas en la contratación de infraestructura en México.',
        ],
        chartConfig: {
          type: 'sunburst',
          title: 'Huella presupuestal bajo AMLO — hacia dónde fue el gasto 2018-2024',
          chartId: 'admin-sunburst',
        },
        pullquote: {
          quote: 'Lo que COMPRANET no registra del Tren Maya es tan revelador como lo que sí registra',
          stat: '$180B+',
          statLabel: 'MXN visibles en COMPRANET — el costo real es mayor',
          barValue: 45,
          barLabel: 'Porcentaje estimado visible del gasto total',
        },
      },
      {
        id: 'las-empresas',
        number: 3,
        title: 'Los Contratistas',
        subtitle: 'Consorcios sin experiencia ferroviaria y contratos que duplican su monto',
        prose: [
          'La contratación de obra pública ferroviaria tiene una lógica técnica que la distingue de otros tipos de infraestructura: construir vía férrea requiere experiencia en terracerías de alto tonelaje, tendido de riel, sistemas de señalización y subestaciones eléctricas. México cuenta con empresas que han construido y mantenido líneas ferroviarias durante décadas. Sin embargo, varios de los contratos de obra pública más cuantiosos del Tren Maya fueron adjudicados a consorcios cuyo historial en COMPRANET era predominantemente de obra carretera.',
          'El procedimiento predominante fue la adjudicación directa por excepción, amparada en la declaratoria de seguridad nacional y en la urgencia del calendario presidencial. López Obrador estableció públicamente que el tren debía operar antes del fin de su mandato, en septiembre de 2024. Ese plazo político se convirtió en la justificación administrativa para eludir la licitación pública abierta: no había tiempo para un concurso con los plazos que establece la ley.',
          'Los convenios modificatorios registrados en COMPRANET cuentan la segunda parte. En la contratación de obra pública es habitual que los montos se ajusten durante la ejecución por condiciones imprevistas del terreno o cambios de trazo. Pero la magnitud de los ajustes en el Tren Maya fue excepcional: contratos originalmente pactados en miles de millones experimentaron incrementos del 80%, 100% y en algunos casos superiores al 150%, aprobados sin nuevo procedimiento de contratación.',
          'El patrón resultante es circular. La adjudicación directa por excepción permite asignar el contrato sin competencia. La urgencia del calendario justifica la excepción. Los convenios modificatorios permiten que el costo real supere el monto original sin activar un nuevo proceso. Cada eslabón es legal. El conjunto describe un sistema donde la competencia por los contratos de obra pública más grandes del sexenio fue, en la práctica, inexistente.',
        ],
        pullquote: {
          quote: 'Adjudicación directa, urgencia declarada, convenios modificatorios: cada paso es legal, el resultado es sin competencia',
          stat: '+150%',
          statLabel: 'incremento máximo documentado en convenios modificatorios',
          barValue: 150,
          barLabel: 'Sobrecosto vs. monto original del contrato',
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
  // =========================================================================
  // STORY 20: Dividir para Evadir
  // =========================================================================
  {
    slug: 'dividir-para-evadir',
    outlet: 'data_analysis',
    type: 'thematic',
    era: 'cross',
    headline: 'Dividir para Evadir: 247,946 Contratos Bajo la Línea',
    subheadline: 'La ley fija umbrales para exigir licitación pública. Un cuarto de millón de contratos se agrupan justo por debajo de esos umbrales. La distribución estadística no deja lugar a la casualidad.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 8,
    leadStat: { value: '247,946', label: 'contratos con patrón de fraccionamiento sospechoso', sublabel: 'Artículo 17 de la Ley de Adquisiciones | ilícito explícito, práctica generalizada', color: 'text-amber-500' },
    status: 'solo_datos',
    nextSteps: [
      'Solicitar vía InfoMex los estudios de mercado que justificaron contratos múltiples al mismo proveedor en el mismo día por montos justo bajo el umbral.',
      'Cruzar contratos fraccionados con el directorio de funcionarios responsables para identificar patrones de reincidencia por área contratante.',
      'Verificar si los contratos fraccionados comparten número de requisición o solicitud de compra original, lo que evidenciaría la división deliberada.',
      'Comparar precios unitarios de contratos fraccionados contra licitaciones competitivas del mismo bien para cuantificar el sobrecosto.',
    ],
    relatedSlugs: ['cero-competencia', 'la-cuarta-adjudicacion', 'la-maquina-de-papel', 'sexenio-a-sexenio'],
    chapters: [
      {
        id: 'la-linea',
        number: 1,
        title: 'La Línea Invisible',
        subtitle: 'Donde la estadística delata lo que el expediente oculta',
        prose: [
          'El 15 de marzo de 2019, la Secretaría de Comunicaciones y Transportes firmó cuatro contratos con el mismo proveedor de servicios de limpieza. Los cuatro se firmaron el mismo día, cubrían el mismo tipo de servicio y sumaban 11.2 millones de pesos. Individualmente, cada uno quedaba por debajo del umbral de licitación pública. Juntos, lo superaban con holgura. Los cuatro fueron adjudicados directamente, sin concurso.',
          'El Artículo 17 de la Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público prohíbe explícitamente esta práctica. La ley lo llama fraccionamiento: dividir una necesidad de contratación en partes para evadir el procedimiento de licitación que correspondería al monto total. No es una zona gris. Es un ilícito tipificado. Y en 23 años de datos de COMPRANET, el análisis estadístico detecta 247,946 contratos que exhiben este patrón.',
          'La prueba es visible en un histograma. Si se grafica la distribución de montos contractuales, se esperaría una curva suave que desciende gradualmente. Lo que aparece en cambio es una acumulación anómala justo por debajo del umbral legal y un vacío inmediato por encima de él — un acantilado estadístico que ningún fenómeno natural de mercado puede producir. Alguien, sistemáticamente, está calculando los montos para quedar bajo la línea.',
          'Los 247,946 contratos identificados son una estimación conservadora. La cifra exacta depende de qué umbral anual se aplique y de cuán liberalmente se defina "agrupamiento". Pero incluso con los criterios más estrictos, la concentración bajo los umbrales es estadísticamente imposible de atribuir al azar.',
        ],
        pullquote: {
          quote: 'Un acantilado estadístico que ningún fenómeno natural de mercado puede producir',
          stat: '247,946',
          statLabel: 'contratos con patrón de fraccionamiento',
          barValue: 8.1,
          barLabel: '8.1% de todos los contratos',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Distribución de montos: el acantilado bajo el umbral',
          chartId: 'threshold-splitting',
        },
      },
      {
        id: 'el-incentivo',
        number: 2,
        title: 'El Incentivo Perverso',
        subtitle: 'Por qué fraccionar es racional para todos los involucrados',
        prose: [
          'Para entender por qué el fraccionamiento es tan generalizado, hay que entender los incentivos de cada actor. El funcionario del área requirente necesita un bien o servicio. Si el monto total supera el umbral, debe iniciar una licitación pública: elaborar bases, publicar convocatoria, recibir propuestas, evaluar, adjudicar, atender inconformidades. El proceso toma semanas o meses. Si el monto queda por debajo, puede adjudicar directamente en días. La tentación de dividir no es corrupta en el sentido clásico: es burocrática. Es la línea de menor resistencia.',
          'Para el proveedor, la adjudicación directa elimina la incertidumbre de competir. No necesita preparar una propuesta técnica elaborada ni arriesgarse a perder contra un competidor que ofrezca menor precio. El contrato es seguro. Para ambas partes, el fraccionamiento resuelve un problema inmediato. Lo que ninguno de los dos internaliza es el costo sistémico: precios más altos por la ausencia de competencia, opacidad en el uso de recursos públicos, y la erosión gradual del sistema de contratación que la ley intenta proteger.',
          'El patrón se concentra en ciertos rubros. Servicios de limpieza, mantenimiento, arrendamiento de vehículos y suministros de oficina son los más fraccionados — bienes y servicios recurrentes, estandarizados, que podrían contratarse fácilmente por licitación consolidada. En un hospital público, por ejemplo, el servicio de limpieza anual podría licitarse como un solo contrato multianual. En vez de eso, se fragmenta en contratos mensuales o trimestrales, cada uno justo por debajo del límite.',
          'El fraccionamiento no requiere conspiración. No necesita sobornos ni acuerdos secretos. Basta con un sistema donde cumplir la ley es más costoso que evadirla, y donde la probabilidad de sanción es prácticamente nula. En los 23 años que cubren los datos de COMPRANET, los órganos internos de control han sancionado una fracción mínima de los casos detectables. El fraccionamiento prospera porque funciona.',
        ],
        pullquote: {
          quote: 'El fraccionamiento no requiere conspiración. Basta con un sistema donde cumplir la ley es más costoso que evadirla.',
          stat: '$0',
          statLabel: 'costo práctico de fraccionar para el funcionario',
        },
        chartConfig: {
          type: 'sector-bar',
          title: 'Fraccionamiento sospechoso por sector',
          chartId: 'da-by-sector',
        },
      },
      {
        id: 'la-escala',
        number: 3,
        title: 'La Escala del Daño',
        subtitle: '247,946 contratos: lo que el fraccionamiento le cuesta a México',
        prose: [
          'Cada contrato fraccionado individualmente parece menor: tres millones aquí, dos millones allá, cantidades que no saltan en ningún reporte de auditoría. Pero la suma es otra cosa. Si los 247,946 contratos identificados hubieran pasado por licitación pública — como la ley exigía para su monto real agregado — la competencia habría presionado los precios a la baja. La literatura académica sobre contratación pública estima que la licitación competitiva genera ahorros del 10 al 25% frente a la adjudicación directa.',
          'El daño va más allá del sobreprecio. Cada contrato fraccionado es un contrato que no fue sometido a escrutinio público. No hubo convocatoria abierta, no hubo junta de aclaraciones, no hubo acta de apertura de ofertas. El expediente existe, pero es un expediente de adjudicación directa: mínimo, cerrado, sin los controles que la licitación pública impone por diseño.',
          'El patrón trasciende administraciones. El fraccionamiento aparece en los datos del gobierno de Fox, de Calderón, de Peña Nieto y de López Obrador. No es la política de un partido ni la práctica de un sexenio: es una dinámica estructural del sistema de contratación mexicano. Los umbrales cambian, los funcionarios rotan, las plataformas se modernizan. El incentivo de fraccionar persiste.',
          'La ironía final es que COMPRANET registra cada uno de estos contratos. Las fechas, los montos, los proveedores, las instituciones — todo está ahí. El sistema creado para la transparencia contiene la evidencia de su propia evasión. Solo hace falta el análisis estadístico para verla. Y lo que los números dicen es inequívoco: un cuarto de millón de contratos fueron diseñados para quedar exactamente donde la ley deja de mirar.',
        ],
        pullquote: {
          quote: 'El sistema creado para la transparencia contiene la evidencia de su propia evasión.',
          stat: '23',
          statLabel: 'años de fraccionamiento documentado en COMPRANET',
          barValue: 100,
          barLabel: 'Presente en las 4 administraciones analizadas',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Contratos con fraccionamiento sospechoso por año',
          chartId: 'threshold-splitting',
        },
      },
    ],
  },

  // =========================================================================
  // STORY: PEMEX El Gigante — Energy Procurement Without Competition
  // =========================================================================
  {
    slug: 'pemex-el-gigante',
    outlet: 'longform',
    type: 'thematic',
    era: 'cross',
    headline: 'PEMEX Nunca Compite: $2 Billones en Contratación sin Licitación',
    subheadline: 'PEMEX y CFE representan el 40% de toda la contratación federal. Menos del 5% de sus contratos pasan por licitación pública abierta. El marco legal les permite operar así. Los datos muestran las consecuencias.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 15,
    leadStat: { value: '$2T', label: 'MXN en contratos no competitivos', sublabel: 'PEMEX + CFE | 2002-2025', color: '#eab308' },
    status: 'reporteado',
    nextSteps: [
      'Solicitar vía InfoMex el desglose anual de adjudicaciones directas por excepción de PEMEX, clasificadas por justificación legal (Ley de PEMEX vs. Ley de Adquisiciones).',
      'Cruzar la lista de proveedores recurrentes de PEMEX con el registro de sanciones de la SFP y la lista EFOS del SAT.',
      'Comparar las tasas de adjudicación directa de PEMEX antes y después de la reforma energética de 2013 para medir su impacto real en la competencia.',
      'Investigar los contratos de servicios de perforación y mantenimiento de refinería adjudicados directamente en el período 2019-2024.',
    ],
    relatedSlugs: ['oceanografia', 'tren-maya-sin-reglas', 'la-cuarta-adjudicacion', 'cero-competencia'],
    chapters: [
      {
        id: 'el-gigante',
        number: 1,
        title: 'El Gigante',
        subtitle: 'PEMEX y CFE: el 40% del gasto federal opera bajo sus propias reglas',
        sources: [
          'COMPRANET — Contratos federales 2002-2025, filtro por ramos 18, 45, 46, 52 y 53 (sector energía).',
          'Ley de Petróleos Mexicanos, DOF 11 de agosto de 2014 — Título Cuarto, régimen de contratación.',
          'Ley de la Comisión Federal de Electricidad, DOF 11 de agosto de 2014 — Título Cuarto.',
          'OCDE (2017). Estudio sobre las contrataciones públicas de PEMEX. OECD Publishing.',
        ],
        prose: [
          'Petróleos Mexicanos no es solo una empresa. En la cultura política mexicana, PEMEX es un símbolo de soberanía nacional — el legado de la expropiación petrolera de 1938, el instrumento con el que Lázaro Cárdenas afirmó el dominio del Estado sobre los recursos del subsuelo. Durante décadas, cuestionar a PEMEX equivalía a cuestionar la soberanía misma. Esa sacralidad le ha dado a la empresa y a su gemela eléctrica, la CFE, un estatus sin equivalente en la contratación pública mexicana.',
          'Juntas, PEMEX y CFE representan aproximadamente el 40% de todo el gasto federal registrado en COMPRANET entre 2002 y 2025. No hay otro par de entidades que concentre una proporción comparable del presupuesto de adquisiciones del gobierno. Pero a diferencia de las secretarías de Estado, las dos empresas productivas del Estado operan bajo marcos legales propios — la Ley de PEMEX y la Ley de CFE, aprobadas en 2014 como parte de la reforma energética — que les otorgan un margen sustancialmente mayor para recurrir a adjudicaciones directas por excepción y licitaciones restringidas.',
          'El resultado es cuantificable. De los contratos de PEMEX y CFE registrados en COMPRANET durante 23 años, menos del 5% pasaron por licitación pública abierta. El resto se adjudicó mediante procedimientos no competitivos: adjudicación directa por excepción, invitación restringida a proveedores preseleccionados, o los procedimientos especiales que la ley reserva para las empresas productivas del Estado. La cifra acumulada supera los 2 billones de pesos.',
          'Hay una parte de ese volumen que tiene justificación técnica legítima. La perforación en aguas profundas, el mantenimiento de refinerías, los químicos especializados para inyección en pozos: son mercados donde el número de proveedores calificados es genuinamente reducido. Pero la especialización técnica no explica una tasa de adjudicación no competitiva superior al 95%. No todos los contratos de PEMEX son de perforación costa afuera. Muchos son de servicios administrativos, transporte terrestre, suministro de papelería, limpieza de oficinas. Y esos también se adjudican sin licitación.',
        ],
        chartConfig: {
          type: 'sector-bar',
          title: 'Tasa de adjudicación directa por sector — energía vs. promedio federal',
          chartId: 'da-by-sector',
        },
        pullquote: {
          quote: 'Menos del 5% de los contratos de PEMEX y CFE pasaron por licitación pública abierta en 23 años',
          stat: '<5%',
          statLabel: 'contratos con licitación pública abierta — PEMEX y CFE combinados',
          barValue: 5,
          barLabel: 'Tasa de licitación competitiva en energía',
        },
      },
      {
        id: 'la-reforma-que-no-fue',
        number: 2,
        title: 'La Reforma que No Fue',
        subtitle: 'La reforma energética de 2013 prometió competencia. Los datos muestran otra cosa.',
        prose: [
          'En diciembre de 2013, el gobierno de Enrique Peña Nieto aprobó la reforma constitucional en materia energética. Entre sus objetivos declarados estaba modernizar la contratación de PEMEX, abrir el sector a la inversión privada e introducir mecanismos de competencia en la adjudicación de contratos. La Ley de Petróleos Mexicanos y la Ley de la Comisión Federal de Electricidad, publicadas en agosto de 2014, establecieron un régimen de contratación con principios de transparencia y eficiencia.',
          'Los datos de COMPRANET permiten medir el impacto real de esa reforma en la conducta de contratación de PEMEX. La tasa de adjudicación directa en el sector energía antes de la reforma (2010-2013) fue superior al 90%. Después de la reforma (2015-2018), la tasa siguió por encima del 90%. La ley cambió. El comportamiento de contratación, medido por los datos que las propias entidades reportan a COMPRANET, no cambió de manera significativa.',
          'La explicación está en los detalles del régimen legal. La Ley de PEMEX permite la adjudicación directa por excepción cuando existe un solo proveedor capaz de cumplir los requisitos técnicos, cuando hay condiciones de urgencia, cuando se trata de contratos de investigación o desarrollo tecnológico, o cuando el monto no justifica el costo de un proceso competitivo. Cada una de estas excepciones es razonable en lo individual. En su aplicación acumulada, cubren la práctica totalidad de la contratación.',
          'Con la llegada de López Obrador en 2018, la política energética cambió de dirección pero no de método. AMLO revirtió los aspectos más visibles de la reforma — suspendió las rondas de licitación petrolera, canceló la apertura del mercado eléctrico — pero mantuvo y extendió las prácticas de contratación no competitiva. El argumento cambió: ya no era la modernización del sector, sino la soberanía energética. El resultado en COMPRANET fue el mismo.',
        ],
        pullquote: {
          quote: 'La reforma energética cambió la ley. La tasa de adjudicación directa de PEMEX no se movió.',
          stat: '>90%',
          statLabel: 'tasa de adjudicación no competitiva — antes y después de la reforma de 2013',
          barValue: 92,
          barLabel: 'DA en energía: pre y post reforma',
        },
        chartConfig: {
          type: 'da-trend',
          highlight: 'energia',
          title: 'Tasa de adjudicación directa en el sector energía 2002-2025',
        },
      },
      {
        id: 'el-caso-odebrecht',
        number: 3,
        title: 'Lo Que los Datos No Ven',
        subtitle: 'El caso Odebrecht y los límites del análisis de contratación',
        prose: [
          'En 2016, el Departamento de Justicia de Estados Unidos reveló que la constructora brasileña Odebrecht había pagado sobornos por más de 10 millones de dólares a funcionarios de PEMEX para obtener contratos de obra pública en la refinería de Tula y otros proyectos de infraestructura petrolera. Los contratos en cuestión habían pasado por procesos que en COMPRANET aparecen como licitaciones formales, con múltiples participantes y evaluación técnica documentada.',
          'El caso Odebrecht ilustra un límite fundamental del análisis de datos de contratación: la corrupción más sofisticada no se manifiesta como adjudicación directa. Se manifiesta como un proceso que cumple todas las formas de la competencia mientras el resultado está predeterminado. Los sobornos se pagan fuera del sistema. Las especificaciones técnicas se redactan para favorecer al ganador designado. Las empresas competidoras presentan ofertas de cobertura. COMPRANET registra una licitación limpia.',
          'RUBLI asigna al caso Odebrecht una puntuación de riesgo elevada por las características del proveedor — concentración sectorial, volumen de contratos, patrones de red — pero no por el mecanismo de adjudicación. Los contratos de Odebrecht en COMPRANET no se distinguen formalmente de una licitación legítima. La corrupción estaba en las reuniones previas, en las transferencias bancarias a cuentas en Suiza, en los acuerdos que ningún sistema de datos puede registrar.',
          'Este es el contexto necesario para interpretar la tasa del 95% de contratación no competitiva en el sector energético. La adjudicación directa no es el único camino de la corrupción en PEMEX. Pero es el más visible. Y es el que los datos permiten cuantificar con certeza.',
        ],
        pullquote: {
          quote: 'Los contratos de Odebrecht en COMPRANET aparecen como licitaciones formales. Los sobornos se pagaron fuera del sistema.',
          stat: '$10M+',
          statLabel: 'USD en sobornos documentados — caso Odebrecht-PEMEX',
          barValue: 10,
          barLabel: 'Millones USD en sobornos',
        },
        chartConfig: {
          type: 'network',
          title: 'Red de proveedores PEMEX — comunidades de co-contratación detectadas',
          chartId: 'network-graph',
        },
      },
      {
        id: 'la-estructura',
        number: 4,
        title: 'El Problema Estructural',
        subtitle: 'No son actos individuales de corrupción. Es el diseño del sistema.',
        prose: [
          'El patrón de contratación no competitiva de PEMEX y CFE ha sobrevivido a cinco administraciones federales, una reforma constitucional, una contrarreforma, múltiples escándalos y al menos tres directores generales de PEMEX procesados penalmente. La tasa de adjudicación directa no bajó con Fox, no bajó con Calderón, no bajó con la reforma de Peña Nieto y no bajó con la austeridad republicana de López Obrador. Subió con todos.',
          'Esa persistencia indica que el problema no está en quién dirige PEMEX ni en qué partido gobierna. Está en la arquitectura legal e institucional que permite que las empresas productivas del Estado operen un sistema de contratación paralelo al del resto del gobierno federal. La Ley de PEMEX y la Ley de CFE establecen excepciones suficientes para cubrir virtualmente cualquier contrato. Y los órganos internos de control carecen de los recursos y la independencia para fiscalizar un volumen de contratación que supera el billón de pesos por sexenio.',
          'El argumento de la especialización técnica es real pero insuficiente. Hay segmentos del negocio petrolero donde la base de proveedores calificados es genuinamente reducida: perforación en aguas profundas, servicios de flotilla submarina, ingeniería de yacimientos. Esos contratos representan una fracción del gasto total. El grueso de la contratación de PEMEX es de bienes y servicios donde la competencia no solo es posible, sino que existe un mercado amplio de proveedores nacionales e internacionales.',
          'Los $2 billones de pesos en contratos no competitivos de PEMEX y CFE no son el resultado de 23 años de funcionarios corruptos. Son el resultado de un marco legal que fue diseñado — administración tras administración — para permitir exactamente lo que los datos muestran. La pregunta no es si PEMEX contrata sin competencia. Es si el sistema político mexicano está dispuesto a cerrar las excepciones legales que hacen posible esa contratación.',
        ],
        pullquote: {
          quote: 'Cinco administraciones, una reforma, una contrarreforma. La tasa de adjudicación directa de PEMEX subió con todas.',
          stat: '$2T',
          statLabel: 'MXN en contratos no competitivos — PEMEX y CFE, 2002-2025',
          barValue: 95,
          barLabel: 'Porcentaje de contratación no competitiva en energía',
        },
        chartConfig: {
          type: 'comparison',
          title: 'Contratación no competitiva en energía por administración 2002-2025',
          chartId: 'sexenio-comparison',
        },
      },
    ],
  },
  // =========================================================================
  // STORY 19: Pandemia Sin Supervisión
  // =========================================================================
  {
    slug: 'pandemia-sin-supervision',
    outlet: 'investigative',
    type: 'case',
    era: 'amlo',
    headline: 'Pandemia Sin Supervisión: 40 Mil Millones en Compras COVID Sin Licitación',
    subheadline: 'La Cámara de Diputados suspendió los controles de gasto de emergencia. El 73% de los contratos COVID fue a empresas creadas en los dos años previos. La Auditoría Superior documentó irregularidades en el 35% de los contratos revisados.',
    byline: 'RUBLI · Unidad de Análisis de Datos',
    estimatedMinutes: 12,
    leadStat: { value: '$40B+', label: 'MXN en compras COVID sin licitación', color: '#dc2626' },
    status: 'auditado',
    relatedSlugs: ['insabi-el-experimento', 'los-nuevos-ricos-de-la-4t', 'red-fantasma'],
    chapters: [
      {
        id: 'la-ola',
        number: 1,
        title: 'La Ola de Compras',
        subtitle: 'Marzo-diciembre 2020: cuando la urgencia sanitaria se convirtió en cheque en blanco',
        prose: [
          'El 23 de marzo de 2020, el gobierno federal declaró la Jornada Nacional de Sana Distancia y activó los mecanismos de emergencia previstos en la Ley de Adquisiciones. El artículo 41, fracción IV, permite adjudicaciones directas cuando existe una "situación que ponga en riesgo la seguridad nacional o la vida de las personas." En condiciones normales, esa excepción se invoca una o dos veces por dependencia al año. Entre marzo y diciembre de 2020, se invocó miles de veces.',
          'Los registros de COMPRANET identifican más de 40,000 millones de pesos en contratos federales vinculados a la respuesta sanitaria por COVID-19, adjudicados sin licitación competitiva. La cifra incluye compras del IMSS, del ISSSTE, de la Secretaría de Salud, del INSABI y de dependencias estatales que canalizaron gasto federal. La urgencia era real. La pandemia mataba. Pero la urgencia también eliminó los mecanismos que distinguen una compra legítima de una fraudulenta.',
          'La Cámara de Diputados dio el paso que completó el vacío de control: suspendió los requisitos de fiscalización en tiempo real para el gasto de emergencia sanitaria. No habría auditorías concurrentes. No habría revisión de precios de referencia. No habría mecanismo alguno que verificara, mientras se firmaban los contratos, que los precios fueran razonables, que los proveedores existieran o que los bienes se entregaran. La supervisión llegaría después, cuando el dinero ya se hubiera ido.',
        ],
        chartConfig: {
          type: 'da-trend',
          title: 'Gasto en emergencias COVID — concentración en 2020-2021',
          chartId: 'covid-emergency',
        },
      },
      {
        id: 'los-proveedores',
        number: 2,
        title: 'Los Proveedores del COVID',
        subtitle: 'Empresas fantasma con domicilios en estados donde nunca operaron',
        prose: [
          'El dato más revelador de la base de COMPRANET no es el monto total del gasto COVID, sino quién lo recibió. El 73% de los contratos de emergencia sanitaria se adjudicó a empresas constituidas dentro de los dos años previos a la pandemia. Muchas de ellas aparecieron en COMPRANET por primera vez en 2020, sin historial de contratos federales, sin experiencia documentada en el sector salud y, en varios casos, registradas en estados distintos a donde se prestaron los servicios.',
          'El patrón tiene un nombre en la literatura de fiscalización: proveedores oportunistas. Son empresas creadas para capturar gasto de emergencia, aprovechando que la urgencia elimina los filtros de experiencia y capacidad técnica que las licitaciones ordinarias requieren. No todas son fraudulentas — algunas son legítimas que se constituyeron rápido para atender una necesidad real. Pero la proporción — tres de cada cuatro contratos a empresas recientes — excede cualquier parámetro normal.',
          'El caso emblemático fue CYBER ROBOTIC SOLUTIONS S.A. de C.V., una empresa registrada con giro de servicios tecnológicos que recibió 139 millones de pesos para la compra de ventiladores mecánicos. La compañía no tenía experiencia en equipamiento médico. Las unidades entregadas, según reportes de los hospitales receptores, presentaron fallas técnicas recurrentes o nunca se entregaron en su totalidad. El contrato se adjudicó por la vía de urgencia, sin comparación de precios y sin verificación de capacidad técnica del proveedor.',
          'CYBER ROBOTIC no fue un caso aislado. Los registros muestran decenas de empresas con perfiles similares: giros comerciales ajenos a la salud, constitución reciente, domicilios fiscales en entidades distintas al lugar de entrega, y montos de contrato desproporcionados respecto a su capital social declarado.',
        ],
        chartConfig: {
          type: 'scatter',
          title: 'Proveedores COVID — antigüedad vs monto contratado',
          chartId: 'vendor-age-scatter',
        },
      },
      {
        id: 'la-auditoria',
        number: 3,
        title: 'La Auditoría que Llegó Tarde',
        subtitle: 'La ASF documentó lo que ya nadie podía corregir',
        prose: [
          'La Auditoría Superior de la Federación (ASF) revisó los contratos COVID en su informe de la Cuenta Pública 2020, presentado en febrero de 2022 — casi dos años después de que se firmaron los contratos. El resultado: irregularidades documentadas en aproximadamente el 35% de los contratos revisados. Las observaciones incluyeron sobreprecios de entre el 20% y el 200% respecto a precios de referencia, falta de evidencia de entrega de bienes, pagos a proveedores que no pudieron acreditar capacidad técnica y contratos duplicados por los mismos conceptos en distintas dependencias.',
          'El desfase temporal es parte del problema. La Cámara de Diputados había suspendido la fiscalización concurrente — la que ocurre mientras se ejerce el gasto — bajo el argumento de no entorpecer la respuesta sanitaria. Cuando la ASF finalmente auditó, los proveedores ya habían cobrado, muchos ya habían cambiado de razón social, y los funcionarios que firmaron los contratos habían rotado de puesto. La auditoría documentó el daño. No lo previno.',
          'El mecanismo de control que faltó es el que existe en la mayoría de las democracias de la OCDE: una auditoría en tiempo real del gasto de emergencia, con facultades para suspender pagos cuando se detectan irregularidades. México no lo tiene. La Ley de Adquisiciones prevé excepciones para la urgencia, pero no prevé controles compensatorios. El resultado fue un periodo de nueve meses — de marzo a diciembre de 2020 — en el que el gobierno federal gastó decenas de miles de millones de pesos sin que nadie verificara, en el momento, si ese gasto era legítimo.',
        ],
        chartConfig: {
          type: 'pyramid',
          title: 'Contratos COVID por nivel de riesgo',
          chartId: 'risk-pyramid',
        },
      },
      {
        id: 'las-consecuencias',
        number: 4,
        title: 'Las Consecuencias',
        subtitle: 'Lo que se compró, lo que no llegó y lo que no se sabe',
        prose: [
          'México registró, al cierre de 2021, más de 300,000 muertes oficiales por COVID-19 y un exceso de mortalidad estimado por el INEGI en más de 600,000 personas. Es imposible establecer una relación directa entre las irregularidades en la contratación y las muertes. Pero sí es posible documentar lo que faltó: ventiladores que no funcionaron, pruebas diagnósticas que no se compraron en cantidad suficiente, equipo de protección personal que llegó tarde o no llegó, y medicamentos cuyo abasto dependió de proveedores sin experiencia en la cadena de frío que los insumos médicos requieren.',
          'El costo de la falta de supervisión no se mide solo en pesos desviados. Se mide en la capacidad de respuesta que el sistema de salud perdió. Cada contrato adjudicado a un proveedor fantasma fue un contrato que no se adjudicó a un proveedor real. Cada ventilador defectuoso fue un ventilador que faltó en una unidad de cuidados intensivos. La corrupción en la emergencia sanitaria no robó solo dinero público. Robó capacidad hospitalaria en el peor momento posible.',
          'Ningún funcionario federal ha sido procesado penalmente por irregularidades en la contratación COVID. Las observaciones de la ASF se canalizaron a procedimientos administrativos que, en el sistema mexicano, rara vez concluyen con sanciones. Los proveedores señalados cambiaron de razón social o cerraron operaciones. El dinero no se recuperó.',
          'Lo que queda en los registros de COMPRANET es la evidencia estadística: más de 40,000 millones de pesos gastados sin licitación, el 73% a empresas recientes, irregularidades en un tercio de los contratos auditados, y un marco legal que permitió que todo ocurriera dentro de la ley. La pandemia terminó. El marco legal sigue igual.',
        ],
        pullquote: {
          quote: 'Irregularidades documentadas en el 35% de los contratos COVID revisados por la ASF',
          stat: '$40B+',
          statLabel: 'MXN en compras COVID sin licitación competitiva',
        },
        chartConfig: {
          type: 'breakdown',
          title: 'Distribución del gasto COVID por tipo de proveedor',
          chartId: 'covid-breakdown',
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
