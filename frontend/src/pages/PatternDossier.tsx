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
import { getRiskLevelFromScore, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

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

  const codeUpper = code?.toUpperCase() ?? ''
  const caseType = CASE_TYPE_BY_PATTERN[codeUpper]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <Link
        to="/patterns"
        className="inline-block text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
      >
        {isEs ? '← Todos los patrones' : '← All patterns'}
      </Link>

      {/* §0 Cabecera */}
      <section aria-labelledby="pattern-heading">
        <SectionKicker label={isEs ? '§ 0 · CABECERA' : '§ 0 · HEADER'} />
        <div className="flex items-start gap-3">
          <span
            className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-2.5 py-1 text-sm font-bold font-mono tracking-wider"
            style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
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
                backgroundColor: 'rgba(220,38,38,0.12)',
                color: '#dc2626',
                border: '1px solid rgba(220,38,38,0.25)',
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
                  { label: 'T1', value: spotlight.t1_count.toLocaleString(), color: '#dc2626' },
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
                    <div className="text-sm font-mono font-bold tabular-nums mt-0.5" style={{ color: '#ef4444' }}>{formatCompactMXN(spotlight.total_value_mxn)}</div>
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
                  style={{ color: '#dc2626' }}
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
                  style={{ color: '#dc2626' }}
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
            style={{ color: '#dc2626' }}
          >
            <span aria-hidden="true">→</span>
            {isEs ? 'Ver casos de corrupción' : 'View corruption cases'}
          </Link>
        </section>
      )}
    </div>
  )
}
