/**
 * /patterns/:code — Individual ARIA Pattern Dossier
 *
 * Shows editorial overview + T1 vendor list + sector heat for one pattern.
 * Sections: §0 Cabecera · §1 Lede · §2 Top Vendors T1 · §3 Sector Heat · §4 Detection Signal
 */
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { networkApi, ariaApi } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { CrossPatternComparison } from '@/components/patterns/CrossPatternComparison'
import { getRiskLevelFromScore, SECTOR_COLORS, SECTORS, PATTERN_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatDualCurrency } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Hardcoded editorial data per pattern
// ---------------------------------------------------------------------------
interface PatternEditorial {
  code: string
  nameEn: string
  nameEs: string
  ledeEn: string
  ledeEs: string
  signalEn: string
  signalEs: string
}

const PATTERN_EDITORIAL: PatternEditorial[] = [
  {
    code: 'P1',
    nameEn: 'Monopoly',
    nameEs: 'Monopolio',
    ledeEn:
      'Market monopolization through procurement occurs when a single vendor systematically captures the majority of contracts in a regulated category over multiple administrations. Unlike legitimate sole-source procurement, monopoly patterns are characterized by high direct-award rates, lack of price competition, and persistent relationships across sexenios—often facilitated by institutional capture at the subministerial level.',
    ledeEs:
      'La monopolización de mercado mediante contrataciones ocurre cuando un único proveedor captura sistemáticamente la mayoría de los contratos en una categoría regulada a lo largo de múltiples administraciones. A diferencia de las contrataciones directas legítimas, los patrones de monopolio se caracterizan por tasas elevadas de adjudicación directa, ausencia de competencia de precios y relaciones persistentes entre sexenios, frecuentemente facilitadas por captura institucional a nivel subministerial.',
    signalEn:
      'ARIA detects monopoly by computing the Herfindahl-Hirschman Index (HHI) per category-institution pair per year. A vendor triggering P1 exceeds HHI 0.60 over a rolling 3-year window with ≥5 contracts and sustained direct-award dominance.',
    signalEs:
      'ARIA detecta el monopolio calculando el Índice Herfindahl-Hirschman (HHI) por par categoría-institución por año. Un proveedor que activa P1 supera HHI 0.60 en una ventana móvil de 3 años con ≥5 contratos y dominancia sostenida en adjudicación directa.',
  },
  {
    code: 'P2',
    nameEn: 'Ghost Company',
    nameEs: 'Empresa Fantasma',
    ledeEn:
      'Ghost companies are entities created specifically to receive public contracts, typically operating for one to three fiscal years before dissolving or going dormant. They often share addresses with other shell companies, possess unverifiable RFC registrations, and exhibit burst patterns—a sudden spike in contract volume followed by complete disappearance from the procurement registry. The SAT EFOS list is the primary external signal, but many ghost vendors are never formally blacklisted.',
    ledeEs:
      'Las empresas fantasma son entidades creadas específicamente para recibir contratos públicos, que generalmente operan entre uno y tres años fiscales antes de disolverse o quedar inactivas. Suelen compartir domicilios con otras empresas fantasma, poseen registros RFC inverificables y exhiben patrones de ráfaga: un aumento repentino en el volumen de contratos seguido de una desaparición completa del registro de contrataciones. La lista EFOS del SAT es la señal externa principal, pero muchos proveedores fantasma nunca son formalmente incluidos en listas negras.',
    signalEn:
      'ARIA flags P2 when a vendor shows a burst-score above 0.7, has fewer than 2 active years in the database, and either appears on the SAT EFOS Definitivo list or has an RFC that fails checksum validation. Ghost confidence is boosted when the vendor shares a legal address with another flagged entity.',
    signalEs:
      'ARIA marca P2 cuando un proveedor tiene una puntuación de ráfaga superior a 0.7, menos de 2 años activos en la base de datos, y aparece en la lista SAT EFOS Definitivo o tiene un RFC que no pasa la validación de suma de verificación. La confianza de fantasma aumenta cuando el proveedor comparte domicilio fiscal con otra entidad marcada.',
  },
  {
    code: 'P3',
    nameEn: 'Intermediary',
    nameEs: 'Intermediario',
    ledeEn:
      'Intermediary firms insert themselves into the procurement chain without delivering substantive value—routing public contracts to subcontractors while capturing a margin. They typically have minimal physical infrastructure, no registered employees, and are incorporated in low-scrutiny states. The intermediary model is especially common in IT services, consulting, and pharmaceutical distribution, where technical complexity provides cover for inflated markups.',
    ledeEs:
      'Las empresas intermediarias se insertan en la cadena de contratación sin aportar valor sustantivo, enrutando contratos públicos hacia subcontratistas mientras capturan un margen. Por lo general, tienen infraestructura física mínima, sin empleados registrados y están constituidas en estados de baja fiscalización. El modelo de intermediario es especialmente común en servicios de TI, consultoría y distribución farmacéutica, donde la complejidad técnica encubre los sobreprecios.',
    signalEn:
      'ARIA identifies P3 vendors by cross-referencing contract volumes with SAT payroll signals and IMSS employee count data. A vendor with >50M MXN in annual contracts and zero verifiable employees scores high on the intermediary signal. Network edges to known subcontractors reinforce the flag.',
    signalEs:
      'ARIA identifica proveedores P3 cruzando volúmenes de contratos con señales de nómina del SAT y datos de empleados del IMSS. Un proveedor con más de 50M MXN en contratos anuales y cero empleados verificables obtiene una puntuación alta en la señal de intermediario. Las conexiones en red con subcontratistas conocidos refuerzan el marcado.',
  },
  {
    code: 'P4',
    nameEn: 'Bid Rigging',
    nameEs: 'Manipulación de Ofertas',
    ledeEn:
      'Bid rigging is cartel behavior where vendors who appear to compete actually coordinate. The same small group submits "competing" bids across many procedures at the same institution, taking turns winning while the others submit cover bids designed to lose. The pattern shows up in COMPRANET as repeated co-bidding partnerships — the same 3-5 vendors appearing on each other\'s losing-bid rosters across dozens of procedures, with a near-deterministic rotation of who wins.',
    ledeEs:
      'La manipulación de ofertas es un comportamiento de cártel en el que proveedores aparentemente competidores en realidad coordinan. El mismo pequeño grupo presenta ofertas "competidoras" en muchos procedimientos de la misma institución, turnándose para ganar mientras los demás presentan ofertas de cobertura diseñadas para perder. El patrón aparece en COMPRANET como asociaciones repetidas de co-licitación: los mismos 3-5 proveedores aparecen en las listas de ofertas perdedoras unos de otros en docenas de procedimientos, con una rotación casi determinista de quién gana.',
    signalEn:
      'ARIA detects P4 from co-bidding statistics. The signal fires when a vendor\'s maximum pairwise co-bid rate (the share of their procedures where the same partner also bid) exceeds a calibrated threshold, indicating a recurring competitive relationship that statistically cannot be coincidence.',
    signalEs:
      'ARIA detecta P4 a partir de estadísticas de co-licitación. La señal se activa cuando la tasa máxima de co-licitación entre pares de un proveedor (la proporción de sus procedimientos en los que el mismo socio también ofertó) supera un umbral calibrado, lo que indica una relación competitiva recurrente que estadísticamente no puede ser coincidencia.',
  },
  {
    code: 'P5',
    nameEn: 'Overpricing',
    nameEs: 'Sobreprecio',
    ledeEn:
      'Overpricing flags vendors whose unit prices are systematically above peer-group baselines for comparable goods or services. Two signals matter: persistent overpricing (the vendor\'s average price-ratio is well above their sector\'s median across many contracts) and spike overpricing (occasional contracts at multiple times the going rate). Both shapes appear in pharma, construction supplies, and IT services — categories where price benchmarking is feasible.',
    ledeEs:
      'El sobreprecio identifica a proveedores cuyos precios unitarios están sistemáticamente por encima de los de su grupo de pares para bienes o servicios comparables. Importan dos señales: el sobreprecio persistente (el ratio de precio promedio del proveedor está muy por encima de la mediana de su sector en muchos contratos) y el sobreprecio puntual (contratos ocasionales a múltiplos de la tarifa vigente). Ambas formas aparecen en farmacéutica, suministros de construcción y servicios de TI: categorías donde el benchmarking de precios es factible.',
    signalEn:
      'ARIA computes z-scored price ratios per vendor against the sector-median benchmark. P5 fires when both the average and the maximum z-price exceed calibrated thresholds — the average catches consistently overpriced vendors, the maximum catches the explanatory single-contract spikes a journalist can use as the lede.',
    signalEs:
      'ARIA calcula ratios de precio normalizados (z-score) por proveedor contra la mediana del sector. P5 se activa cuando tanto el promedio como el máximo z-precio superan umbrales calibrados: el promedio detecta proveedores consistentemente sobrepagados, el máximo detecta los picos de contrato único que un periodista puede usar como gancho.',
  },
  {
    code: 'P6',
    nameEn: 'Institutional Capture',
    nameEs: 'Captura Institucional',
    ledeEn:
      'Institutional capture occurs when a government body\'s procurement function is effectively controlled by a small group of preferred vendors. Captured institutions exhibit extreme vendor concentration, near-total reliance on direct awards, and resistance to competitive procedures even when legally required. Unlike isolated kickback cases, institutional capture persists across multiple administrations and is often embedded in informal staffing networks that outlast political transitions.',
    ledeEs:
      'La captura institucional ocurre cuando la función de contratación de un organismo gubernamental es efectivamente controlada por un pequeño grupo de proveedores preferidos. Las instituciones capturadas exhiben una concentración extrema de proveedores, dependencia casi total de adjudicaciones directas y resistencia a procedimientos competitivos incluso cuando son legalmente requeridos. A diferencia de los casos aislados de soborno, la captura institucional persiste a lo largo de múltiples administraciones y frecuentemente está arraigada en redes informales de personal que sobreviven a las transiciones políticas.',
    signalEn:
      'ARIA flags P6 when a single institution directs ≥70% of its total spend to ≤3 vendors over any 6-year sexenio window. The signal is strengthened when the top vendor holds a direct-award rate above 85% and the institution shows below-median competitive procedure usage for its sector peer group.',
    signalEs:
      'ARIA marca P6 cuando una sola institución dirige ≥70% de su gasto total a ≤3 proveedores en cualquier ventana de 6 años de un sexenio. La señal se fortalece cuando el proveedor principal tiene una tasa de adjudicación directa superior al 85% y la institución muestra un uso de procedimientos competitivos por debajo de la mediana para su grupo de pares sectoriales.',
  },
  {
    code: 'P7',
    nameEn: 'Conflict of Interest',
    nameEs: 'Conflicto de Interés',
    ledeEn:
      'Conflict of interest flags vendors with documented external red flags — appearance on regulatory blacklists (SAT EFOS for tax fraud, SFP sanctions for procurement misconduct), inclusion in journalism-grounded ground-truth corruption cases, or family/political ties to procurement officials. P7 is a placeholder pending Phase 3 of the pipeline (media-evidence integration via CENTINELA WEB), but its current formulation already captures the strongest external signals.',
    ledeEs:
      'El conflicto de interés identifica a proveedores con señales externas documentadas: aparición en listas negras regulatorias (EFOS del SAT por fraude fiscal, sanciones de la SFP por mala conducta en contratación), inclusión en casos de corrupción documentados periodísticamente como ground-truth, o vínculos familiares o políticos con funcionarios de contratación. P7 es un marcador en espera de la Fase 3 del pipeline (integración de evidencia mediática vía CENTINELA WEB), pero su formulación actual ya captura las señales externas más fuertes.',
    signalEn:
      'ARIA fires P7 when a vendor matches any external watchlist (SAT EFOS Definitivo, SFP sanction registry) or appears in the curated ground-truth corruption case library. The flag is binary in its current form; Phase 3 will fold in graded media-evidence scores from CENTINELA WEB.',
    signalEs:
      'ARIA activa P7 cuando un proveedor aparece en alguna lista externa (SAT EFOS Definitivo, registro de sanciones SFP) o figura en la biblioteca curada de casos de corrupción ground-truth. La marca es binaria en su forma actual; la Fase 3 incorporará puntajes graduados de evidencia mediática de CENTINELA WEB.',
  },
]

const META_BY_CODE = PATTERN_EDITORIAL.reduce<Record<string, PatternEditorial>>(
  (acc, m) => { acc[m.code] = m; return acc },
  {}
)

// ---------------------------------------------------------------------------
// Investigative hooks — migrated from the retired /patterns index (2026-06-07).
// P1/P2/P3/P6 copied verbatim; P4/P5/P7 REWRITTEN to match canonical ARIA
// definitions (the index page had them mislabeled as Kickback/Rotation/Dump).
// ---------------------------------------------------------------------------
const PATTERN_HOOKS: Record<string, { en: string; es: string }> = {
  P1: {
    en: 'Cross-reference with direct-award procedure codes. If the same institution–vendor pair appears across 10+ years, run a co-bidding network analysis to find who else is in the ring.',
    es: 'Crucen con códigos de adjudicación directa. Si el mismo par institución-proveedor aparece en 10+ años, ejecuten análisis de co-licitación para encontrar quién más está en el anillo.',
  },
  P2: {
    en: 'Verify RFC registration date in SAT vs. first contract date. A company winning contracts before its RFC is formally registered is an automatic T1 lead.',
    es: 'Verifiquen la fecha de registro RFC en el SAT vs. el primer contrato. Una empresa que gana contratos antes de registrar su RFC es un lead T1 automático.',
  },
  P3: {
    en: 'Look for cascade contracts: company A wins a large procedure, then company B — registered weeks later at the same address — wins identical procedures the following year.',
    es: 'Busquen contratos en cascada: empresa A gana un procedimiento grande, luego empresa B — registrada semanas después en la misma dirección — gana procedimientos idénticos el año siguiente.',
  },
  P4: {
    en: 'Map the co-bidding graph. When the same 3–5 vendors appear on each other’s losing-bid rosters across dozens of procedures at one institution — and the winner rotates almost deterministically — you have a cartel, not competition. Filter the ARIA queue by P4 and open the Network view on the top co-bidder.',
    es: 'Mapeen el grafo de co-licitación. Cuando los mismos 3–5 proveedores aparecen en las listas de ofertas perdedoras unos de otros en docenas de procedimientos de una institución — y el ganador rota de forma casi determinista — hay un cártel, no competencia. Filtren la cola ARIA por P4 y abran la vista de Red sobre el principal co-licitante.',
  },
  P5: {
    en: 'Compare unit prices against the sector-median benchmark. Two shapes matter: persistent overpricing (average price-ratio well above the sector median across many contracts) and spike overpricing (occasional contracts at multiples of the going rate — the single-contract lede a journalist can use). Pharma, construction supplies and IT services are where benchmarking is feasible.',
    es: 'Comparen los precios unitarios contra la mediana del sector. Importan dos formas: el sobreprecio persistente (ratio de precio promedio muy por encima de la mediana sectorial en muchos contratos) y el sobreprecio puntual (contratos ocasionales a múltiplos de la tarifa vigente — el gancho de un solo contrato que un periodista puede usar). Farmacéutica, suministros de construcción y TI son donde el benchmarking es factible.',
  },
  P6: {
    en: 'Open the vendor dossier’s network view on the top vendor for each captured institution. Capture typically begins with a single direct award that becomes the de-facto preferred vendor for all subsequent competitive procedures.',
    es: 'Abran la vista de red del expediente del proveedor principal de cada institución capturada. La captura típicamente comienza con una adjudicación directa que se convierte en el proveedor preferido de facto para todos los procedimientos competitivos posteriores.',
  },
  P7: {
    en: 'Cross-reference the vendor against external registries: SAT EFOS (tax-fraud blacklist), SFP sanction records, and the curated ground-truth case library. A match on any of these is documented external evidence — the strongest signal in the model. Then check for family or political ties between the vendor’s officers and the contracting institution’s procurement staff.',
    es: 'Crucen al proveedor con registros externos: EFOS del SAT (lista negra por fraude fiscal), sanciones de la SFP y la biblioteca curada de casos ground-truth. Una coincidencia en cualquiera de ellos es evidencia externa documentada — la señal más fuerte del modelo. Luego revisen vínculos familiares o políticos entre los directivos del proveedor y el personal de contratación de la institución.',
  },
}

// ---------------------------------------------------------------------------
// § · CÓMO INVESTIGAR — editorial intro, one per pattern.
// Documented in the charter (§V: "promised § Cómo investigar absent") but never
// shipped. Static bilingual copy keyed off PATTERN_EDITORIAL P1–P7: (1) what the
// pattern is in one line, (2) what a journalist checks FIRST, (3) what counts as
// corroboration. Folio voice — factual, no hype. ARIA output is a model SIGNAL,
// never proven corruption; risk language is "indicador de riesgo".
// ---------------------------------------------------------------------------
interface InvestigateGuide {
  what: { en: string; es: string }
  first: { en: string; es: string }
  corroborate: { en: string; es: string }
}

const PATTERN_INVESTIGATE: Record<string, InvestigateGuide> = {
  P1: {
    what: {
      en: 'A single vendor holding the majority of one category at one institution year after year. The signal is concentration that persists across sexenios, not a one-off sole-source buy.',
      es: 'Un único proveedor que concentra la mayoría de una categoría en una institución año tras año. La señal es una concentración que persiste entre sexenios, no una compra de fuente única aislada.',
    },
    first: {
      en: 'Pull the institution–category pair and chart the vendor’s share by year. Then check the procedure type: legitimate dominance can survive open tenders; capture rarely does.',
      es: 'Extraigan el par institución-categoría y grafiquen la participación del proveedor por año. Luego revisen el tipo de procedimiento: la dominancia legítima sobrevive a licitaciones abiertas; la captura rara vez.',
    },
    corroborate: {
      en: 'A near-total direct-award rate, the absence of any losing bidder across years, or a competitor that exits the category the moment this vendor enters all corroborate. None of these alone proves wrongdoing — they narrow where to look.',
      es: 'Una tasa de adjudicación directa casi total, la ausencia de cualquier oferente perdedor a lo largo de los años, o un competidor que abandona la categoría justo cuando entra este proveedor son corroboraciones. Ninguna por sí sola prueba un delito — acotan dónde mirar.',
    },
  },
  P2: {
    what: {
      en: 'An entity that appears, wins a burst of contracts within one to three fiscal years, and then vanishes from the registry. Shared addresses and unverifiable RFCs are common tells.',
      es: 'Una entidad que aparece, gana una ráfaga de contratos en uno a tres años fiscales y luego desaparece del registro. Domicilios compartidos y RFC inverificables son indicios frecuentes.',
    },
    first: {
      en: 'Compare the vendor’s SAT RFC registration date against its first contract date. A firm winning public money before it formally exists is the cleanest lead available.',
      es: 'Comparen la fecha de registro del RFC en el SAT contra la fecha del primer contrato. Una empresa que gana dinero público antes de existir formalmente es el lead más limpio disponible.',
    },
    corroborate: {
      en: 'Appearance on the SAT EFOS Definitivo list, an RFC that fails checksum validation, or a legal address shared with another flagged entity each raise confidence. EFOS is documented external evidence; the burst shape alone is only a model signal.',
      es: 'La aparición en la lista EFOS Definitivo del SAT, un RFC que no pasa la validación de suma de verificación, o un domicilio fiscal compartido con otra entidad marcada elevan la confianza. EFOS es evidencia externa documentada; la forma de ráfaga por sí sola es solo una señal del modelo.',
    },
  },
  P3: {
    what: {
      en: 'A firm that sits in the procurement chain without delivering substantive value — routing the contract to a subcontractor while keeping a margin. Minimal infrastructure, no payroll, low-scrutiny state of incorporation.',
      es: 'Una empresa que se sitúa en la cadena de contratación sin aportar valor sustantivo — enruta el contrato a un subcontratista y conserva un margen. Infraestructura mínima, sin nómina, constituida en un estado de baja fiscalización.',
    },
    first: {
      en: 'Cross the vendor’s annual contract volume against its IMSS-registered employee count. A firm with tens of millions in contracts and no verifiable workforce cannot deliver what it was paid for.',
      es: 'Crucen el volumen anual de contratos del proveedor contra su número de empleados registrados en el IMSS. Una empresa con decenas de millones en contratos y sin fuerza laboral verificable no puede entregar lo que se le pagó.',
    },
    corroborate: {
      en: 'Network edges to known subcontractors, identical scopes resold downstream at a markup, or a cascade where a sister firm wins the same procedure the following year corroborate the intermediary read.',
      es: 'Conexiones de red con subcontratistas conocidos, alcances idénticos revendidos aguas abajo con sobreprecio, o una cascada en la que una empresa hermana gana el mismo procedimiento el año siguiente corroboran la lectura de intermediario.',
    },
  },
  P4: {
    what: {
      en: 'Vendors who appear to compete but coordinate — the same small group takes turns winning while the others file cover bids designed to lose. It reads as competition in COMPRANET but isn’t.',
      es: 'Proveedores que aparentan competir pero coordinan — el mismo pequeño grupo se turna para ganar mientras los demás presentan ofertas de cobertura diseñadas para perder. En COMPRANET parece competencia, pero no lo es.',
    },
    first: {
      en: 'Map the co-bidding graph for the vendor’s institution. Look for the same three to five firms recurring on each other’s losing-bid rosters across dozens of procedures.',
      es: 'Mapeen el grafo de co-licitación de la institución del proveedor. Busquen las mismas tres a cinco empresas que se repiten en las listas de ofertas perdedoras unas de otras en docenas de procedimientos.',
    },
    corroborate: {
      en: 'A near-deterministic rotation of who wins, bid margins that cluster suspiciously tight, or losing bids that exceed the budget cap turn a statistical pattern into a documentable rigging case. The co-bid rate alone is a model signal.',
      es: 'Una rotación casi determinista de quién gana, márgenes de oferta sospechosamente ajustados, u ofertas perdedoras que exceden el techo presupuestal convierten un patrón estadístico en un caso de manipulación documentable. La tasa de co-licitación por sí sola es una señal del modelo.',
    },
  },
  P5: {
    what: {
      en: 'A vendor whose unit prices sit systematically above the peer-group baseline for comparable goods. Two shapes matter: persistent overpricing across many contracts, and occasional spikes at multiples of the going rate.',
      es: 'Un proveedor cuyos precios unitarios se ubican sistemáticamente por encima de la línea base de su grupo de pares para bienes comparables. Importan dos formas: el sobreprecio persistente en muchos contratos y los picos ocasionales a múltiplos de la tarifa vigente.',
    },
    first: {
      en: 'Benchmark the vendor’s unit price against the sector-median for the same partida. Isolate the single highest-multiple contract first — that spike is the lede a reader can grasp in one sentence.',
      es: 'Comparen el precio unitario del proveedor contra la mediana del sector para la misma partida. Aíslen primero el contrato de mayor múltiplo — ese pico es el gancho que un lector entiende en una frase.',
    },
    corroborate: {
      en: 'A matching catalog reference price, an identical good bought cheaper by a peer institution the same year, or a markup that tracks an intermediary in the chain corroborate overpricing. Price benchmarking is feasible in pharma, construction supplies and IT.',
      es: 'Un precio de referencia de catálogo coincidente, un bien idéntico comprado más barato por una institución par el mismo año, o un sobreprecio que sigue a un intermediario en la cadena corroboran el sobreprecio. El benchmarking de precios es factible en farmacéutica, suministros de construcción y TI.',
    },
  },
  P6: {
    what: {
      en: 'An institution whose procurement function is effectively run by a handful of preferred vendors — extreme concentration, near-total reliance on direct awards, and resistance to competition even where the law requires it.',
      es: 'Una institución cuya función de contratación es manejada en la práctica por un puñado de proveedores preferidos — concentración extrema, dependencia casi total de adjudicaciones directas y resistencia a la competencia incluso donde la ley la exige.',
    },
    first: {
      en: 'Open the network view on the institution’s top vendor and trace the relationship back to its origin. Capture typically begins with one direct award that becomes the de-facto preferred vendor for everything after.',
      es: 'Abran la vista de red sobre el proveedor principal de la institución y rastreen la relación hasta su origen. La captura suele comenzar con una adjudicación directa que se convierte en el proveedor preferido de facto para todo lo que sigue.',
    },
    corroborate: {
      en: 'Persistence across an administration change, top-vendor direct-award rates above 85%, or competitive-procedure usage below the institution’s sector peers all reinforce the capture read. None alone is proof of corruption.',
      es: 'La persistencia a través de un cambio de administración, tasas de adjudicación directa del proveedor principal superiores al 85%, o un uso de procedimientos competitivos por debajo de los pares sectoriales de la institución refuerzan la lectura de captura. Ninguna por sí sola es prueba de corrupción.',
    },
  },
  P7: {
    what: {
      en: 'A vendor carrying documented external red flags — appearance on a regulatory blacklist, inclusion in a journalism-grounded corruption case, or ties to procurement officials. P7 surfaces the strongest external evidence the model can reach.',
      es: 'Un proveedor que arrastra señales externas documentadas — aparición en una lista negra regulatoria, inclusión en un caso de corrupción documentado periodísticamente, o vínculos con funcionarios de contratación. P7 expone la evidencia externa más fuerte que el modelo puede alcanzar.',
    },
    first: {
      en: 'Check the vendor against the external registries directly: SAT EFOS for tax fraud, the SFP sanction registry for procurement misconduct, and the curated ground-truth case library. A match on any is documented evidence, not a model inference.',
      es: 'Verifiquen al proveedor directamente contra los registros externos: EFOS del SAT por fraude fiscal, el registro de sanciones de la SFP por mala conducta en contratación, y la biblioteca curada de casos ground-truth. Una coincidencia en cualquiera es evidencia documentada, no una inferencia del modelo.',
    },
    corroborate: {
      en: 'Beyond the registry hit, look for family or political ties between the vendor’s officers and the contracting institution’s staff, and for the same RFC recurring across other flagged patterns. P7 is binary today; CENTINELA WEB will fold in graded media evidence in Phase 3.',
      es: 'Más allá de la coincidencia en el registro, busquen vínculos familiares o políticos entre los directivos del proveedor y el personal de la institución contratante, y el mismo RFC recurrente en otros patrones marcados. P7 es binario hoy; CENTINELA WEB incorporará evidencia mediática graduada en la Fase 3.',
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a sector display name to a SECTOR_COLORS slug key */
function sectorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Group spotlight top_vendors by sector — top 5 by vendor count */
function buildSectorBreakdown(
  vendors: Array<{ primary_sector_name: string | null }>
): Array<{ name: string; count: number; color: string }> {
  const freq: Record<string, number> = {}
  for (const v of vendors) {
    if (v.primary_sector_name) {
      freq[v.primary_sector_name] = (freq[v.primary_sector_name] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .map(([name, count]) => ({
      name,
      count,
      color: SECTOR_COLORS[sectorSlug(name)] ?? SECTOR_COLORS.otros,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

/**
 * Resolve a sector DISPLAY name (e.g. "Salud", "Health", "Tecnología") to its
 * canonical SECTORS entry, so the coda can route a sector chip by numeric id.
 * Matches the normalized slug against the sector code, ES name and EN name.
 */
function resolveSector(displayName: string): (typeof SECTORS)[number] | undefined {
  const slug = sectorSlug(displayName)
  return SECTORS.find(
    (s) =>
      s.code === slug ||
      sectorSlug(s.name) === slug ||
      sectorSlug(s.nameEN) === slug
  )
}

/** Pattern code -> /cases?type=... mapping */
const CASE_TYPE_BY_PATTERN: Record<string, string> = {
  P1: 'monopoly',
  P2: 'ghost_company',
  P3: 'intermediary',
  P4: 'bid_rigging',
  P5: 'overpricing',
  P6: 'institutional_capture',
  P7: 'procurement_fraud',
}

// ---------------------------------------------------------------------------
// Section kicker component
// ---------------------------------------------------------------------------
function SectionKicker({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
      {label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PatternDossier() {
  const { code } = useParams<{ code: string }>()
  const { i18n } = useTranslation('nav')
  const isEs = i18n.language === 'es'

  const meta = code ? META_BY_CODE[code.toUpperCase()] : undefined

  // Spotlight data (all patterns — we'll filter)
  const { data: spotlightData, isLoading: loadingSpotlight } = useQuery({
    queryKey: ['pattern-spotlight'],
    queryFn: () => networkApi.getPatternSpotlight(),
    staleTime: 5 * 60 * 1000,
  })

  // ARIA queue filtered by this pattern
  const { data: queueData, isLoading: loadingQueue } = useQuery({
    queryKey: ['aria-queue-pattern', code],
    queryFn: () => ariaApi.getQueue({ pattern: code, per_page: 20 }),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  })

  const spotlight = spotlightData?.patterns.find(
    (p) => p.code === code?.toUpperCase()
  )

  const vendors = queueData?.data ?? []

  // Sector breakdown from PatternSpotlight.top_vendors (top 5)
  const sectorBreakdown = spotlight ? buildSectorBreakdown(spotlight.top_vendors) : []
  const maxBreakdownCount = sectorBreakdown[0]?.count ?? 1

  const isLoading = loadingSpotlight || loadingQueue

  // Unknown pattern
  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/atlas"
          className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          {isEs ? '← El Atlas · lente Patrones' : '← The Atlas · Patterns lens'}
        </Link>
        <p className="mt-4 text-sm text-text-secondary font-mono">
          {isEs ? `Patrón "${code}" no encontrado.` : `Pattern "${code}" not found.`}
        </p>
      </div>
    )
  }

  const name = isEs ? meta.nameEs : meta.nameEn
  const lede = isEs ? meta.ledeEs : meta.ledeEn
  const signal = isEs ? meta.signalEs : meta.signalEn

  const codeUpper = code?.toUpperCase() ?? ''
  const caseType = CASE_TYPE_BY_PATTERN[codeUpper]
  const patternColor = PATTERN_COLORS[codeUpper] ?? 'var(--color-risk-critical)'
  const hook = PATTERN_HOOKS[codeUpper]
    ? (isEs ? PATTERN_HOOKS[codeUpper].es : PATTERN_HOOKS[codeUpper].en)
    : null

  // Universe totals across all 7 patterns — reuses the already-fetched
  // pattern-spotlight query (zero new API calls). Powers the § Los Siete
  // Patrones footer strip migrated from the retired /patterns index.
  const allPatterns = spotlightData?.patterns ?? []
  const universe = {
    vendors: allPatterns.reduce((s, p) => s + (p.vendor_count ?? 0), 0),
    t1: allPatterns.reduce((s, p) => s + (p.t1_count ?? 0), 0),
    gt: allPatterns.reduce((s, p) => s + (p.gt_case_count ?? 0), 0),
    value: allPatterns.reduce((s, p) => s + (p.total_value_mxn ?? 0), 0),
  }

  // A0 spine — P1→P7 sibling stepper. The seven siblings are enumerable from
  // the PATTERN_EDITORIAL metadata; wrap-around so P7 → P1 and P1 ← P7.
  const siblingIndex = PATTERN_EDITORIAL.findIndex((m) => m.code === codeUpper)
  const siblingCount = PATTERN_EDITORIAL.length
  const prevMeta =
    siblingIndex >= 0
      ? PATTERN_EDITORIAL[(siblingIndex - 1 + siblingCount) % siblingCount]
      : undefined
  const nextMeta =
    siblingIndex >= 0
      ? PATTERN_EDITORIAL[(siblingIndex + 1) % siblingCount]
      : undefined

  // § · CÓMO INVESTIGAR — editorial intro for this pattern.
  const guide = PATTERN_INVESTIGATE[codeUpper]

  // § · ADÓNDE IR coda — exit ramps drawn from already-fetched data only.
  // Top vendors from the ARIA queue (deduped, max 4) + dominant sector chip.
  const codaVendors = vendors.slice(0, 4)
  const dominantSector =
    sectorBreakdown.length > 0 ? resolveSector(sectorBreakdown[0].name) : undefined

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* A0 · Spine — up-link to the Atlas patterns lens (pinned to this
          pattern) + P1→P7 sibling stepper. WayfindingSpine lives on another
          branch; this is hand-composed per charter §III.3 / A0, NOT a new
          shared component. */}
      <nav
        aria-label={isEs ? 'Navegación entre patrones' : 'Pattern navigation'}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3"
      >
        {/* Up-link to El Atlas, patterns lens pinned to this cluster */}
        <Link
          to={`/atlas?lens=patterns&pin=${codeUpper}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          <span aria-hidden="true">←</span>
          {isEs ? 'El Atlas · lente Patrones' : 'The Atlas · Patterns lens'}
        </Link>

        {/* Prev / position / next sibling stepper */}
        {siblingIndex >= 0 && prevMeta && nextMeta && (
          <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
            <Link
              to={`/patterns/${prevMeta.code}`}
              title={isEs
                ? `Patrón anterior · ${prevMeta.code} ${prevMeta.nameEs}`
                : `Previous pattern · ${prevMeta.code} ${prevMeta.nameEn}`}
              aria-label={isEs
                ? `Patrón anterior: ${prevMeta.code} ${prevMeta.nameEs}`
                : `Previous pattern: ${prevMeta.code} ${prevMeta.nameEn}`}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-text-muted hover:text-text-secondary hover:bg-background-elevated/60 transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span className="font-bold tabular-nums">{prevMeta.code}</span>
            </Link>
            <span className="text-text-muted/60 tabular-nums px-1" aria-hidden="true">
              {siblingIndex + 1} {isEs ? 'de' : 'of'} {siblingCount}
            </span>
            <Link
              to={`/patterns/${nextMeta.code}`}
              title={isEs
                ? `Siguiente patrón · ${nextMeta.code} ${nextMeta.nameEs}`
                : `Next pattern · ${nextMeta.code} ${nextMeta.nameEn}`}
              aria-label={isEs
                ? `Siguiente patrón: ${nextMeta.code} ${nextMeta.nameEs}`
                : `Next pattern: ${nextMeta.code} ${nextMeta.nameEn}`}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-text-muted hover:text-text-secondary hover:bg-background-elevated/60 transition-colors"
            >
              <span className="font-bold tabular-nums">{nextMeta.code}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </nav>

      {/* §0 Cabecera */}
      <section aria-labelledby="pattern-heading">
        <SectionKicker label={isEs ? '§ 0 · CABECERA' : '§ 0 · HEADER'} />
        <div className="flex items-start gap-3">
          <span
            className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-2.5 py-1 text-sm font-bold font-mono tracking-wider"
            style={{ backgroundColor: `${patternColor}1f`, color: patternColor }}
            aria-label={`Pattern code ${code}`}
          >
            {codeUpper}
          </span>
          <div className="flex-1 min-w-0">
            <h1
              id="pattern-heading"
              className="text-2xl font-bold text-text-primary leading-tight"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {name}
            </h1>

            {/* Investigate CTA */}
            <Link
              to={`/aria?pattern=${codeUpper}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.1em] transition-colors hover:opacity-80"
              style={{
                backgroundColor: `${patternColor}1f`,
                color: patternColor,
                border: `1px solid ${patternColor}40`,
              }}
            >
              <span aria-hidden="true">→</span>
              {isEs
                ? `Abrir Cola ARIA filtrada por ${codeUpper}`
                : `Open ARIA Queue filtered by ${codeUpper}`}
            </Link>
            {/* Stats grid */}
            {spotlight && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {[
                  { label: isEs ? 'Proveedores' : 'Vendors', value: spotlight.vendor_count.toLocaleString(), color: undefined },
                  { label: 'T1', value: spotlight.t1_count.toLocaleString(), color: 'var(--color-risk-critical)' },
                  { label: 'T2', value: spotlight.t2_count.toLocaleString(), color: undefined },
                  { label: isEs ? 'Casos GT' : 'GT Cases', value: spotlight.gt_case_count.toLocaleString(), color: undefined },
                  ...(spotlight.avg_da_rate != null ? [{ label: 'DA%', value: `${Math.round(spotlight.avg_da_rate * 100)}%`, color: spotlight.avg_da_rate > 0.5 ? '#ef4444' : undefined }] : []),
                  ...(spotlight.avg_sb_rate != null ? [{ label: isEs ? 'Prop. Única' : 'Single Bid', value: `${Math.round(spotlight.avg_sb_rate * 100)}%`, color: spotlight.avg_sb_rate > 0.3 ? '#f59e0b' : undefined }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-sm border border-border/60 bg-background-card px-2 py-1.5">
                    <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted/60">{label}</div>
                    <div className="text-sm font-mono font-bold tabular-nums mt-0.5" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
                  </div>
                ))}
                {spotlight.total_value_mxn != null && spotlight.total_value_mxn > 0 && (
                  <div className="rounded-sm border border-border/60 bg-background-card px-2 py-1.5 col-span-2 sm:col-span-1">
                    <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted/60">{isEs ? 'Gasto total' : 'Total spend'}</div>
                    <div className="text-sm font-mono font-bold tabular-nums mt-0.5" style={{ color: 'var(--color-risk-critical)' }}>{formatDualCurrency(spotlight.total_value_mxn)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* §1 Lede */}
      <section aria-label={isEs ? 'Descripción del patrón' : 'Pattern description'}>
        <SectionKicker label="§ 1 · LEDE" />
        <p className="text-sm text-text-secondary leading-relaxed">{lede}</p>
      </section>

      {/* § · CÓMO INVESTIGAR — editorial intro: what this is, what to check
          first, what counts as corroboration. Static, keyed off the pattern. */}
      {guide && (
        <section aria-label={isEs ? 'Cómo investigar este patrón' : 'How to investigate this pattern'}>
          <SectionKicker label={isEs ? '§ · CÓMO INVESTIGAR' : '§ · HOW TO INVESTIGATE'} />
          <div
            className="rounded-sm px-4 py-4 space-y-3.5"
            style={{
              backgroundColor: `${patternColor}0a`,
              borderLeft: `2px solid ${patternColor}55`,
            }}
          >
            {[
              {
                k: isEs ? 'QUÉ ES' : 'WHAT IT IS',
                t: isEs ? guide.what.es : guide.what.en,
              },
              {
                k: isEs ? 'QUÉ REVISAR PRIMERO' : 'WHAT TO CHECK FIRST',
                t: isEs ? guide.first.es : guide.first.en,
              },
              {
                k: isEs ? 'QUÉ CUENTA COMO CORROBORACIÓN' : 'WHAT COUNTS AS CORROBORATION',
                t: isEs ? guide.corroborate.es : guide.corroborate.en,
              },
            ].map(({ k, t }) => (
              <div key={k}>
                <div
                  className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] mb-1"
                  style={{ color: patternColor }}
                >
                  {k}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{t}</p>
              </div>
            ))}
            <p className="text-[10px] font-mono text-text-muted/70 leading-relaxed pt-1">
              {isEs
                ? 'La marca ARIA es un indicador de riesgo del modelo, no una corrupción probada. Estas rutas acotan dónde mirar; la evidencia documentada la aporta el reportaje.'
                : 'An ARIA flag is a model risk indicator, not proven corruption. These routes narrow where to look; documented evidence comes from the reporting.'}
            </p>
          </div>
        </section>
      )}

      {/* §2 Top Vendors T1 */}
      <section aria-label={isEs ? 'Proveedores T1' : 'T1 Vendors'}>
        <SectionKicker label={isEs ? '§ 2 · PROVEEDORES T1' : '§ 2 · T1 VENDORS'} />

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-sm bg-sidebar animate-pulse border border-border"
              />
            ))}
          </div>
        )}

        {!isLoading && vendors.length === 0 && (
          <p className="text-sm text-text-muted font-mono">
            {isEs ? 'Sin proveedores T1 para este patrón.' : 'No T1 vendors for this pattern.'}
          </p>
        )}

        {!isLoading && vendors.length > 0 && (
          <div className="space-y-3">
            {vendors.slice(0, 20).map((v) => {
              const riskLevel = getRiskLevelFromScore(v.avg_risk_score)
              return (
                <div
                  key={v.vendor_id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-b-0"
                >
                  {/* IPS bar */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <DotBar
                      value={v.ips_final}
                      max={1}
                      color="var(--color-risk-critical)"
                      dots={14}
                      ariaLabel={`IPS ${(v.ips_final * 100).toFixed(0)}%`}
                    />
                    <span className="text-[10px] font-mono tabular-nums text-text-muted">
                      {(v.ips_final).toFixed(3)}
                    </span>
                  </div>

                  {/* Chip */}
                  <div className="flex-1 min-w-0">
                    <EntityIdentityChip
                      type="vendor"
                      id={v.vendor_id}
                      name={v.vendor_name}
                      size="sm"
                      riskScore={v.avg_risk_score}
                      sectorCode={v.primary_sector_name ?? null}
                      ariaTier={v.ips_tier}
                    />
                    {v.total_value_mxn > 0 && (
                      <div className="text-[10px] font-mono text-text-muted tabular-nums mt-0.5">
                        {formatCompactMXN(v.total_value_mxn)} · {v.total_contracts} {isEs ? 'contratos' : 'contracts'}
                      </div>
                    )}
                  </div>

                  {/* Risk level badge */}
                  <span
                    className={`flex-shrink-0 text-[10px] font-mono font-bold uppercase tracking-wide ${
                      riskLevel === 'critical'
                        ? 'text-risk-critical'
                        : riskLevel === 'high'
                        ? 'text-risk-high'
                        : riskLevel === 'medium'
                        ? 'text-risk-medium'
                        : 'text-text-muted'
                    }`}
                  >
                    {riskLevel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* §3 Network Signature + Sector Breakdown */}
      <section aria-label={isEs ? 'Firma de red' : 'Network signature'}>
        <SectionKicker
          label={isEs ? '§ 3 · FIRMA DE RED' : '§ 3 · NETWORK SIGNATURE'}
        />
        <div className="space-y-5">
          {/* Rates — shown when spotlight has real data */}
          {spotlight && (spotlight.avg_da_rate != null || spotlight.avg_sb_rate != null) && (
            <div className="rounded-sm border border-border/60 bg-background-card p-4">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-3">
                {isEs ? 'Tasas promedio · vendedores en este patrón' : 'Average rates · vendors in this pattern'}
              </div>
              <div className="space-y-2">
                {spotlight.avg_da_rate != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-text-muted/70 w-36 flex-shrink-0">
                      {isEs ? 'Adjudicación Directa' : 'Direct Award'}
                    </span>
                    <div className="flex-1 relative">
                      <DotBar
                        value={spotlight.avg_da_rate}
                        max={1}
                        color={spotlight.avg_da_rate > 0.5 ? '#ef4444' : '#f59e0b'}
                        dots={22}
                        ariaLabel={`DA rate ${Math.round(spotlight.avg_da_rate * 100)}%`}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold tabular-nums w-10 text-right"
                      style={{ color: spotlight.avg_da_rate > 0.5 ? '#ef4444' : 'var(--color-text-primary)' }}>
                      {Math.round(spotlight.avg_da_rate * 100)}%
                    </span>
                  </div>
                )}
                {spotlight.avg_sb_rate != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-text-muted/70 w-36 flex-shrink-0">
                      {isEs ? 'Propuesta Única' : 'Single Bid'}
                    </span>
                    <div className="flex-1 relative">
                      <DotBar
                        value={spotlight.avg_sb_rate}
                        max={1}
                        color={spotlight.avg_sb_rate > 0.3 ? '#f59e0b' : '#71717a'}
                        dots={22}
                        ariaLabel={`Single bid rate ${Math.round(spotlight.avg_sb_rate * 100)}%`}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold tabular-nums w-10 text-right"
                      style={{ color: spotlight.avg_sb_rate > 0.3 ? '#f59e0b' : 'var(--color-text-primary)' }}>
                      {Math.round(spotlight.avg_sb_rate * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Sector breakdown */}
          {sectorBreakdown.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-2">
                {isEs
                  ? `Sectores · ${spotlight?.top_vendors.length ?? 0} proveedores destacados`
                  : `Sectors · ${spotlight?.top_vendors.length ?? 0} highlighted vendors`}
              </div>
              <div className="space-y-1.5">
                {sectorBreakdown.map(({ name: sectorName, count, color }) => (
                  <div key={sectorName} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-text-secondary w-32 flex-shrink-0 truncate">
                      {sectorName}
                    </span>
                    <DotBar
                      value={count}
                      max={maxBreakdownCount}
                      color={color}
                      dots={18}
                      ariaLabel={`${sectorName}: ${count} vendors`}
                    />
                    <span className="text-[10px] font-mono tabular-nums text-text-muted flex-shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* §4 Detection Signal */}
      <section aria-label={isEs ? 'Señal de detección' : 'Detection signal'}>
        <SectionKicker label={isEs ? '§ 4 · SEÑAL DE DETECCIÓN' : '§ 4 · DETECTION SIGNAL'} />
        <p className="text-sm text-text-secondary leading-relaxed">{signal}</p>
      </section>

      {/* §5 How to investigate — migrated from the retired /patterns index */}
      {hook && (
        <section aria-label={isEs ? 'Cómo investigar' : 'How to investigate'}>
          <SectionKicker label={isEs ? '§ 5 · CÓMO INVESTIGAR' : '§ 5 · HOW TO INVESTIGATE'} />
          <div
            className="rounded-sm px-4 py-3.5"
            style={{
              backgroundColor: `${patternColor}0d`,
              borderLeft: `2px solid ${patternColor}60`,
            }}
          >
            <p
              className="text-sm italic text-text-secondary leading-relaxed"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {hook}
            </p>
          </div>
        </section>
      )}

      {/* §5 GT Cases Callout */}
      {spotlight && spotlight.gt_case_count > 0 && caseType && (
        <section
          aria-label={isEs ? 'Casos documentados' : 'Documented cases'}
          className="rounded-sm border-l-2 pl-4 py-3"
          style={{
            borderLeftColor: '#dc2626',
            backgroundColor: 'rgba(220,38,38,0.04)',
          }}
        >
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5">
            {isEs ? 'CORPUS RUBLI' : 'RUBLI CORPUS'}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-2">
            {isEs ? (
              <>
                <span
                  className="font-mono font-bold tabular-nums"
                  style={{ color: 'var(--color-risk-critical)' }}
                >
                  {spotlight.gt_case_count.toLocaleString()}
                </span>{' '}
                casos documentados coinciden con la tipología{' '}
                <span className="text-text-primary">{name}</span>.
              </>
            ) : (
              <>
                <span
                  className="font-mono font-bold tabular-nums"
                  style={{ color: 'var(--color-risk-critical)' }}
                >
                  {spotlight.gt_case_count.toLocaleString()}
                </span>{' '}
                documented cases match the{' '}
                <span className="text-text-primary">{name}</span> typology.
              </>
            )}
          </p>
          <Link
            to={`/cases?type=${caseType}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.1em] transition-colors hover:opacity-80"
            style={{ color: 'var(--color-risk-critical)' }}
          >
            <span aria-hidden="true">→</span>
            {isEs ? 'Ver casos de corrupción' : 'View corruption cases'}
          </Link>
        </section>
      )}

      {/* § · ADÓNDE IR — coda / exit ramps. Investigate CTA + entity chips drawn
          from already-fetched data (top T1 vendors + dominant sector). No new
          API calls. Charter §II Codas / invariant #13. */}
      {(codaVendors.length > 0 || dominantSector) && (
        <section
          aria-label={isEs ? 'Adónde ir' : 'Where to go next'}
          className="pt-6 border-t border-border"
        >
          <SectionKicker label={isEs ? '§ · ADÓNDE IR' : '§ · WHERE TO GO NEXT'} />

          {/* Investigate CTA — amber, mono, uppercase */}
          <Link
            to={`/aria?pattern=${codeUpper}`}
            className="mt-1 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.1em] transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'rgba(245,158,11,0.10)',
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.30)',
            }}
            aria-label={isEs
              ? `Investigar en la Cola ARIA, filtrada por ${codeUpper}`
              : `Investigate in the ARIA Queue, filtered by ${codeUpper}`}
          >
            <span aria-hidden="true">→</span>
            {isEs
              ? `Investigar ${codeUpper} en la Cola ARIA`
              : `Investigate ${codeUpper} in the ARIA Queue`}
          </Link>

          {/* Top T1 vendors flagged for this pattern */}
          {codaVendors.length > 0 && (
            <div className="mt-4">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-2">
                {isEs ? 'Proveedores marcados' : 'Flagged vendors'}
              </div>
              <div className="flex flex-wrap gap-2">
                {codaVendors.map((v) => (
                  <EntityIdentityChip
                    key={v.vendor_id}
                    type="vendor"
                    id={v.vendor_id}
                    name={v.vendor_name}
                    size="sm"
                    riskScore={v.avg_risk_score}
                    sectorCode={v.primary_sector_name ?? null}
                    ariaTier={v.ips_tier}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dominant sector for this pattern */}
          {dominantSector && (
            <div className="mt-4">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-2">
                {isEs ? 'Sector dominante' : 'Dominant sector'}
              </div>
              <div className="flex flex-wrap gap-2">
                <EntityIdentityChip
                  type="sector"
                  id={dominantSector.id}
                  name={isEs ? dominantSector.name : dominantSector.nameEN}
                  size="sm"
                  sectorCode={dominantSector.code}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* §6 Los Siete Patrones — cross-pattern navigation strip migrated from
          the retired /patterns index. Universe totals + ranked sibling links. */}
      {allPatterns.length > 0 && (
        <section
          aria-label={isEs ? 'Los siete patrones' : 'The seven patterns'}
          className="pt-6 border-t border-border"
        >
          <SectionKicker label={isEs ? '§ 6 · LOS SIETE PATRONES' : '§ 6 · THE SEVEN PATTERNS'} />

          {/* Universe totals — one dense line */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 mt-1">
            {[
              { v: universe.vendors.toLocaleString(), l: isEs ? 'Proveedores marcados' : 'Vendors flagged', c: undefined },
              { v: universe.t1.toLocaleString(), l: isEs ? 'En Tier 1' : 'In Tier 1', c: 'var(--color-risk-critical)' },
              { v: universe.gt.toLocaleString(), l: isEs ? 'Casos GT' : 'GT cases', c: undefined },
              ...(universe.value > 0 ? [{ v: formatCompactMXN(universe.value), l: isEs ? 'Gasto en riesgo' : 'Spend at risk', c: '#a06820' }] : []),
            ].map(({ v, l, c }) => (
              <div key={l} className="flex flex-col gap-0.5">
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: '20px',
                    color: c ?? 'var(--color-text-primary)',
                  }}
                >
                  {v}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted">
                  {l}
                </span>
              </div>
            ))}
          </div>

          <CrossPatternComparison patterns={allPatterns} currentCode={codeUpper} isEs={isEs} />

          <p className="mt-4 text-[11px] text-text-muted leading-relaxed">
            {isEs
              ? 'Un proveedor puede coincidir con varios patrones a la vez. Esos cruces son donde suelen empezar las investigaciones.'
              : 'A vendor can match several patterns at once. Those intersections are where investigations usually begin.'}
          </p>
        </section>
      )}
    </div>
  )
}
