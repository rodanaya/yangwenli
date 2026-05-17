/**
 * /patterns — ARIA Investigation Patterns landing page
 *
 * Editorial folio: opens with a serif italic hero, summarizes the universe of
 * pattern-matched vendors as 3 headline numbers, then ranks the 7 ARIA
 * typologies (P1–P7) by Tier-1 severity with a dot-bar visual rank.
 *
 * Each card → /patterns/:code (dossier). Each card also exposes a direct
 * `/aria?pattern=Pn` link as an investigation pathway into the live queue.
 */
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { networkApi } from '@/api/client'
import type { PatternSpotlight } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RISK_COLORS, PATTERN_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber, cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Hardcoded editorial metadata per pattern
// ---------------------------------------------------------------------------
interface PatternMeta {
  code: string
  nameEn: string
  nameEs: string
  descEn: string
  descEs: string
  hookEn: string
  hookEs: string
}


const PATTERN_META: PatternMeta[] = [
  {
    code: 'P1',
    nameEn: 'Monopoly',
    nameEs: 'Monopolio',
    descEn: 'Single vendor captures ≥60% of a regulated market segment over 3+ years. Suggests market division agreements or deliberate exclusion of competitors from bidding.',
    descEs: 'Un proveedor captura ≥60% de un segmento de mercado regulado durante 3+ años. Sugiere acuerdos de división de mercado o exclusión deliberada de competidores.',
    hookEn: 'Cross-reference with direct-award procedure codes. If the same institution–vendor pair appears across 10+ years, run a co-bidding network analysis to find who else is in the ring.',
    hookEs: 'Crucen con códigos de adjudicación directa. Si el mismo par institución-proveedor aparece en 10+ años, ejecuten análisis de co-licitación para encontrar quién más está en el anillo.',
  },
  {
    code: 'P2',
    nameEn: 'Ghost Company',
    nameEs: 'Empresa Fantasma',
    descEn: 'Vendor wins contracts in one burst year with no prior or subsequent history. RFC registration date often postdates first contract. 39.6B MXN in spend traced to vendors matching this profile.',
    descEs: 'Proveedor gana contratos en un año de ráfaga sin historia previa ni posterior. La fecha de registro RFC frecuentemente es posterior al primer contrato. 39.6B MXN en gasto rastreado a proveedores con este perfil.',
    hookEn: 'Verify RFC registration date in SAT vs. first contract date. A company winning contracts before its RFC is formally registered is an automatic T1 lead.',
    hookEs: 'Verifiquen la fecha de registro RFC en el SAT vs. el primer contrato. Una empresa que gana contratos antes de registrar su RFC es un lead T1 automático.',
  },
  {
    code: 'P3',
    nameEn: 'Intermediary',
    nameEs: 'Intermediario',
    descEn: 'Vendor with zero declared employees or minimal commercial footprint routes contracts to unnamed subcontractors. The company exists on paper to collect the margin.',
    descEs: 'Proveedor sin empleados declarados o huella comercial mínima que enruta contratos a subcontratistas no identificados. La empresa existe en papel para cobrar el margen.',
    hookEn: 'Look for cascade contracts: company A wins a large procedure, then company B — registered weeks later at the same address — wins identical procedures the following year.',
    hookEs: 'Busquen contratos en cascada: empresa A gana un procedimiento grande, luego empresa B — registrada semanas después en la misma dirección — gana procedimientos idénticos el año siguiente.',
  },
  {
    code: 'P4',
    nameEn: 'Kickback',
    nameEs: 'Soborno',
    descEn: 'Direct-award concentration to a single institution, combined with identical contract amounts and round numbers. A signature of fixed-price kickback arrangements.',
    descEs: 'Concentración de adjudicaciones directas a una sola institución, combinada con montos idénticos y números redondos. Una firma de arreglos de soborno a precio fijo.',
    hookEn: 'Round-number contracts (exactly $500,000 / $1,000,000 MXN) issued quarterly to the same vendor are a strong kickback signal. Filter by `amount_residual_z = 0` in the risk model features.',
    hookEs: 'Contratos de montos redondos (exactamente $500,000 / $1,000,000 MXN) emitidos trimestralmente al mismo proveedor son una señal fuerte de soborno. Filtren por `amount_residual_z = 0` en las características del modelo.',
  },
  {
    code: 'P5',
    nameEn: 'Bid Rotation',
    nameEs: 'Rotación de Ofertas',
    descEn: 'A cluster of vendors alternates wins across competitive procedures at the same institution. Each vendor loses intentionally to ensure their turn comes around.',
    descEs: 'Un grupo de proveedores alterna victorias entre procedimientos competitivos en la misma institución. Cada proveedor pierde intencionalmente para que llegue su turno.',
    hookEn: 'Map the co-bidding graph: if three or more vendors always appear in the same procedures but take turns winning, you have a rotation ring. The Red Thread will surface the connections.',
    hookEs: 'Mapeen el grafo de co-licitación: si tres o más proveedores siempre aparecen en los mismos procedimientos pero se turnan para ganar, tienen un anillo de rotación. El Hilo Rojo mostrará las conexiones.',
  },
  {
    code: 'P6',
    nameEn: 'Institutional Capture',
    nameEs: 'Captura Institucional',
    descEn: 'One institution routes ≥70% of its procurement budget to ≤3 vendors across an entire presidential term. The largest pattern by vendor count — 15,923 flagged.',
    descEs: 'Una institución envía ≥70% de su presupuesto de compras a ≤3 proveedores durante un sexenio completo. El patrón más grande por cantidad de proveedores — 15,923 señalados.',
    hookEn: 'Run the Red Thread on the top vendor for each captured institution. Capture typically begins with a single direct award that becomes the de-facto preferred vendor for all subsequent competitive procedures.',
    hookEs: 'Ejecuten el Hilo Rojo en el proveedor principal de cada institución capturada. La captura típicamente comienza con una adjudicación directa que se convierte en el proveedor preferido de facto para todos los procedimientos competitivos posteriores.',
  },
  {
    code: 'P7',
    nameEn: 'Budget Dump',
    nameEs: 'Vaciado de Presupuesto',
    descEn: 'Disproportionate concentration of contracts in December to exhaust annual budget before fiscal year close. Short performance periods indicate no genuine delivery was expected.',
    descEs: 'Concentración desproporcionada de contratos en diciembre para agotar el presupuesto anual antes del cierre fiscal. Los cortos periodos de ejecución indican que no se esperaba entrega genuina.',
    hookEn: 'December contracts with 30-day performance periods issued to first-time vendors signal fiscal-year exhaustion, not genuine procurement need. Cross with P2 to find ghost companies created for year-end dumps.',
    hookEs: 'Contratos de diciembre con periodos de ejecución de 30 días emitidos a proveedores por primera vez señalan agotamiento del año fiscal, no necesidad genuina. Crucen con P2 para encontrar empresas fantasma creadas para vaciados de fin de año.',
  },
]

// ---------------------------------------------------------------------------
// Cross-pattern ranked comparison strip — editorial proportional bars
// Each row links into the ARIA queue filtered by pattern code.
// ---------------------------------------------------------------------------
function CrossPatternComparison({
  patterns,
  meta,
  isEs,
}: {
  patterns: PatternSpotlight[]
  meta: PatternMeta[]
  isEs: boolean
}) {
  const sorted = [...patterns].sort((a, b) => (b.vendor_count ?? 0) - (a.vendor_count ?? 0))
  const maxVendors = sorted[0]?.vendor_count ?? 1

  return (
    <div className="flex flex-col">
      {sorted.map((p, idx) => {
        const m = meta.find((x) => x.code === p.code)
        const color = PATTERN_COLORS[p.code] ?? '#64748b'
        const name = m ? (isEs ? m.nameEs : m.nameEn) : p.code
        const count = p.vendor_count ?? 0
        const pct = maxVendors > 0 ? (count / maxVendors) * 100 : 0
        return (
          <Link
            key={p.code}
            to={`/aria?pattern=${p.code}`}
            className={cn(
              'group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-2 -mx-2 rounded-sm',
              'hover:bg-background-elevated/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-colors',
              idx > 0 && 'border-t border-border/30'
            )}
            aria-label={`${p.code} ${name} — ${formatNumber(count)} ${isEs ? 'proveedores' : 'vendors'}`}
          >
            {/* Code badge + name */}
            <div className="flex items-center gap-2 min-w-0 w-[180px]">
              <span
                className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-wider"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {p.code}
              </span>
              <span className="text-[12px] font-mono text-text-secondary truncate group-hover:text-text-primary transition-colors">
                {name}
              </span>
            </div>

            {/* Proportional bar */}
            <div className="relative h-2 bg-background-elevated/60 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            </div>

            {/* Vendor count */}
            <div className="flex items-baseline gap-1.5 justify-end min-w-[100px]">
              <span
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  fontSize: '15px',
                  color,
                }}
              >
                {formatNumber(count)}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted">
                {isEs ? 'prov.' : 'vend.'}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pattern Card — editorial single-column investigation brief
// ---------------------------------------------------------------------------
function PatternCard({
  meta,
  spotlight,
  lang,
  onClick,
}: {
  meta: PatternMeta
  spotlight: PatternSpotlight | undefined
  lang: string
  onClick: () => void
}) {
  const isEs = lang === 'es'
  const name = isEs ? meta.nameEs : meta.nameEn
  const desc = isEs ? meta.descEs : meta.descEn
  const hook = isEs ? meta.hookEs : meta.hookEn
  const t1 = spotlight?.t1_count ?? 0
  const spend = spotlight?.total_value_mxn ?? 0

  // patternColor must be declared before heroColor (TDZ — const has no hoisting)
  const patternColor = PATTERN_COLORS[meta.code] ?? RISK_COLORS.critical

  // Value-heavy patterns lead with spend; investigation-heavy ones lead with T1 count
  const heroIsSpend = ['P2', 'P3', 'P6'].includes(meta.code)
  const heroValue = heroIsSpend && spend > 0
    ? formatCompactMXN(spend)
    : t1 > 0
      ? t1.toLocaleString()
      : (spotlight?.vendor_count ?? 0).toLocaleString()
  const heroLabel = heroIsSpend && spend > 0
    ? (isEs ? 'Gasto en riesgo' : 'Spend at risk')
    : t1 > 0
      ? 'T1 · Critical'
      : (isEs ? 'Proveedores' : 'Vendors')
  const heroColor = heroIsSpend ? '#a06820' : patternColor

  return (
    <div
      className={cn(
        'rounded-sm border border-border/60 bg-background-card overflow-hidden flex flex-col',
        meta.code === 'P6' && 'md:col-span-2'
      )}
      style={{ borderLeft: `3px solid ${patternColor}` }}
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left px-5 pt-4 pb-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
        aria-label={`${meta.code} ${name}`}
      >
        {/* Header: code badge + name + severity rank */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex-shrink-0 inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-[11px] font-bold font-mono tracking-wider"
              style={{ backgroundColor: `${patternColor}1a`, color: patternColor }}
            >
              {meta.code}
            </span>
            <h2
              className="text-[15px] font-semibold text-text-primary leading-snug truncate"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {name}
            </h2>
          </div>
          {spotlight && t1 > 0 && (
            <span className="text-[10px] font-mono tabular-nums text-text-muted flex-shrink-0">
              T1 · <span style={{ color: patternColor, fontWeight: 600 }}>{formatNumber(t1)}</span>
            </span>
          )}
        </div>

        {/* Hero anchor stat + secondary stats */}
        {spotlight && (
          <div className="flex items-end gap-6 mb-3 pb-3 border-b border-border/40">
            {/* Primary hero */}
            <div className="flex-shrink-0">
              <div
                className="tabular-nums leading-none"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  fontSize: '2rem',
                  color: heroColor,
                }}
              >
                {heroValue}
              </div>
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted mt-1">
                {heroLabel}
              </div>
            </div>

            {/* Secondary: the other big number */}
            {heroIsSpend && t1 > 0 && (
              <div className="flex-shrink-0">
                <div
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: '1.4rem',
                    color: RISK_COLORS.critical,
                  }}
                >
                  {t1.toLocaleString()}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted mt-1">
                  T1 · Critical
                </div>
              </div>
            )}
            {!heroIsSpend && spend > 0 && (
              <div className="flex-shrink-0">
                <div
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: '1.4rem',
                    color: '#a06820',
                  }}
                >
                  {formatCompactMXN(spend)}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted mt-1">
                  {isEs ? 'Gasto en riesgo' : 'Spend at risk'}
                </div>
              </div>
            )}

            {/* Tertiary: T2 count + vendors + GT cases */}
            <div className="flex gap-4 ml-auto">
              {spotlight.t2_count > 0 && (
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[13px] font-mono font-semibold tabular-nums text-text-primary">
                    {spotlight.t2_count.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted">
                    T2 · High
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[13px] font-mono font-semibold tabular-nums text-text-primary">
                  {spotlight.vendor_count.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted">
                  {isEs ? 'Proveedores' : 'Vendors'}
                </span>
              </div>
              {spotlight.gt_case_count > 0 && (
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[13px] font-mono font-semibold tabular-nums text-text-primary">
                    {spotlight.gt_case_count.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted">
                    {isEs ? 'Casos GT' : 'GT Cases'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>

        {/* § Fingerprint — procurement signal rates from the model features */}
        {spotlight && (spotlight.avg_da_rate != null || spotlight.avg_sb_rate != null) && (
          <div className="mt-3 pt-2.5 border-t border-border/30 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {spotlight.avg_da_rate != null && (
              <div className="flex flex-col gap-1.5">
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: '17px',
                    color: patternColor,
                  }}
                >
                  {(spotlight.avg_da_rate * 100).toFixed(0)}%
                </span>
                <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(spotlight.avg_da_rate * 100, 100)}%`,
                      backgroundColor: patternColor,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  {isEs ? 'Adj. directa prom.' : 'Avg. direct award'}
                </div>
              </div>
            )}
            {spotlight.avg_sb_rate != null && (
              <div className="flex flex-col gap-1.5">
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: '17px',
                    color: patternColor,
                  }}
                >
                  {(spotlight.avg_sb_rate * 100).toFixed(0)}%
                </span>
                <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(spotlight.avg_sb_rate * 100, 100)}%`,
                      backgroundColor: patternColor,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  {isEs ? 'Licitación única prom.' : 'Avg. single bid'}
                </div>
              </div>
            )}
            {spotlight.avg_ips > 0 && (
              <div className="flex flex-col gap-1.5">
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: '17px',
                    color: patternColor,
                  }}
                >
                  {Math.round(spotlight.avg_ips * 100)}
                </span>
                <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(spotlight.avg_ips * 100, 100)}%`,
                      backgroundColor: patternColor,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
                  {isEs ? 'IPS promedio' : 'Avg. IPS'} <span className="opacity-60">· /100</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Investigative hook — styled callout */}
        <div
          className="mt-3 rounded-sm px-3.5 py-3"
          style={{ backgroundColor: `${patternColor}0d`, borderLeft: `2px solid ${patternColor}60` }}
        >
          <div
            className="text-[10px] font-bold font-mono uppercase tracking-[0.14em] mb-1.5"
            style={{ color: patternColor }}
          >
            § {isEs ? 'Cómo investigar' : 'How to investigate'}
          </div>
          <p
            className="text-[13px] italic text-text-secondary leading-relaxed"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {hook}
          </p>
        </div>

        {/* No data fallback */}
        {!spotlight && (
          <div className="text-[11px] font-mono text-text-muted mt-2">
            {isEs ? 'Sin datos disponibles' : 'No data available'}
          </div>
        )}
      </button>

      {/* Top vendors + ARIA pathway — outside button to avoid nested interactive elements */}
      {spotlight && spotlight.top_vendors.length > 0 && (
        <div className="px-5 pb-4 border-t border-border/40">
          <div
            className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] mt-3 mb-2"
            style={{ color: patternColor }}
          >
            {isEs ? 'Principales sospechosos' : 'Top suspects'}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {spotlight.top_vendors.slice(0, 8).map((v) => (
              <div key={v.vendor_id}>
                <EntityIdentityChip
                  type="vendor"
                  id={v.vendor_id}
                  name={v.vendor_name}
                  size="xs"
                  riskScore={v.avg_risk_score}
                  sectorCode={v.primary_sector_name ?? null}
                  narrative
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <Link
              to={`/aria?pattern=${meta.code}`}
              className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-accent transition-colors"
            >
              <ArrowUpRight className="h-3 w-3" />
              {isEs ? 'Ver en cola ARIA' : 'View in ARIA queue'}
            </Link>
          </div>
        </div>
      )}

      {spotlight && spotlight.top_vendors.length === 0 && (
        <div className="px-5 pb-4 flex items-center justify-end">
          <Link
            to={`/aria?pattern=${meta.code}`}
            className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-accent transition-colors"
          >
            <ArrowUpRight className="h-3 w-3" />
            {isEs ? 'Ver en cola ARIA' : 'View in ARIA queue'}
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Headline number — Playfair-italic anchor stat used in the summary bar
// ---------------------------------------------------------------------------
function HeadlineStat({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 'clamp(28px, 4vw, 44px)',
          color: color ?? 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Patterns() {
  const { i18n } = useTranslation('nav')
  const navigate = useNavigate()
  const isEs = i18n.language.startsWith('es')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pattern-spotlight'],
    queryFn: () => networkApi.getPatternSpotlight(),
    staleTime: 5 * 60 * 1000,
  })

  const patterns = data?.patterns ?? []
  const spotlightByCode = patterns.reduce<Record<string, PatternSpotlight>>(
    (acc, p) => { acc[p.code] = p; return acc },
    {}
  )

  // Aggregate totals across all 7 patterns
  const totalVendors = patterns.reduce((sum, p) => sum + (p.vendor_count ?? 0), 0)
  const totalT1 = patterns.reduce((sum, p) => sum + (p.t1_count ?? 0), 0)
  const totalGtCases = patterns.reduce((sum, p) => sum + (p.gt_case_count ?? 0), 0)
  const totalValue = patterns.reduce((sum, p) => sum + (p.total_value_mxn ?? 0), 0)

  return (
    <div id="main-content" className="max-w-5xl mx-auto px-4 py-8">
      {/* Editorial folio header */}
      <header className="mb-8">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
          § {isEs ? 'PATRONES · ARIA' : 'PATTERNS · ARIA'}
        </div>
        <h1
          className="text-4xl md:text-5xl font-semibold italic text-text-primary leading-[1.05] tracking-tight"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {isEs
            ? 'Siete formas en que desaparece el dinero público.'
            : 'Seven ways public money disappears.'}
        </h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed max-w-2xl">
          {isEs
            ? 'Tipologías de irregularidad detectadas por el motor ARIA en 3.1 millones de contratos federales. Cada patrón es una pregunta de investigación, no una sentencia.'
            : 'Irregularity typologies detected by the ARIA engine across 3.1 million federal contracts. Each pattern is an investigative question, not a verdict.'}
        </p>
      </header>

      {/* Summary stat bar — universe of pattern-matched vendors */}
      {!isLoading && !isError && patterns.length > 0 && (
        <section
          className="mb-8 pb-6 border-b border-border"
          aria-label={isEs ? 'Resumen de patrones' : 'Pattern summary'}
        >
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-4">
            {isEs ? 'El universo' : 'The universe'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <HeadlineStat
              value={totalVendors.toLocaleString()}
              label={isEs ? 'Proveedores marcados' : 'Vendors flagged'}
            />
            <HeadlineStat
              value={totalT1.toLocaleString()}
              label={isEs ? 'En Tier 1' : 'In Tier 1'}
              color={RISK_COLORS.critical}
            />
            <HeadlineStat
              value={totalGtCases.toLocaleString()}
              label={isEs ? 'Casos GT vinculados' : 'GT cases linked'}
            />
            {totalValue > 0 && (
              <HeadlineStat
                value={formatCompactMXN(totalValue)}
                label={isEs ? 'Gasto en riesgo' : 'Spend at risk'}
                color="#a06820"
              />
            )}
          </div>
          <p className="mt-4 text-[11px] text-text-muted leading-relaxed">
            {isEs
              ? 'Conteos brutos sobre los 7 patrones. Un proveedor puede aparecer en varios.'
              : 'Raw counts across all 7 patterns. A vendor can appear in more than one.'}
          </p>

          {/* Cross-pattern ranked comparison */}
          <div className="mt-5 pt-4 border-t border-border/40">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
              {isEs ? 'Alcance por patrón' : 'Scope by pattern'}
            </div>
            <CrossPatternComparison patterns={patterns} meta={PATTERN_META} isEs={isEs} />
          </div>
        </section>
      )}

      {/* Loading / error states */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-sm bg-sidebar animate-pulse border border-border"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-border rounded-sm p-4 text-sm text-text-muted font-mono">
          {isEs ? 'Error cargando patrones.' : 'Error loading patterns.'}
        </div>
      )}

      {/* Pattern list — 2-column grid; P6 (Institutional Capture, the largest) spans full width */}
      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PATTERN_META.map((meta) => (
              <PatternCard
                key={meta.code}
                meta={meta}
                spotlight={spotlightByCode[meta.code]}
                lang={i18n.language}
                onClick={() => navigate(`/patterns/${meta.code}`)}
              />
            ))}
          </div>

          {/* Cross-pattern editorial footnote */}
          <footer className="mt-8 pt-5 border-t border-border">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted mb-2">
              {isEs ? 'Nota metodológica' : 'Methodological note'}
            </p>
            <p
              className="text-sm italic leading-relaxed text-text-secondary"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {isEs
                ? 'Un proveedor puede coincidir con varios patrones a la vez. Muchos T1 cumplen 2 o más simultáneamente — esos cruces son donde las investigaciones suelen empezar.'
                : 'A vendor can match multiple patterns simultaneously. Many T1 vendors satisfy two or more at once — those intersections are where investigations usually begin.'}
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
