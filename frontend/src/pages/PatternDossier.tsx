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
import { getRiskLevelFromScore } from '@/lib/constants'

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
    nameEn: 'Kickback',
    nameEs: 'Soborno',
    ledeEn:
      'Kickback arrangements manifest in procurement data as systematic irregularities: identical contract amounts across unrelated procedures, heavy use of direct awards to a single vendor at the same institution, and a prevalence of round-number contracts that suggest negotiated prices rather than competitive bids. These patterns are particularly acute in infrastructure and health sectors, where contracts are large and inspection capacity is limited.',
    ledeEs:
      'Los arreglos de soborno se manifiestan en los datos de contratación como irregularidades sistemáticas: montos de contratos idénticos en procedimientos no relacionados, uso intensivo de adjudicaciones directas a un único proveedor en la misma institución, y prevalencia de contratos en números redondos que sugieren precios negociados en lugar de licitaciones competitivas. Estos patrones son especialmente agudos en sectores de infraestructura y salud, donde los contratos son grandes y la capacidad de inspección es limitada.',
    signalEn:
      'ARIA detects P4 by flagging vendor-institution pairs where ≥80% of contracts are direct awards, more than 30% share an identical amount within a ±5% tolerance band, and the vendor\'s win rate at that institution exceeds 95% over a 3-year period.',
    signalEs:
      'ARIA detecta P4 marcando pares proveedor-institución donde ≥80% de los contratos son adjudicaciones directas, más del 30% comparten un monto idéntico dentro de una banda de tolerancia ±5%, y la tasa de éxito del proveedor en esa institución supera el 95% en un período de 3 años.',
  },
  {
    code: 'P5',
    nameEn: 'Bid Rotation',
    nameEs: 'Rotación de Ofertas',
    ledeEn:
      'Bid rotation is a cartel-like behavior where a small group of nominally competing vendors take turns winning contracts at the same institution. Each vendor in the ring submits non-competitive bids in rounds they are "assigned" to lose, allowing the ring to maintain the appearance of competition while guaranteeing each member a predictable share of public contracts. The pattern is detected through network analysis of co-bidding relationships.',
    ledeEs:
      'La rotación de ofertas es un comportamiento tipo cártel donde un pequeño grupo de proveedores nominalmente competidores se turnan para ganar contratos en la misma institución. Cada proveedor del grupo presenta ofertas no competitivas en las rondas que le "corresponde" perder, lo que permite al grupo mantener la apariencia de competencia mientras garantiza a cada miembro una parte predecible de los contratos públicos. El patrón se detecta mediante análisis de red de relaciones de co-licitación.',
    signalEn:
      'ARIA identifies P5 by building co-bidding graphs for each institution and detecting cyclic win-rotation sequences. A vendor group triggers P5 when 3+ vendors show alternating wins across ≥6 procedures at the same institution within a 24-month window, with average win concentration per vendor between 20–40%.',
    signalEs:
      'ARIA identifica P5 construyendo grafos de co-licitación por institución y detectando secuencias cíclicas de rotación de victorias. Un grupo de proveedores activa P5 cuando 3 o más proveedores muestran victorias alternadas en ≥6 procedimientos en la misma institución dentro de una ventana de 24 meses, con una concentración promedio de victorias por proveedor entre 20% y 40%.',
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
    nameEn: 'Budget Dump',
    nameEs: 'Vaciado de Presupuesto',
    ledeEn:
      'Budget dumping refers to the abnormal concentration of contracts in the final weeks of the fiscal year, driven by use-it-or-lose-it budget rules. Agencies facing end-of-year surplus exhaust remaining funds through rapid-fire direct awards, bypassing normal procurement safeguards. These contracts are disproportionately large, poorly documented, and concentrated among vendors with pre-existing relationships to the contracting officer—making December a high-risk month for procurement integrity.',
    ledeEs:
      'El vaciado de presupuesto se refiere a la concentración anormal de contratos en las últimas semanas del año fiscal, impulsada por reglas de presupuesto de "úsalo o piérdelo". Las dependencias con superávit de fin de año agotan los fondos restantes mediante adjudicaciones directas en serie, eludiendo los controles normales de contratación. Estos contratos son desproporcionadamente grandes, escasamente documentados y están concentrados entre proveedores con relaciones previas con el funcionario contratante, lo que convierte a diciembre en un mes de alto riesgo para la integridad de las contrataciones.',
    signalEn:
      'ARIA computes monthly contract-count and value distributions per institution per year. P7 is triggered when December accounts for ≥35% of annual contract value or ≥40% of annual contract count, combined with a direct-award rate in that December cohort above 90%.',
    signalEs:
      'ARIA calcula distribuciones mensuales de conteo y valor de contratos por institución por año. P7 se activa cuando diciembre representa ≥35% del valor anual de contratos o ≥40% del conteo anual de contratos, combinado con una tasa de adjudicación directa en ese grupo de diciembre superior al 90%.',
  },
]

const META_BY_CODE = PATTERN_EDITORIAL.reduce<Record<string, PatternEditorial>>(
  (acc, m) => { acc[m.code] = m; return acc },
  {}
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a sector frequency map from vendor list */
function buildSectorHeat(vendors: Array<{ primary_sector_name: string | null }>): Array<{ name: string; count: number }> {
  const freq: Record<string, number> = {}
  for (const v of vendors) {
    if (v.primary_sector_name) {
      freq[v.primary_sector_name] = (freq[v.primary_sector_name] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
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
  const sectorHeat = buildSectorHeat(vendors)
  const maxSectorCount = sectorHeat[0]?.count ?? 1

  const isLoading = loadingSpotlight || loadingQueue

  // Unknown pattern
  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/patterns"
          className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          {isEs ? '← Patrones' : '← Patterns'}
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Back link */}
      <Link
        to="/patterns"
        className="inline-block text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
      >
        {isEs ? '← Patrones' : '← Patterns'}
      </Link>

      {/* §0 Cabecera */}
      <section aria-labelledby="pattern-heading">
        <SectionKicker label="§ 0 · CABECERA" />
        <div className="flex items-start gap-3">
          <span
            className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-2.5 py-1 text-sm font-bold font-mono tracking-wider"
            style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
            aria-label={`Pattern code ${code}`}
          >
            {code?.toUpperCase()}
          </span>
          <div>
            <h1
              id="pattern-heading"
              className="text-2xl font-bold text-text-primary leading-tight"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {name}
            </h1>
            {/* Stats */}
            {spotlight && (
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">
                    {isEs ? 'Proveedores' : 'Vendors'}
                  </span>
                  <span className="text-sm font-mono font-semibold tabular-nums text-text-primary">
                    {spotlight.vendor_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">T1</span>
                  <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: '#dc2626' }}>
                    {spotlight.t1_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">T2</span>
                  <span className="text-sm font-mono font-semibold tabular-nums text-text-secondary">
                    {spotlight.t2_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-muted">
                    {isEs ? 'Casos GT' : 'GT Cases'}
                  </span>
                  <span className="text-sm font-mono font-semibold tabular-nums text-text-primary">
                    {spotlight.gt_case_count.toLocaleString()}
                  </span>
                </div>
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

      {/* §2 Top Vendors T1 */}
      <section aria-label={isEs ? 'Proveedores T1' : 'T1 Vendors'}>
        <SectionKicker label={isEs ? '§ 2 · PROVEEDORES T1' : '§ 2 · T1 VENDORS'} />

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-sm bg-[color:var(--color-sidebar)] animate-pulse border border-border"
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
                      ariaTier={v.ips_tier}
                    />
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

      {/* §3 Sector Heat */}
      {!isLoading && sectorHeat.length > 0 && (
        <section aria-label={isEs ? 'Distribución sectorial' : 'Sector distribution'}>
          <SectionKicker label={isEs ? '§ 3 · CALOR SECTORIAL' : '§ 3 · SECTOR HEAT'} />
          <div className="space-y-2">
            {sectorHeat.map(({ name: sectorName, count }) => (
              <div key={sectorName} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-text-secondary w-32 flex-shrink-0 truncate">
                  {sectorName}
                </span>
                <DotBar
                  value={count}
                  max={maxSectorCount}
                  color="var(--color-risk-critical)"
                  dots={18}
                  ariaLabel={`${sectorName}: ${count} vendors`}
                />
                <span className="text-[10px] font-mono tabular-nums text-text-muted flex-shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* §4 Detection Signal */}
      <section aria-label={isEs ? 'Señal de detección' : 'Detection signal'}>
        <SectionKicker label={isEs ? '§ 4 · SEÑAL DE DETECCIÓN' : '§ 4 · DETECTION SIGNAL'} />
        <p className="text-sm text-text-secondary leading-relaxed">{signal}</p>
      </section>
    </div>
  )
}
